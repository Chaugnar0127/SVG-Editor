import assert from "node:assert/strict";
import test from "node:test";
import { CommandBus } from "../../src/application/CommandBus.js";
import { AddToCommand } from "../../src/application/commands/AddToCommand.js";
import { ReorderCommand } from "../../src/application/commands/ReorderCommand.js";
import { CreateCommand } from "../../src/application/commands/CreateCommand.js";
import { DeleteCommand } from "../../src/application/commands/DeleteCommand.js";
import { SvgDocument } from "../../src/domain/document/SvgDocument.js";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";
import type { Shape } from "../../src/domain/shape/Shape.js";

test("create appends original shapes or subtrees at root or nested level across undo and redo", () => {
  for (const nested of [false, true]) {
    for (const grouped of [false, true]) {
      const document = new SvgDocument(400, 300);
      const bus = new CommandBus(document);
      const outer = new GroupShape("outer");
      const parent = new GroupShape("parent");
      const sibling = new RectShape("sibling", 0, 0, 10, 10);
      if (nested) {
        parent.add(sibling);
        outer.add(parent);
        document.add(outer);
      } else {
        document.add(sibling);
      }
      const leaf = new RectShape("leaf", 10, 20, 30, 40);
      const group = new GroupShape("group");
      group.add(leaf);
      const shape = grouped ? group : leaf;
      const command = new CreateCommand(shape, nested ? "parent" : undefined);
      bus.execute(command);

      for (let cycle = 0; cycle < 3; cycle += 1) {
        assert.deepEqual(nested ? parent.children() : document.topLevel(), [sibling, shape]);
        assert.strictEqual(document.require(shape.id), shape);
        assert.strictEqual(document.require("leaf"), leaf);
        assert.deepEqual(leaf.position, { x: 10, y: 20 });
        assert.equal(leaf.width, 30);
        assert.equal(leaf.height, 40);
        bus.undo();
        assert.deepEqual(nested ? parent.children() : document.topLevel(), [sibling]);
        assert.equal(document.find(shape.id), undefined);
        assert.equal(document.find("leaf"), undefined);
        bus.redo();
      }
      assert.equal(document.width, 400);
      assert.equal(document.height, 300);
    }
  }
});

test("create rejects premature undo and duplicate execution without changing lifecycle state", () => {
  const document = new SvgDocument();
  const shape = new RectShape("shape", 10, 20, 30, 40);
  const command = new CreateCommand(shape);
  assert.throws(() => command.undo(document), {
    message: "create command has not been executed",
  });
  assert.deepEqual(document.topLevel(), []);
  command.execute(document);
  assert.throws(() => command.execute(document), {
    message: "create command is already executed",
  });
  assert.deepEqual(document.topLevel(), [shape]);
  command.undo(document);
  assert.throws(() => command.undo(document), {
    message: "create command has not been executed",
  });
  command.execute(document);
  assert.strictEqual(document.require("shape"), shape);
});

test("create keeps a failed command retryable after a missing or non-group container is corrected", () => {
  const document = new SvgDocument();
  const shape = new RectShape("shape", 10, 20, 30, 40);
  const command = new CreateCommand(shape, "parent");
  assert.throws(() => command.execute(document), {
    name: "RangeError", message: "no such container: parent",
  });
  const wrongParent = new RectShape("parent", 0, 0, 10, 10);
  document.add(wrongParent);
  assert.throws(() => command.execute(document), {
    name: "RangeError", message: "not a container: parent",
  });
  assert.throws(() => command.undo(document), {
    message: "create command has not been executed",
  });
  assert.deepEqual(document.topLevel(), [wrongParent]);
  assert.equal(document.find("shape"), undefined);
  document.remove(wrongParent);
  const parent = new GroupShape("parent");
  document.add(parent);
  command.execute(document);
  assert.strictEqual(parent.children()[0], shape);
  command.undo(document);
  assert.deepEqual(parent.children(), []);
});

test("create rejects an existing object without accidentally taking ownership of its removal", () => {
  const document = new SvgDocument();
  const shape = new RectShape("shape", 10, 20, 30, 40);
  document.add(shape);
  const command = new CreateCommand(shape);
  assert.throws(() => command.execute(document), {
    name: "RangeError", message: "id already exists: shape",
  });
  assert.throws(() => command.undo(document), {
    message: "create command has not been executed",
  });
  assert.strictEqual(document.require("shape"), shape);
  document.remove(shape);
  command.execute(document);
  command.undo(document);
  assert.deepEqual(document.topLevel(), []);
});

