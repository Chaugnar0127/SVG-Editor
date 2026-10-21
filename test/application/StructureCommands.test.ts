import assert from "node:assert/strict";
import test from "node:test";
import { CommandBus } from "../../src/application/CommandBus.js";
import { AddToCommand } from "../../src/application/commands/AddToCommand.js";
import { BackCommand } from "../../src/application/commands/BackCommand.js";
import { DeleteCommand } from "../../src/application/commands/DeleteCommand.js";
import { FrontCommand } from "../../src/application/commands/FrontCommand.js";
import { SvgDocument } from "../../src/domain/document/SvgDocument.js";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

function createScene(nested: boolean) {
  const document = new SvgDocument(400, 300);
  const source = nested ? new GroupShape("source") : null;
  const target = new GroupShape("target");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  const first = new RectShape("first", 0, 0, 10, 10);
  const last = new RectShape("last", 0, 0, 10, 10);
  const destination = new GroupShape("destination");
  const a = new RectShape("a", 0, 0, 10, 10);
  const b = new RectShape("b", 0, 0, 10, 10);
  target.add(leaf);
  destination.add(a);
  destination.add(b);
  for (const shape of [first, target, last]) {
    if (source === null) {
      document.add(shape);
    } else {
      source.add(shape);
    }
  }
  if (source !== null) {
    document.add(source);
  }
  document.add(destination);
  return {
    document, bus: new CommandBus(document), source, target, leaf,
    first, last, destination, a, b,
  };
}

test("addto transfers the original subtree from roots or a group and restores its exact position", () => {
  for (const nested of [false, true]) {
    const { document, source, target, leaf, first, last, destination, a, b } = createScene(nested);
    const rootsBefore = document.topLevel();
    const command = new AddToCommand("destination", "target");
    for (let cycle = 0; cycle < 3; cycle += 1) {
      command.execute(document);
      assert.deepEqual(destination.children(), [a, b, target]);
      assert.deepEqual(source === null ? document.topLevel() : source.children(),
        source === null ? [first, last, destination] : [first, last]);
      assert.strictEqual(document.require("target"), target);
      assert.strictEqual(document.require("leaf"), leaf);
      assert.strictEqual(target.children()[0], leaf);
      assert.deepEqual(leaf.position, { x: 10, y: 20 });
      assert.equal(leaf.width, 30);
      assert.equal(leaf.height, 40);
      command.undo(document);
      assert.deepEqual(document.topLevel(), rootsBefore);
      assert.deepEqual(destination.children(), [a, b]);
      if (source !== null) {
        assert.deepEqual(source.children(), [first, target, last]);
      }
    }
    assert.equal(document.width, 400);
    assert.equal(document.height, 300);
  }
});

test("addto appends within the same parent and undo restores the former middle position", () => {
  const { document, source, target, first, last } = createScene(true);
  assert.ok(source);
  const command = new AddToCommand("source", "target");
  command.execute(document);
  assert.deepEqual(source.children(), [first, last, target]);
  command.undo(document);
  assert.deepEqual(source.children(), [first, target, last]);
});

test("addto rejects missing containers, non-containers, and missing targets without executing", () => {
  const { document, source, target, first, last, destination, a, b } = createScene(true);
  assert.ok(source);
  const cases = [
    { command: new AddToCommand("missing", "target"), message: "no such container: missing" },
    { command: new AddToCommand("first", "target"), message: "not a container: first" },
    { command: new AddToCommand("destination", "missing"), message: "no such shape: missing" },
  ];
  for (const { command, message } of cases) {
    assert.throws(() => command.execute(document), { name: "RangeError", message });
    assert.throws(() => command.undo(document), {
      message: "addto command has not been executed",
    });
    assert.deepEqual(document.topLevel(), [source, destination]);
    assert.deepEqual(source.children(), [first, target, last]);
    assert.deepEqual(destination.children(), [a, b]);
  }

  const retry = new AddToCommand("new-group", "target");
  assert.throws(() => retry.execute(document), RangeError);
  const newGroup = new GroupShape("new-group");
  document.add(newGroup);
  retry.execute(document);
  assert.strictEqual(newGroup.children()[0], target);
  retry.undo(document);
  assert.deepEqual(source.children(), [first, target, last]);
});

