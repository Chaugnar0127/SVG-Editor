import assert from "node:assert/strict";
import test from "node:test";
import { CommandBus } from "../../src/application/CommandBus.js";
import { DeleteCommand } from "../../src/application/commands/DeleteCommand.js";
import { SvgDocument } from "../../src/domain/document/SvgDocument.js";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

function createScene() {
  const document = new SvgDocument();
  const a = new RectShape("a", 10, 20, 30, 40);
  const b = new RectShape("b", 0, 0, 10, 10);
  const c = new RectShape("c", 0, 0, 10, 10);
  for (const shape of [a, b, c]) {
    document.add(shape);
  }
  return { document, bus: new CommandBus(document), a, b, c };
}

test("empty history reports separate undo and redo errors without changing the document", () => {
  const { document, bus, a, b, c } = createScene();
  assert.throws(() => bus.undo(), { name: "RangeError", message: "nothing to undo" });
  assert.throws(() => bus.redo(), { name: "RangeError", message: "nothing to redo" });
  assert.deepEqual(document.topLevel(), [a, b, c]);

  bus.execute(new DeleteCommand("b"));
  bus.undo();
  assert.deepEqual(document.topLevel(), [a, b, c]);
});

test("multiple edits undo in reverse order and redo in original order without losing the redo tail", () => {
  const { document, bus, a, b, c } = createScene();
  for (const id of ["a", "b", "c"]) {
    bus.execute(new DeleteCommand(id));
  }
  assert.deepEqual(document.topLevel(), []);

  for (const expected of [[c], [b, c], [a, b, c]]) {
    bus.undo();
    assert.deepEqual(document.topLevel(), expected);
  }
  assert.throws(() => bus.undo(), { message: "nothing to undo" });
  for (const shape of [a, b, c]) {
    assert.strictEqual(document.require(shape.id), shape);
  }
  for (const expected of [[b, c], [c], []]) {
    bus.redo();
    assert.deepEqual(document.topLevel(), expected);
  }
  assert.throws(() => bus.redo(), { message: "nothing to redo" });
  bus.undo();
  assert.strictEqual(document.require("c"), c);
});

test("deleting a child and then its parent remains two undo units with valid restoration order", () => {
  const document = new SvgDocument();
  const parent = new GroupShape("parent");
  const target = new GroupShape("target");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  const sibling = new RectShape("sibling", 0, 0, 10, 10);
  target.add(leaf);
  parent.add(target);
  parent.add(sibling);
  document.add(parent);
  const bus = new CommandBus(document);
  bus.execute(new DeleteCommand("target"));
  bus.execute(new DeleteCommand("parent"));
  assert.deepEqual(document.topLevel(), []);

  bus.undo();
  assert.strictEqual(document.require("parent"), parent);
  assert.deepEqual(parent.children(), [sibling]);
  assert.equal(document.find("leaf"), undefined);
  bus.undo();
  assert.deepEqual(parent.children(), [target, sibling]);
  assert.strictEqual(document.require("target"), target);
  assert.strictEqual(document.require("leaf"), leaf);

  bus.redo();
  assert.deepEqual(parent.children(), [sibling]);
  bus.redo();
  assert.deepEqual(document.topLevel(), []);
});

test("a successful new edit clears the redo branch and preserves earlier undo records", () => {
  const { document, bus, a, b, c } = createScene();
  bus.execute(new DeleteCommand("a"));
  bus.execute(new DeleteCommand("b"));
  bus.undo();
  assert.deepEqual(document.topLevel(), [b, c]);

  bus.execute(new DeleteCommand("c"));
  assert.throws(() => bus.redo(), { message: "nothing to redo" });
  assert.deepEqual(document.topLevel(), [b]);
  bus.undo();
  assert.deepEqual(document.topLevel(), [b, c]);
  bus.undo();
  assert.deepEqual(document.topLevel(), [a, b, c]);
  assert.throws(() => bus.undo(), { message: "nothing to undo" });
});

