import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../../src/application/EditorSession.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import { Tokenizer } from "../../src/cli/Tokenizer.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

function populatedSession() {
  const session = new EditorSession();
  session.init(400, 300);
  session.createShape("rect", "first", ["10", "20", "30", "40"]);
  session.createShape("rect", "second", ["0", "0", "10", "10"]);
  const first = session.requireDocument().require("first");
  const second = session.requireDocument().require("second");
  session.undo();
  return { session, registry: new CommandRegistry(session), first, second };
}

function structureSession(nested: boolean) {
  const session = new EditorSession();
  session.init();
  if (nested) session.createShape("g", "scene", []);
  const parent = nested ? "scene" : undefined;
  session.createShape("rect", "first", ["0", "0", "10", "10"], parent);
  session.createShape("g", "target", [], parent);
  session.createShape("rect", "leaf", ["10", "20", "30", "40", "red"], "target");
  session.createShape("rect", "last", ["0", "0", "10", "10"], parent);
  session.createShape("g", "destination", []);
  const document = session.requireDocument();
  return {
    session,
    registry: new CommandRegistry(session),
    document,
    source: nested ? document.requireContainer("scene") : null,
    target: document.requireContainer("target"),
    leaf: document.require("leaf"),
    first: document.require("first"),
    last: document.require("last"),
    destination: document.requireContainer("destination"),
  };
}

