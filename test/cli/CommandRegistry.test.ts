import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../../src/application/EditorSession.js";
import { CreateCommand } from "../../src/application/commands/CreateCommand.js";
import { DeleteCommand } from "../../src/application/commands/DeleteCommand.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import { Tokenizer } from "../../src/cli/Tokenizer.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

function populatedSession() {
  const session = new EditorSession();
  session.init(400, 300);
  const first = new RectShape("first", 10, 20, 30, 40);
  const second = new RectShape("second", 0, 0, 10, 10);
  session.execute(new CreateCommand(first));
  session.execute(new CreateCommand(second));
  session.undo();
  return { session, registry: new CommandRegistry(session), first, second };
}

test("registry ignores empty input and rejects unknown or differently cased command names", () => {
  const session = new EditorSession();
  const registry = new CommandRegistry(session);
  assert.equal(registry.execute([]), undefined);
  for (const name of ["unknown", "INIT", "toString", "__proto__", ""]) {
    assert.throws(() => registry.execute([name]), {
      name: "RangeError", message: `unknown command: ${name}`,
    });
  }
  assert.throws(() => session.requireDocument(), {
    message: "no document. use 'init' or 'read' first",
  });
});

test("registry initializes canvases with zero, one or two dimensions without mutating input tokens", () => {
  const session = new EditorSession();
  const registry = new CommandRegistry(session);
  const cases = [
    { tokens: ["init"], width: 800, height: 600 },
    { tokens: ["init", "400"], width: 400, height: 600 },
    { tokens: ["init", "320.5", "2.4e2"], width: 320.5, height: 240 },
  ];
  for (const { tokens, width, height } of cases) {
    const input = Object.freeze([...tokens]);
    assert.deepEqual(registry.execute(input), {
      kind: "message", text: `canvas ${width}x${height} created`,
    });
    assert.deepEqual(input, tokens);
    assert.equal(session.requireDocument().width, width);
    assert.equal(session.requireDocument().height, height);
    for (const name of ["undo", "redo"]) {
      assert.throws(() => registry.execute([name]), {
        message: "undo not allowed after io command",
      });
    }
  }
});

test("registry forwards missing-document errors while allowing exit before initialization", () => {
  const registry = new CommandRegistry(new EditorSession());
  for (const tokens of [["canvas"], ["canvas", "400", "300"], ["undo"], ["redo"]]) {
    assert.throws(() => registry.execute(tokens), {
      name: "RangeError", message: "no document. use 'init' or 'read' first",
    });
  }
  assert.deepEqual(registry.execute(["exit"]), { kind: "exit" });
  assert.deepEqual(registry.execute(["quit"]), { kind: "exit" });
});

test("registry rejects invalid arity before changing documents or consuming history", () => {
  const { session, registry, first, second } = populatedSession();
  const document = session.requireDocument();
  const cases = [
    { tokens: ["init", "800", "600", "extra"], usage: "init [width] [height]" },
    { tokens: ["canvas", "800"], usage: "canvas [<width> <height>]" },
    { tokens: ["canvas", "800", "600", "extra"], usage: "canvas [<width> <height>]" },
    { tokens: ["undo", "extra"], usage: "undo" },
    { tokens: ["redo", "extra"], usage: "redo" },
    { tokens: ["exit", "extra"], usage: "exit | quit" },
    { tokens: ["quit", "extra"], usage: "exit | quit" },
  ];
  for (const { tokens, usage } of cases) {
    assert.throws(() => registry.execute(tokens), {
      name: "RangeError", message: `usage: ${usage}`,
    });
    assert.strictEqual(session.requireDocument(), document);
    assert.equal(document.width, 400);
    assert.equal(document.height, 300);
    assert.deepEqual(document.topLevel(), [first]);
    registry.execute(["redo"]);
    assert.deepEqual(document.topLevel(), [first, second]);
    registry.execute(["undo"]);
  }
  registry.execute(["undo"]);
  assert.deepEqual(document.topLevel(), []);
});