test("a failed new edit preserves both undo and redo records", () => {
  const { document, bus, a, b, c } = createScene();
  bus.execute(new DeleteCommand("a"));
  bus.execute(new DeleteCommand("b"));
  bus.undo();

  assert.throws(() => bus.execute(new DeleteCommand("missing")), {
    name: "RangeError",
    message: "no such shape: missing",
  });
  assert.deepEqual(document.topLevel(), [b, c]);
  bus.redo();
  assert.deepEqual(document.topLevel(), [c]);
  bus.undo();
  bus.undo();
  assert.deepEqual(document.topLevel(), [a, b, c]);
  assert.throws(() => bus.undo(), { message: "nothing to undo" });
});

test("a failed undo preserves the pending undo and the existing redo branch for retry", () => {
  const { document, bus, a, b, c } = createScene();
  bus.execute(new DeleteCommand("a"));
  bus.execute(new DeleteCommand("b"));
  bus.undo();
  // Inject a conflict to make the next undo fail before changing the document.
  const replacement = new RectShape("a", 0, 0, 10, 10);
  document.add(replacement);

  assert.throws(() => bus.undo(), {
    name: "RangeError",
    message: "id already exists: a",
  });
  assert.deepEqual(document.topLevel(), [b, c, replacement]);
  bus.redo();
  assert.deepEqual(document.topLevel(), [c, replacement]);

  document.remove(replacement);
  bus.undo();
  assert.deepEqual(document.topLevel(), [b, c]);
  bus.undo();
  assert.deepEqual(document.topLevel(), [a, b, c]);
  assert.strictEqual(document.require("a"), a);
  assert.throws(() => bus.undo(), { message: "nothing to undo" });
});

test("a failed redo preserves its command and earlier undo records for a corrected retry", () => {
  const { document, bus, a, b, c } = createScene();
  bus.execute(new DeleteCommand("a"));
  bus.execute(new DeleteCommand("b"));
  bus.undo();
  const detachedB = document.remove(b);

  assert.throws(() => bus.redo(), {
    name: "RangeError",
    message: "no such shape: b",
  });
  assert.deepEqual(document.topLevel(), [c]);
  document.restore(detachedB);
  bus.redo();
  assert.deepEqual(document.topLevel(), [c]);
  bus.undo();
  bus.undo();
  assert.deepEqual(document.topLevel(), [a, b, c]);
  assert.strictEqual(document.require("b"), b);
});

test("IO locking clears both histories and only a successful edit unlocks a fresh history", () => {
  const { document, bus, b, c } = createScene();
  bus.execute(new DeleteCommand("a"));
  bus.execute(new DeleteCommand("b"));
  bus.undo();
  bus.lockAfterIO();
  bus.lockAfterIO();

  for (const action of [() => bus.undo(), () => bus.redo()]) {
    assert.throws(action, {
      name: "RangeError",
      message: "undo not allowed after io command",
    });
  }
  assert.deepEqual(document.topLevel(), [b, c]);
  assert.throws(() => bus.execute(new DeleteCommand("missing")), {
    message: "no such shape: missing",
  });
  assert.throws(() => bus.undo(), { message: "undo not allowed after io command" });
  assert.throws(() => bus.redo(), { message: "undo not allowed after io command" });

  bus.execute(new DeleteCommand("c"));
  bus.undo();
  assert.deepEqual(document.topLevel(), [b, c]);
  assert.throws(() => bus.undo(), { message: "nothing to undo" });
  assert.equal(document.find("a"), undefined);
  bus.redo();
  assert.deepEqual(document.topLevel(), [b]);
  assert.throws(() => bus.redo(), { message: "nothing to redo" });
});

test("separate buses keep same-ID objects and histories isolated between documents", () => {
  const first = createScene();
  const second = createScene();
  first.bus.execute(new DeleteCommand("a"));
  assert.strictEqual(second.document.require("a"), second.a);
  assert.throws(() => second.bus.undo(), { message: "nothing to undo" });
  second.bus.execute(new DeleteCommand("b"));
  first.bus.undo();
  assert.strictEqual(first.document.require("a"), first.a);
  assert.equal(second.document.find("b"), undefined);
  second.bus.undo();
  assert.strictEqual(second.document.require("b"), second.b);
});