test("addto rejects a group as its own parent or as a child of its descendant", () => {
  const { document, source, target, leaf, first, last } = createScene(true);
  assert.ok(source);
  for (const [containerId, id] of [["source", "source"], ["target", "source"]] as const) {
    const command = new AddToCommand(containerId, id);
    assert.throws(() => command.execute(document), {
      name: "RangeError",
      message: "cannot move a shape into itself or its descendant",
    });
    assert.deepEqual(source.children(), [first, target, last]);
    assert.strictEqual(target.children()[0], leaf);
    assert.strictEqual(document.require("leaf"), leaf);
    assert.throws(() => command.undo(document), {
      message: "addto command has not been executed",
    });
  }
});

test("failed addto undo retains the target location and history until the original parent returns", () => {
  const { document, bus, source, target, first, last, destination, a, b } = createScene(true);
  assert.ok(source);
  bus.execute(new AddToCommand("destination", "target"));
  // Simulate a stale parent outside the normal command flow.
  const detachedSource = document.remove(source);
  const replacement = new GroupShape("source");
  document.add(replacement);
  assert.throws(() => bus.undo(), {
    name: "RangeError",
    message: "no such container: source",
  });
  assert.deepEqual(destination.children(), [a, b, target]);
  assert.deepEqual(source.children(), [first, last]);
  assert.deepEqual(replacement.children(), []);

  document.remove(replacement);
  document.restore(detachedSource);
  bus.undo();
  assert.deepEqual(source.children(), [first, target, last]);
  assert.deepEqual(destination.children(), [a, b]);
  bus.redo();
  assert.deepEqual(destination.children(), [a, b, target]);
});

for (const [name, Command] of [["front", FrontCommand], ["back", BackCommand]] as const) {
  test(`${name} changes only sibling order and undo restores a middle subtree at either level`, () => {
    for (const nested of [false, true]) {
      const { document, source, target, leaf, first, last, destination, a, b } = createScene(nested);
      const before = source === null ? document.topLevel() : source.children();
      const expected = name === "front"
        ? (source === null ? [first, last, destination, target] : [first, last, target])
        : (source === null ? [target, first, last, destination] : [target, first, last]);
      const command = new Command("target");
      for (let cycle = 0; cycle < 3; cycle += 1) {
        command.execute(document);
        assert.deepEqual(source === null ? document.topLevel() : source.children(), expected);
        assert.deepEqual(destination.children(), [a, b]);
        assert.strictEqual(document.require("target"), target);
        assert.strictEqual(document.require("leaf"), leaf);
        assert.deepEqual(leaf.position, { x: 10, y: 20 });
        assert.equal(leaf.width, 30);
        assert.equal(leaf.height, 40);
        if (source !== null) {
          assert.deepEqual(document.topLevel(), [source, destination]);
        }
        command.undo(document);
        assert.deepEqual(source === null ? document.topLevel() : source.children(), before);
      }
    }
  });

  test(`${name} rejects a missing target but permits a corrected retry on the same command`, () => {
    const document = new SvgDocument();
    const command = new Command("target");
    assert.throws(() => command.execute(document), {
      name: "RangeError",
      message: "no such shape: target",
    });
    assert.throws(() => command.undo(document), {
      message: `${name} command has not been executed`,
    });
    const target = new RectShape("target", 0, 0, 10, 10);
    const sibling = new RectShape("sibling", 0, 0, 10, 10);
    document.add(target);
    document.add(sibling);
    command.execute(document);
    command.undo(document);
    assert.deepEqual(document.topLevel(), [target, sibling]);
  });

  test(`${name} retains its recovery record when undo fails and succeeds after target restoration`, () => {
    const { document, bus, source, target, first, last } = createScene(true);
    assert.ok(source);
    bus.execute(new Command("target"));
    const detached = document.remove(target);
    assert.throws(() => bus.undo(), {
      name: "RangeError",
      message: "no such shape: target",
    });
    assert.deepEqual(source.children(), [first, last]);
    document.restore(detached);
    bus.undo();
    assert.deepEqual(source.children(), [first, target, last]);
    bus.redo();
    assert.deepEqual(source.children(), name === "front"
      ? [first, last, target]
      : [target, first, last]);
  });

  test(`${name} on a sole remaining shape still consumes exactly one successful history step`, () => {
    const document = new SvgDocument();
    const a = new RectShape("a", 0, 0, 10, 10);
    const b = new RectShape("b", 0, 0, 10, 10);
    document.add(a);
    document.add(b);
    const bus = new CommandBus(document);
    bus.execute(new DeleteCommand("a"));
    bus.execute(new Command("b"));
    bus.undo();
    assert.deepEqual(document.topLevel(), [b]);
    bus.undo();
    assert.deepEqual(document.topLevel(), [a, b]);
    bus.redo();
    bus.redo();
    assert.deepEqual(document.topLevel(), [b]);
    assert.throws(() => bus.redo(), { message: "nothing to redo" });
  });
}

