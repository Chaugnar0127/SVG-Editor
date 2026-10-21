import assert from "node:assert/strict";
import test from "node:test";
import { DeleteCommand } from "../../src/application/commands/DeleteCommand.js";
import { SvgDocument } from "../../src/domain/document/SvgDocument.js";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

test("delete and undo preserve a whole subtree, geometry, and original order at either level", () => {
  for (const nested of [false, true]) {
    const document = new SvgDocument(400, 300);
    const parent = nested ? new GroupShape("parent") : null;
    const first = new RectShape("first", 0, 0, 10, 10);
    const target = new GroupShape("target");
    const inner = new GroupShape("inner");
    const leaf = new RectShape("leaf", 10, 20, 30, 40);
    const last = new RectShape("last", 0, 0, 10, 10);
    inner.add(leaf);
    target.add(inner);
    for (const shape of [first, target, last]) {
      if (parent === null) {
        document.add(shape);
      } else {
        parent.add(shape);
      }
    }
    if (parent !== null) {
      document.add(parent);
    }
    const command = new DeleteCommand("target");

    for (let cycle = 0; cycle < 3; cycle += 1) {
      command.execute(document);
      assert.deepEqual(parent === null ? document.topLevel() : parent.children(), [first, last]);
      for (const id of ["target", "inner", "leaf"]) {
        assert.equal(document.find(id), undefined);
      }

      command.undo(document);
      assert.deepEqual(parent === null ? document.topLevel() : parent.children(), [first, target, last]);
      for (const shape of [target, inner, leaf]) {
        assert.strictEqual(document.require(shape.id), shape);
      }
      assert.deepEqual(leaf.position, { x: 10, y: 20 });
      assert.equal(leaf.width, 30);
      assert.equal(leaf.height, 40);
      assert.equal(document.width, 400);
      assert.equal(document.height, 300);
    }
  }
});

test("a failed delete leaves the command unexecuted and a corrected retry can be undone", () => {
  const document = new SvgDocument();
  const command = new DeleteCommand("target");
  assert.throws(() => command.execute(document), {
    name: "RangeError",
    message: "no such shape: target",
  });
  assert.throws(() => command.undo(document), {
    name: "Error",
    message: "delete command has not been executed",
  });
  assert.deepEqual(document.topLevel(), []);

  const target = new RectShape("target", 10, 20, 30, 40);
  document.add(target);
  command.execute(document);
  assert.equal(document.find("target"), undefined);
  command.undo(document);
  assert.strictEqual(document.require("target"), target);
});

test("delete command rejects invalid lifecycle calls without losing its recovery record", () => {
  const document = new SvgDocument();
  const target = new RectShape("target", 10, 20, 30, 40);
  document.add(target);
  const command = new DeleteCommand("target");

  assert.throws(() => command.undo(document), {
    name: "Error",
    message: "delete command has not been executed",
  });
  assert.strictEqual(document.require("target"), target);

  command.execute(document);
  assert.throws(() => command.execute(document), {
    name: "Error",
    message: "delete command is already executed",
  });
  assert.deepEqual(document.topLevel(), []);
  command.undo(document);
  assert.strictEqual(document.require("target"), target);
  assert.throws(() => command.undo(document), {
    name: "Error",
    message: "delete command has not been executed",
  });
  assert.deepEqual(document.topLevel(), [target]);

  command.execute(document);
  command.undo(document);
  assert.strictEqual(document.require("target"), target);
});

test("failed undo due to a descendant ID conflict keeps the original subtree available for retry", () => {
  const document = new SvgDocument();
  const target = new GroupShape("target");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  target.add(leaf);
  document.add(target);
  const command = new DeleteCommand("target");
  command.execute(document);

  // Inject a conflict outside the command flow to exercise a failed undo.
  const replacement = new RectShape("leaf", 0, 0, 10, 10);
  document.add(replacement);
  assert.throws(() => command.undo(document), {
    name: "RangeError",
    message: "id already exists: leaf",
  });
  assert.deepEqual(document.topLevel(), [replacement]);
  assert.strictEqual(target.children()[0], leaf);

  document.remove(replacement);
  command.undo(document);
  assert.strictEqual(document.require("target"), target);
  assert.strictEqual(document.require("leaf"), leaf);
});

test("failed undo retains its record when the original parent is missing or replaced", () => {
  const document = new SvgDocument();
  const parent = new GroupShape("parent");
  const target = new RectShape("target", 10, 20, 30, 40);
  parent.add(target);
  document.add(parent);
  const command = new DeleteCommand("target");
  command.execute(document);

  const detachedParent = document.remove(parent);
  assert.throws(() => command.undo(document), {
    name: "RangeError",
    message: "no such container: parent",
  });
  assert.deepEqual(document.topLevel(), []);

  const replacement = new GroupShape("parent");
  document.add(replacement);
  assert.throws(() => command.undo(document), {
    name: "RangeError",
    message: "no such container: parent",
  });
  assert.deepEqual(replacement.children(), []);
  assert.deepEqual(parent.children(), []);

  document.remove(replacement);
  document.restore(detachedParent);
  command.undo(document);
  assert.strictEqual(parent.children()[0], target);
  assert.strictEqual(document.require("target"), target);
});