test("move dispatch validates parameters and rejected edits preserve redo", () => {
  const { session, registry, first } = populatedSession();
  const before = first.attributes();
  const cases = [
    { tokens: ["move"], message: "usage: move <id> <dx> <dy>" },
    { tokens: ["move", "first", "1", "2", "3"], message: "usage: move <id> <dx> <dy>" },
    { tokens: ["move", "first", "", "0"], message: "dx must be a finite number" },
    { tokens: ["move", "first", "1", "Infinity"], message: "dy must be a finite number" },
    { tokens: ["move", "missing", "1", "2"], message: "no such shape: missing" },
  ];
  for (const { tokens, message } of cases) {
    assert.throws(() => registry.execute(tokens), { message });
    assert.deepEqual(first.attributes(), before);
  }
  registry.execute(["redo"]);
  assert.ok(session.requireDocument().find("second"));
  assert.deepEqual(registry.execute(["move", "first", "1e1", "-0.5"]), {
    kind: "message", text: "shape first moved by (10,-0.5)",
  });
  assert.equal(first.attributes().x, 20);
  assert.equal(first.attributes().y, 19.5);
  registry.execute(["undo"]);
  assert.deepEqual(first.attributes(), before);
});

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
  for (const tokens of [
    ["canvas"], ["canvas", "400", "300"], ["undo"], ["redo"],
    ["addto", "group", "shape"], ["front", "shape"], ["back", "shape"],
    ["tree"], ["tree", "shape"], ["show", "shape"],
  ]) {
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
    { tokens: ["tree", "first", "extra"], usage: "tree [id]" },
    { tokens: ["show"], usage: "show <id>" },
    { tokens: ["show", "first", "extra"], usage: "show <id>" },
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
  session.deleteShape("first");
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
  session.createShape("rect", "first", ["0", "0", "10", "10"]);
  const replacement = document.require("first");
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

test("registry creates root and nested shapes, preserves quoted fill, and treats an ID named in as data", () => {
  const session = new EditorSession();
  const registry = new CommandRegistry(session);
  const tokenizer = new Tokenizer();
  const execute = (line: string) => registry.execute(Object.freeze(tokenizer.tokenize(line)));
  execute("init");
  assert.deepEqual(execute("create g in"), { kind: "message", text: "g#in created" });
  assert.deepEqual(execute("create g child in in"), {
    kind: "message", text: "g#child created in g#in",
  });
  assert.deepEqual(execute('create rect r1 -10.5 2e1 100.25 50 "rgb(10 20 30)" in child'), {
    kind: "message", text: "rect#r1 created in g#child",
  });
  assert.deepEqual(execute("create rect plain 0 0 10 10"), {
    kind: "message", text: "rect#plain created",
  });
  assert.deepEqual(execute("create rect R1 0 0 10 10 #fff in child"), {
    kind: "message", text: "rect#R1 created in g#child",
  });
  execute("create rect nofill 1 2 3 4 in child");
  const document = session.requireDocument();
  const root = document.requireContainer("in");
  const child = document.requireContainer("child");
  const rect = document.require("r1");
  const plain = document.require("plain");
  const upper = document.require("R1");
  const nofill = document.require("nofill");
  assert.ok(rect instanceof RectShape);
  assert.ok(plain instanceof RectShape);
  assert.ok(upper instanceof RectShape);
  assert.ok(nofill instanceof RectShape);
  assert.deepEqual(document.topLevel(), [root, plain]);
  assert.deepEqual(root.children(), [child]);
  assert.deepEqual(child.children(), [rect, upper, nofill]);
  assert.deepEqual(rect.position, { x: -10.5, y: 20 });
  assert.equal(rect.width, 100.25);
  assert.equal(rect.height, 50);
  assert.equal(rect.fill, "rgb(10 20 30)");
  assert.equal(upper.fill, "#fff");
  assert.equal(plain.fill, undefined);
  assert.equal(nofill.fill, undefined);

  assert.deepEqual(execute("delete in"), { kind: "message", text: "shape in deleted" });
  assert.deepEqual(document.topLevel(), [plain]);
  assert.equal(document.find("r1"), undefined);
  execute("undo");
  assert.deepEqual(document.topLevel(), [root, plain]);
  assert.strictEqual(document.require("r1"), rect);
  assert.equal(rect.fill, "rgb(10 20 30)");
  execute("redo");
  assert.deepEqual(document.topLevel(), [plain]);
});

test("registry rejects malformed edits and invalid targets without changing the tree or either history stack", () => {
  const { session, registry, first, second } = populatedSession();
  const document = session.requireDocument();
  const tokenizer = new Tokenizer();
  const cases = [
    ["create", "usage: create <type> <id> [params...] [in <containerId>]"],
    ["create rect", "usage: create <type> <id> [params...] [in <containerId>]"],
    ['create g ""', "shape id must be non-empty and contain no whitespace"],
    ['create g "two words"', "shape id must be non-empty and contain no whitespace"],
    ["create box box1", "unknown shape type: box (is the plugin loaded?)"],
    ["create rect bad 0 0 10", "usage: create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]"],
    ['create rect bad "" 0 10 10', "x must be a finite number"],
    ["create rect bad 0 0 0 10", "rectangle width must be a positive finite number"],
    ['create rect bad 0 0 10 10 ""', "fill must not be empty"],
    ["create g bad in", "usage: create <type> <id> [params...] [in <containerId>]"],
    ['create g bad in ""', "usage: create <type> <id> [params...] [in <containerId>]"],
    ['create g bad in "two words"', "usage: create <type> <id> [params...] [in <containerId>]"],
    ["create g bad in missing", "no such container: missing"],
    ["create g bad in first", "not a container: first"],
    ["create g first", "id already exists: first"],
    ["delete", "usage: delete <id>"],
    ["delete first extra", "usage: delete <id>"],
    ["delete missing", "no such shape: missing"],
  ] as const;
  for (const [line, message] of cases) {
    const tokens = Object.freeze(tokenizer.tokenize(line));
    const original = [...tokens];
    assert.throws(() => registry.execute(tokens), { name: "RangeError", message }, line);
    assert.deepEqual(tokens, original);
    assert.strictEqual(session.requireDocument(), document);
    assert.deepEqual(document.topLevel(), [first]);
    registry.execute(["redo"]);
    assert.strictEqual(document.require("second"), second);
    registry.execute(["undo"]);
    registry.execute(["undo"]);
    assert.deepEqual(document.topLevel(), []);
    registry.execute(["redo"]);
    assert.deepEqual(document.topLevel(), [first]);
  }
});

test("successful registry creation or deletion clears an abandoned redo branch as one history step", () => {
  for (const tokens of [["create", "g", "next"], ["delete", "first"]]) {
    const { session, registry, first } = populatedSession();
    const document = session.requireDocument();
    registry.execute(tokens);
    const after = [...document.topLevel()];
    assert.equal(document.find("second"), undefined);
    assert.throws(() => registry.execute(["redo"]), { message: "nothing to redo" });
    registry.execute(["undo"]);
    assert.deepEqual(document.topLevel(), [first]);
    registry.execute(["undo"]);
    assert.deepEqual(document.topLevel(), []);
    registry.execute(["redo"]);
    assert.strictEqual(document.require("first"), first);
    registry.execute(["redo"]);
    assert.deepEqual(document.topLevel(), after);
    assert.equal(document.find("second"), undefined);
  }
});

test("front and back reorder only the target's siblings and undo restores its exact position", () => {
  for (const nested of [false, true]) {
    for (const name of ["front", "back"]) {
      const { registry, document, source, target, leaf, first, last, destination } = structureSession(nested);
      const siblings = () => source === null ? document.topLevel() : source.children();
      const original = [...siblings()];
      const otherSiblings = source === null ? [first, last, destination] : [first, last];
      const expected = name === "front" ? [...otherSiblings, target] : [target, ...otherSiblings];
      const tokens = Object.freeze([name, "target"]);
      assert.deepEqual(registry.execute(tokens), {
        kind: "message",
        text: name === "front" ? "shape target brought to front" : "shape target sent to back",
      });
      for (let cycle = 0; cycle < 2; cycle++) {
        assert.deepEqual(siblings(), expected);
        assert.strictEqual(document.require("target"), target);
        assert.strictEqual(document.require("leaf"), leaf);
        assert.deepEqual(target.children(), [leaf]);
        assert.ok(leaf instanceof RectShape);
        assert.deepEqual(leaf.position, { x: 10, y: 20 });
        assert.equal(leaf.width, 30);
        assert.equal(leaf.height, 40);
        assert.equal(leaf.fill, "red");
        if (source !== null) assert.deepEqual(document.topLevel(), [source, destination]);
        registry.execute(["undo"]);
        assert.deepEqual(siblings(), original);
        registry.execute(["redo"]);
      }
      assert.deepEqual(tokens, [name, "target"]);
    }
  }
});

test("addto routes container ID first and preserves whole subtrees across migration and repeated undo", () => {
  for (const nested of [false, true]) {
    const { registry, document, source, target, leaf, first, last, destination } = structureSession(nested);
    const rootsBefore = document.topLevel();
    const siblingsBefore = source?.children();
    registry.execute(["create", "rect", "resident", "0", "0", "10", "10", "in", "destination"]);
    const resident = document.require("resident");
    const tokens = Object.freeze(["addto", "destination", "target"]);
    assert.deepEqual(registry.execute(tokens), {
      kind: "message", text: "shape target moved into g#destination",
    });
    for (let cycle = 0; cycle < 2; cycle++) {
      assert.deepEqual(destination.children(), [resident, target]);
      assert.deepEqual(source === null ? document.topLevel() : source.children(),
        source === null ? [first, last, destination] : [first, last]);
      assert.strictEqual(document.require("target"), target);
      assert.strictEqual(document.require("leaf"), leaf);
      assert.deepEqual(target.children(), [leaf]);
      registry.execute(["undo"]);
      assert.deepEqual(document.topLevel(), rootsBefore);
      assert.deepEqual(source?.children(), siblingsBefore);
      assert.deepEqual(destination.children(), [resident]);
      registry.execute(["redo"]);
    }
    assert.deepEqual(tokens, ["addto", "destination", "target"]);
    registry.execute(["addto", "destination", "resident"]);
    assert.deepEqual(destination.children(), [target, resident]);
    registry.execute(["undo"]);
    assert.deepEqual(destination.children(), [resident, target]);
  }
});

test("invalid structure command arguments and targets preserve tree identity and both history stacks", () => {
  const { session, registry, document, source, target, leaf, destination } = structureSession(true);
  assert.ok(source);
  session.createShape("g", "pending", []);
  const pending = document.require("pending");
  session.undo();
  const rootsBefore = document.topLevel();
  const siblingsBefore = source.children();
  const cases = [
    { tokens: ["addto"], message: "usage: addto <containerId> <id>" },
    { tokens: ["addto", "destination"], message: "usage: addto <containerId> <id>" },
    { tokens: ["addto", "destination", "target", "extra"], message: "usage: addto <containerId> <id>" },
    { tokens: ["addto", "missing", "target"], message: "no such container: missing" },
    { tokens: ["addto", "first", "target"], message: "not a container: first" },
    { tokens: ["addto", "destination", "missing"], message: "no such shape: missing" },
    { tokens: ["addto", "scene", "scene"], message: "cannot move a shape into itself or its descendant" },
    { tokens: ["addto", "target", "scene"], message: "cannot move a shape into itself or its descendant" },
    ...["front", "back"].flatMap((name) => [
      { tokens: [name], message: `usage: ${name} <id>` },
      { tokens: [name, "target", "extra"], message: `usage: ${name} <id>` },
      { tokens: [name, "missing"], message: "no such shape: missing" },
      { tokens: [name, "Target"], message: "no such shape: Target" },
    ]),
  ];
  for (const { tokens, message } of cases) {
    assert.throws(() => registry.execute(Object.freeze(tokens)), { name: "RangeError", message });
    assert.deepEqual(document.topLevel(), rootsBefore);
    assert.deepEqual(source.children(), siblingsBefore);
    assert.deepEqual(target.children(), [leaf]);
    assert.deepEqual(destination.children(), []);
    registry.execute(["redo"]);
    assert.strictEqual(document.require("pending"), pending);
    registry.execute(["undo"]);
    registry.execute(["undo"]);
    assert.equal(document.find("destination"), undefined);
    registry.execute(["redo"]);
    assert.strictEqual(document.require("destination"), destination);
    assert.deepEqual(document.topLevel(), rootsBefore);
  }
});

test("successful structure commands clear redo and consume exactly one history entry even at a boundary", () => {
  for (const tokens of [
    ["addto", "destination", "target"], ["front", "first"], ["back", "last"],
    ["front", "last"], ["back", "first"],
  ]) {
    const { session, registry, document, source, destination } = structureSession(true);
    assert.ok(source);
    const original = source.children();
    session.createShape("g", "abandoned", []);
    session.undo();
    registry.execute(tokens);
    const after = source.children();
    const destinationAfter = destination.children();
    assert.throws(() => registry.execute(["redo"]), { message: "nothing to redo" });
    registry.execute(["undo"]);
    assert.deepEqual(source.children(), original);
    assert.deepEqual(destination.children(), []);
    registry.execute(["undo"]);
    assert.equal(document.find("destination"), undefined);
    registry.execute(["redo"]);
    registry.execute(["redo"]);
    assert.deepEqual(source.children(), after);
    assert.deepEqual(destination.children(), destinationAfter);
    assert.equal(document.find("abandoned"), undefined);
  }
});

test("successful and failed display queries preserve both history stacks and original objects", () => {
  const { session, registry, first, second } = populatedSession();
  const document = session.requireDocument();
  const queries = [
    () => assert.deepEqual(registry.execute(Object.freeze(["tree"])), {
      kind: "message", text: "svg (400x300)\n└── rect#first  x=10 y=20 w=30 h=40",
    }),
    () => assert.deepEqual(registry.execute(["tree", "first"]), {
      kind: "message", text: "rect#first  x=10 y=20 w=30 h=40",
    }),
    () => assert.deepEqual(registry.execute(["show", "first"]), {
      kind: "message", text: "rect#first  parent=svg\n  x=10\n  y=20\n  width=30\n  height=40",
    }),
    ...["tree", "show"].flatMap((name) => ["missing", "", "First"].map((id) =>
      () => assert.throws(() => registry.execute([name, id]), {
        name: "RangeError", message: `no such shape: ${id}`,
      }),
    )),
  ];
  for (const query of queries) {
    query();
    assert.strictEqual(session.requireDocument(), document);
    assert.deepEqual(document.topLevel(), [first]);
    registry.execute(["redo"]);
    assert.strictEqual(document.require("second"), second);
    registry.execute(["undo"]);
    registry.execute(["undo"]);
    assert.deepEqual(document.topLevel(), []);
    registry.execute(["redo"]);
    assert.strictEqual(document.require("first"), first);
  }
});

test("display queries preserve the IO history lock for empty and populated canvases", () => {
  const session = new EditorSession();
  const registry = new CommandRegistry(session);
  registry.execute(["init"]);
  assert.deepEqual(registry.execute(["tree"]), { kind: "message", text: "svg (800x600)" });
  assert.throws(() => registry.execute(["show", "missing"]), { message: "no such shape: missing" });
  for (const name of ["undo", "redo"]) {
    assert.throws(() => registry.execute([name]), { message: "undo not allowed after io command" });
  }
  registry.execute(["create", "g", "scene"]);
  registry.execute(["canvas", "400", "300"]);
  for (const tokens of [["tree"], ["tree", "scene"], ["show", "scene"]]) {
    assert.equal(registry.execute(tokens)?.kind, "message");
    for (const name of ["undo", "redo"]) {
      assert.throws(() => registry.execute([name]), { message: "undo not allowed after io command" });
    }
  }
});