test("structure commands reject duplicate execution and premature undo without losing original positions", () => {
  const cases = [
    { name: "addto", create: () => new AddToCommand("destination", "target") },
    { name: "front", create: () => new FrontCommand("target") },
    { name: "back", create: () => new BackCommand("target") },
  ];
  for (const { name, create } of cases) {
    const { document, source, target, first, last, destination, a, b } = createScene(true);
    assert.ok(source);
    const command = create();
    assert.throws(() => command.undo(document), {
      message: `${name} command has not been executed`,
    });
    command.execute(document);
    const sourceAfter = source.children();
    const destinationAfter = destination.children();
    assert.throws(() => command.execute(document), {
      message: `${name} command is already executed`,
    });
    assert.deepEqual(source.children(), sourceAfter);
    assert.deepEqual(destination.children(), destinationAfter);
    command.undo(document);
    assert.deepEqual(source.children(), [first, target, last]);
    assert.deepEqual(destination.children(), [a, b]);
    assert.throws(() => command.undo(document), {
      message: `${name} command has not been executed`,
    });
    command.execute(document);
    command.undo(document);
    assert.deepEqual(source.children(), [first, target, last]);
  }
});

test("migration, sorting, and container deletion compose into a reversible multi-command history", () => {
  const { document, bus, source, target, leaf, destination, a, b } = createScene(true);
  assert.ok(source);
  const snapshot = () => ({
    roots: document.topLevel().map((shape) => shape.id),
    source: source.children().map((shape) => shape.id),
    destination: destination.children().map((shape) => shape.id),
    leafPresent: document.find("leaf") !== undefined,
  });
  const commands = [
    new AddToCommand("destination", "target"),
    new BackCommand("target"),
    new FrontCommand("a"),
    new DeleteCommand("destination"),
  ];
  const states = [snapshot()];
  for (const command of commands) {
    bus.execute(command);
    states.push(snapshot());
  }
  assert.equal(document.find("destination"), undefined);
  assert.equal(document.find("leaf"), undefined);
  assert.deepEqual(destination.children(), [target, b, a]);

  for (let index = commands.length - 1; index >= 0; index -= 1) {
    bus.undo();
    assert.deepEqual(snapshot(), states[index]);
    assert.strictEqual(document.require("target"), target);
    assert.strictEqual(document.require("leaf"), leaf);
  }
  assert.throws(() => bus.undo(), { message: "nothing to undo" });
  for (let index = 0; index < commands.length; index += 1) {
    bus.redo();
    assert.deepEqual(snapshot(), states[index + 1]);
  }
  assert.throws(() => bus.redo(), { message: "nothing to redo" });
  assert.deepEqual(leaf.position, { x: 10, y: 20 });
});

test("a rejected migration preserves redo while a successful migration starts a new history branch", () => {
  const { document, bus, source, target, first, last, destination, a, b } = createScene(true);
  assert.ok(source);
  bus.execute(new BackCommand("target"));
  bus.undo();
  assert.throws(() => bus.execute(new AddToCommand("first", "target")), {
    message: "not a container: first",
  });
  bus.redo();
  assert.deepEqual(source.children(), [target, first, last]);
  bus.undo();
  bus.execute(new AddToCommand("destination", "target"));
  assert.deepEqual(destination.children(), [a, b, target]);
  assert.throws(() => bus.redo(), { message: "nothing to redo" });
  bus.undo();
  assert.deepEqual(source.children(), [first, target, last]);
});