test("invalid numeric arguments and invalid dimensions preserve the canvas and both history stacks", () => {
  const { session, registry, first, second } = populatedSession();
  const document = session.requireDocument();
  for (const command of ["init", "canvas"]) {
    for (const invalid of ["", " ", "400px", "NaN", "Infinity", "1e309", "0", "-1"]) {
      for (const args of [[invalid, "900"], ["1200", invalid]]) {
        assert.throws(() => registry.execute([command, ...args]), RangeError);
        assert.strictEqual(session.requireDocument(), document);
        assert.equal(document.width, 400);
        assert.equal(document.height, 300);
        assert.deepEqual(document.topLevel(), [first]);
        registry.execute(["redo"]);
        assert.deepEqual(document.topLevel(), [first, second]);
        registry.execute(["undo"]);
        registry.execute(["undo"]);
        assert.deepEqual(document.topLevel(), []);
        registry.execute(["redo"]);
      }
    }
  }
});

test("canvas query preserves history while resizing clears both stacks without replacing the tree", () => {
  const { session, registry, first, second } = populatedSession();
  const document = session.requireDocument();
  assert.deepEqual(registry.execute(["canvas"]), {
    kind: "message", text: "canvas 400x300",
  });
  registry.execute(["redo"]);
  assert.deepEqual(document.topLevel(), [first, second]);
  registry.execute(["undo"]);
  assert.deepEqual(registry.execute(["canvas", "640.5", "480.25"]), {
    kind: "message", text: "canvas 640.5x480.25",
  });
  assert.strictEqual(session.requireDocument(), document);
  assert.deepEqual(document.topLevel(), [first]);
  assert.equal(document.width, 640.5);
  assert.equal(document.height, 480.25);
  for (const name of ["undo", "redo"]) {
    assert.throws(() => registry.execute([name]), {
      message: "undo not allowed after io command",
    });
  }
  session.execute(new DeleteCommand("first"));
  assert.deepEqual(registry.execute(["undo"]), { kind: "message", text: "undo complete" });
  assert.strictEqual(document.require("first"), first);
  assert.throws(() => registry.execute(["undo"]), { message: "nothing to undo" });
  assert.deepEqual(registry.execute(["redo"]), { kind: "message", text: "redo complete" });
  assert.deepEqual(document.topLevel(), []);
  assert.throws(() => registry.execute(["redo"]), { message: "nothing to redo" });
});

test("registry init replaces the current document and binds later history to the replacement", () => {
  const { session, registry, first } = populatedSession();
  const oldDocument = session.requireDocument();
  registry.execute(["init", "200", "100"]);
  const document = session.requireDocument();
  assert.notStrictEqual(document, oldDocument);
  const replacement = new RectShape("first", 0, 0, 10, 10);
  session.execute(new CreateCommand(replacement));
  registry.execute(["undo"]);
  assert.deepEqual(document.topLevel(), []);
  assert.throws(() => registry.execute(["undo"]), { message: "nothing to undo" });
  registry.execute(["redo"]);
  assert.strictEqual(document.require("first"), replacement);
  assert.deepEqual(oldDocument.topLevel(), [first]);
});

test("tokenizer and registry preserve empty numeric arguments and reject incomplete quoted commands", () => {
  const session = new EditorSession();
  const registry = new CommandRegistry(session);
  const tokenizer = new Tokenizer();
  const execute = (line: string) => registry.execute(tokenizer.tokenize(line));
  assert.deepEqual(execute('init "400" "300"'), {
    kind: "message", text: "canvas 400x300 created",
  });
  const document = session.requireDocument();
  assert.throws(() => execute('init ""'), { message: "width must be a finite number" });
  assert.throws(() => execute('init "800'), { message: "unterminated quoted argument" });
  assert.equal(execute(' # comment with "'), undefined);
  assert.strictEqual(session.requireDocument(), document);
  assert.deepEqual(execute("canvas"), { kind: "message", text: "canvas 400x300" });
});
