import assert from "node:assert/strict";
import test from "node:test";
import { CommandBus } from "../../src/application/CommandBus.js";
import { AddToCommand } from "../../src/application/commands/AddToCommand.js";
import { DeleteCommand } from "../../src/application/commands/DeleteCommand.js";
import { MoveCommand } from "../../src/application/commands/MoveCommand.js";
import { ReorderCommand } from "../../src/application/commands/ReorderCommand.js";
import { SvgDocument } from "../../src/domain/document/SvgDocument.js";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

test("a group move occupies one history step and repeated undo restores exact coordinates", () => {
  const document = new SvgDocument();
  const group = new GroupShape("group");
  const nested = new GroupShape("nested");
  const first = new RectShape("first", 1, -1, 3, 4, "red");
  const second = new RectShape("second", 2, 3, 4, 5);
  group.add(first);
  group.add(nested);
  nested.add(second);
  document.add(group);
  const bus = new CommandBus(document);
  const before = [first.attributes(), second.attributes()];
  bus.execute(new MoveCommand("group", 1e16, -1e16));
  for (let cycle = 0; cycle < 3; cycle += 1) {
    assert.equal(first.position.x, 1e16);
    assert.equal(second.position.x, 1e16 + 2);
    bus.undo();
    assert.deepEqual([first.attributes(), second.attributes()], before);
    assert.throws(() => bus.undo(), { message: "nothing to undo" });
    bus.redo();
    assert.throws(() => bus.redo(), { message: "nothing to redo" });
  }
  assert.strictEqual(document.require("first"), first);
  assert.deepEqual(group.children(), [first, nested]);
  assert.strictEqual(nested.children()[0], second);
});

test("move command guards its lifecycle and a missing-target failure can be retried", () => {
  const document = new SvgDocument();
  const command = new MoveCommand("r", 5, -3);
  assert.throws(() => command.undo(document), { message: "move command has not been executed" });
  assert.throws(() => command.execute(document), { message: "no such shape: r" });
  const rect = new RectShape("r", 10, 20, 30, 40);
  document.add(rect);
  command.execute(document);
  assert.deepEqual(rect.position, { x: 15, y: 17 });
  assert.throws(() => command.execute(document), { message: "move command is already executed" });
  assert.deepEqual(rect.position, { x: 15, y: 17 });
  command.undo(document);
  assert.deepEqual(rect.position, { x: 10, y: 20 });
  assert.throws(() => command.undo(document), { message: "move command has not been executed" });
});

test("invalid or overflowing moves preserve both undo and redo branches", () => {
  const document = new SvgDocument();
  const group = new GroupShape("g");
  const first = new RectShape("first", 0, 0, 3, 4);
  const last = new RectShape("last", 1e308, 0, 3, 4);
  group.add(first);
  group.add(last);
  document.add(group);
  const bus = new CommandBus(document);
  bus.execute(new MoveCommand("first", 1, 2));
  bus.execute(new MoveCommand("first", 3, 4));
  bus.undo();
  const before = [first.attributes(), last.attributes()];
  for (const command of [
    new MoveCommand("g", 1e308, 0),
    new MoveCommand("g", Infinity, 0),
    new MoveCommand("missing", 1, 2),
  ]) {
    assert.throws(() => bus.execute(command), RangeError);
    assert.throws(() => command.undo(document), { message: "move command has not been executed" });
    assert.deepEqual([first.attributes(), last.attributes()], before);
  }
  bus.redo();
  assert.deepEqual(first.position, { x: 4, y: 6 });
  bus.undo();
  bus.undo();
  assert.deepEqual(first.position, { x: 0, y: 0 });
});

test("failed move undo rejects a replacement object and retains history for retry", () => {
  const document = new SvgDocument();
  const original = new RectShape("r", 1, 2, 3, 4);
  document.add(original);
  const bus = new CommandBus(document);
  bus.execute(new MoveCommand("r", 5, 6));
  // Simulate edits outside the normal session to exercise stale history.
  const location = document.remove(original);
  const replacement = new RectShape("r", 20, 30, 40, 50);
  document.add(replacement);
  assert.throws(() => bus.undo(), { message: "no such shape: r" });
  assert.deepEqual(original.position, { x: 6, y: 8 });
  assert.deepEqual(replacement.position, { x: 20, y: 30 });
  document.remove(replacement);
  document.restore(location);
  bus.undo();
  assert.deepEqual(original.position, { x: 1, y: 2 });
  bus.redo();
  assert.deepEqual(original.position, { x: 6, y: 8 });
});

test("failed move redo preserves remaining redo steps and can resume after restoring the target", () => {
  const document = new SvgDocument();
  const rect = new RectShape("r", 1, 2, 3, 4);
  document.add(rect);
  const bus = new CommandBus(document);
  bus.execute(new MoveCommand("r", 5, 6));
  bus.execute(new MoveCommand("r", 7, 8));
  bus.undo();
  bus.undo();
  const location = document.remove(rect);
  assert.throws(() => bus.redo(), { message: "no such shape: r" });
  document.restore(location);
  bus.redo();
  assert.deepEqual(rect.position, { x: 6, y: 8 });
  bus.redo();
  assert.deepEqual(rect.position, { x: 13, y: 16 });
  assert.throws(() => bus.redo(), { message: "nothing to redo" });
});

test("move, migration, ordering and deletion share one reversible history", () => {
  const document = new SvgDocument();
  const source = new GroupShape("source");
  const destination = new GroupShape("destination");
  const rect = new RectShape("r", 1, 2, 3, 4);
  const sibling = new RectShape("sibling", 10, 20, 30, 40);
  source.add(rect);
  destination.add(sibling);
  document.add(source);
  document.add(destination);
  const bus = new CommandBus(document);
  bus.execute(new MoveCommand("source", 5, 6));
  bus.execute(new AddToCommand("destination", "r"));
  bus.execute(new ReorderCommand("r", "back"));
  bus.execute(new DeleteCommand("destination"));
  assert.equal(document.find("r"), undefined);
  bus.undo();
  assert.deepEqual(destination.children(), [rect, sibling]);
  assert.deepEqual(rect.position, { x: 6, y: 8 });
  bus.undo();
  assert.deepEqual(destination.children(), [sibling, rect]);
  bus.undo();
  assert.strictEqual(source.children()[0], rect);
  bus.undo();
  assert.deepEqual(rect.position, { x: 1, y: 2 });
  assert.deepEqual(sibling.position, { x: 10, y: 20 });
  for (let step = 0; step < 4; step += 1) bus.redo();
  assert.equal(document.find("destination"), undefined);
  assert.equal(document.find("r"), undefined);
  assert.deepEqual(rect.position, { x: 6, y: 8 });
});