test("failed create undo preserves history and never removes a replacement with the same ID", () => {
  const document = new SvgDocument();
  const bus = new CommandBus(document);
  const shape = new RectShape("shape", 10, 20, 30, 40);
  bus.execute(new CreateCommand(shape));
  // Simulate external mutation so recovery must check object identity.
  const detached = document.remove(shape);
  const replacement = new RectShape("shape", 0, 0, 10, 10);
  document.add(replacement);
  assert.throws(() => bus.undo(), {
    name: "RangeError", message: "no such shape: shape",
  });
  assert.strictEqual(document.require("shape"), replacement);
  document.remove(replacement);
  document.restore(detached);
  bus.undo();
  assert.deepEqual(document.topLevel(), []);
  bus.redo();
  assert.strictEqual(document.require("shape"), shape);
});

test("failed create redo preserves all remaining redo records until a descendant ID conflict is removed", () => {
  const document = new SvgDocument();
  const bus = new CommandBus(document);
  const group = new GroupShape("group");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  group.add(leaf);
  const later = new RectShape("later", 0, 0, 10, 10);
  bus.execute(new CreateCommand(group));
  bus.execute(new CreateCommand(later));
  bus.undo();
  bus.undo();
  const conflict = new RectShape("leaf", 0, 0, 10, 10);
  document.add(conflict);
  assert.throws(() => bus.redo(), {
    name: "RangeError", message: "id already exists: leaf",
  });
  assert.deepEqual(document.topLevel(), [conflict]);
  assert.equal(document.find("group"), undefined);
  assert.strictEqual(group.children()[0], leaf);
  document.remove(conflict);
  bus.redo();
  bus.redo();
  assert.deepEqual(document.topLevel(), [group, later]);
  assert.strictEqual(document.require("leaf"), leaf);
  bus.undo();
  bus.undo();
  assert.deepEqual(document.topLevel(), []);
});

test("failed creation preserves a redo branch and only successful creation replaces that branch", () => {
  const document = new SvgDocument();
  const bus = new CommandBus(document);
  const original = new RectShape("original", 0, 0, 10, 10);
  const previous = new RectShape("previous", 0, 0, 10, 10);
  bus.execute(new CreateCommand(original));
  bus.execute(new CreateCommand(previous));
  bus.undo();
  const duplicate = new RectShape("original", 10, 20, 30, 40);
  assert.throws(() => bus.execute(new CreateCommand(duplicate)), RangeError);
  assert.deepEqual(document.topLevel(), [original]);
  bus.redo();
  assert.deepEqual(document.topLevel(), [original, previous]);
  bus.undo();
  const next = new RectShape("next", 0, 0, 10, 10);
  bus.execute(new CreateCommand(next));
  assert.throws(() => bus.redo(), { message: "nothing to redo" });
  bus.undo();
  assert.deepEqual(document.topLevel(), [original]);
  bus.undo();
  assert.deepEqual(document.topLevel(), []);
});

test("creation, migration, ordering and deletion each remain one reversible history step", () => {
  const document = new SvgDocument();
  const bus = new CommandBus(document);
  const source = new GroupShape("source");
  const destination = new GroupShape("destination");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  const other = new RectShape("other", 0, 0, 10, 10);
  const commands = [
    new CreateCommand(source),
    new CreateCommand(leaf, "source"),
    new CreateCommand(destination),
    new CreateCommand(other, "destination"),
    new AddToCommand("destination", "leaf"),
    new ReorderCommand("leaf", "back"),
    new DeleteCommand("destination"),
  ];
  const expected = [
    "",
    "source[]",
    "source[leaf]",
    "source[leaf],destination[]",
    "source[leaf],destination[other]",
    "source[],destination[other,leaf]",
    "source[],destination[leaf,other]",
    "source[]",
  ];
  const describe = (shape: Shape): string => shape instanceof GroupShape
    ? `${shape.id}[${shape.children().map(describe).join(",")}]`
    : shape.id;
  const check = (step: number): void => {
    assert.equal(document.topLevel().map(describe).join(","), expected[step]);
    for (const shape of [source, destination, leaf, other]) {
      const found = document.find(shape.id);
      if (found !== undefined) assert.strictEqual(found, shape);
    }
    assert.deepEqual(leaf.position, { x: 10, y: 20 });
    assert.equal(leaf.width, 30);
    assert.equal(leaf.height, 40);
  };
  check(0);
  for (const [index, command] of commands.entries()) {
    bus.execute(command);
    check(index + 1);
  }
  for (let cycle = 0; cycle < 2; cycle += 1) {
    for (let step = commands.length - 1; step >= 0; step -= 1) {
      bus.undo();
      check(step);
    }
    assert.throws(() => bus.undo(), { message: "nothing to undo" });
    for (let step = 1; step <= commands.length; step += 1) {
      bus.redo();
      check(step);
    }
    assert.throws(() => bus.redo(), { message: "nothing to redo" });
  }
});
