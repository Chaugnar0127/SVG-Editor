import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../../src/application/EditorSession.js";
import { CreateCommand } from "../../src/application/commands/CreateCommand.js";
import { DeleteCommand } from "../../src/application/commands/DeleteCommand.js";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

function assertHistoryLocked(session: EditorSession): void {
  const error = {
    name: "RangeError",
    message: "undo not allowed after io command",
  };
  assert.throws(() => session.undo(), error);
  assert.throws(() => session.redo(), error);
}

test("an uninitialized session rejects document operations without consuming the edit command", () => {
  const session = new EditorSession();
  const shape = new RectShape("shape", 10, 20, 30, 40);
  const command = new CreateCommand(shape);
  const operations = [
    () => session.requireDocument(),
    () => session.resizeCanvas(400, 300),
    () => session.execute(command),
    () => session.undo(),
    () => session.redo(),
  ];
  for (const operation of operations) {
    assert.throws(operation, {
      name: "RangeError",
      message: "no document. use 'init' or 'read' first",
    });
  }
  assert.throws(() => session.init(0, 300), RangeError);
  assert.throws(() => session.requireDocument(), {
    message: "no document. use 'init' or 'read' first",
  });

  session.init();
  session.execute(command);
  assert.strictEqual(session.requireDocument().require("shape"), shape);
  session.undo();
  assert.deepEqual(session.requireDocument().topLevel(), []);
});

test("init creates an empty canvas with independent defaults and locks history", () => {
  const session = new EditorSession();
  const cases = [
    [undefined, undefined, 800, 600],
    [320.5, 240.25, 320.5, 240.25],
    [400, undefined, 400, 600],
    [undefined, 300, 800, 300],
  ] as const;
  for (const [width, height, expectedWidth, expectedHeight] of cases) {
    session.init(width, height);
    const document = session.requireDocument();
    assert.equal(document.width, expectedWidth);
    assert.equal(document.height, expectedHeight);
    assert.deepEqual(document.topLevel(), []);
    assertHistoryLocked(session);
  }
});

test("failed reinitialization preserves the original document and both undo and redo records", () => {
  const session = new EditorSession();
  session.init(400, 300);
  const document = session.requireDocument();
  const first = new RectShape("first", 10, 20, 30, 40);
  const second = new RectShape("second", 0, 0, 10, 10);
  session.execute(new CreateCommand(first));
  session.execute(new CreateCommand(second));
  session.undo();

  for (const invalid of [0, -1, NaN, Infinity, -Infinity]) {
    for (const [width, height] of [[invalid, 900], [1200, invalid]] as const) {
      assert.throws(() => session.init(width, height), RangeError);
      assert.strictEqual(session.requireDocument(), document);
      assert.equal(document.width, 400);
      assert.equal(document.height, 300);
      assert.deepEqual(document.topLevel(), [first]);
      session.redo();
      assert.deepEqual(document.topLevel(), [first, second]);
      session.undo();
      session.undo();
      assert.deepEqual(document.topLevel(), []);
      session.redo();
      assert.deepEqual(document.topLevel(), [first]);
    }
  }
});

test("successful reinitialization replaces the document and never revives old history", () => {
  const session = new EditorSession();
  session.init();
  const oldDocument = session.requireDocument();
  const oldShape = new RectShape("shape", 10, 20, 30, 40);
  const undoneShape = new RectShape("undone", 0, 0, 10, 10);
  session.execute(new CreateCommand(oldShape));
  session.execute(new CreateCommand(undoneShape));
  session.undo();

  session.init(640, 480);
  const document = session.requireDocument();
  assert.notStrictEqual(document, oldDocument);
  assert.deepEqual(document.topLevel(), []);
  assert.equal(document.width, 640);
  assert.equal(document.height, 480);
  assertHistoryLocked(session);
  assert.throws(() => session.execute(new DeleteCommand("missing")), RangeError);
  assertHistoryLocked(session);

  const replacement = new RectShape("shape", 50, 60, 70, 80);
  session.execute(new CreateCommand(replacement));
  assert.strictEqual(document.require("shape"), replacement);
  session.undo();
  assert.deepEqual(document.topLevel(), []);
  assert.throws(() => session.undo(), { message: "nothing to undo" });
  session.redo();
  assert.strictEqual(document.require("shape"), replacement);
  assert.throws(() => session.redo(), { message: "nothing to redo" });
  assert.deepEqual(oldDocument.topLevel(), [oldShape]);
  assert.equal(oldDocument.find("undone"), undefined);
  assert.deepEqual(oldShape.position, { x: 10, y: 20 });
});

test("successful canvas resize keeps the tree but clears both histories until a successful edit", () => {
  const session = new EditorSession();
  session.init(400, 300);
  const document = session.requireDocument();
  const group = new GroupShape("group");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  group.add(leaf);
  session.execute(new CreateCommand(group));
  session.execute(new DeleteCommand("leaf"));
  session.undo();

  session.resizeCanvas(640.5, 480.25);
  assert.strictEqual(session.requireDocument(), document);
  assert.equal(document.width, 640.5);
  assert.equal(document.height, 480.25);
  assert.strictEqual(document.require("group"), group);
  assert.strictEqual(document.require("leaf"), leaf);
  assertHistoryLocked(session);
  assert.throws(() => session.execute(new CreateCommand(
    new RectShape("leaf", 0, 0, 10, 10),
  )), { message: "id already exists: leaf" });
  assertHistoryLocked(session);

  const next = new RectShape("next", 0, 0, 10, 10);
  session.execute(new CreateCommand(next));
  session.undo();
  assert.deepEqual(document.topLevel(), [group]);
  assert.throws(() => session.undo(), { message: "nothing to undo" });
  session.redo();
  assert.deepEqual(document.topLevel(), [group, next]);
  assert.throws(() => session.redo(), { message: "nothing to redo" });
  assert.strictEqual(group.children()[0], leaf);
  assert.deepEqual(leaf.position, { x: 10, y: 20 });
  assert.equal(leaf.width, 30);
  assert.equal(leaf.height, 40);
});

test("failed canvas resize preserves both dimensions, both histories and the current document", () => {
  const session = new EditorSession();
  session.init(400, 300);
  const document = session.requireDocument();
  const first = new RectShape("first", 0, 0, 10, 10);
  const second = new RectShape("second", 0, 0, 10, 10);
  session.execute(new CreateCommand(first));
  session.execute(new CreateCommand(second));
  session.undo();

  for (const invalid of [0, -1, NaN, Infinity, -Infinity]) {
    for (const [width, height] of [[invalid, 900], [1200, invalid]] as const) {
      assert.throws(() => session.resizeCanvas(width, height), RangeError);
      assert.strictEqual(session.requireDocument(), document);
      assert.equal(document.width, 400);
      assert.equal(document.height, 300);
      assert.deepEqual(document.topLevel(), [first]);
      session.redo();
      assert.deepEqual(document.topLevel(), [first, second]);
      session.undo();
      session.undo();
      assert.deepEqual(document.topLevel(), []);
      session.redo();
    }
  }
});

test("queries and failed document operations preserve an existing history lock", () => {
  const session = new EditorSession();
  session.init(400, 300);
  const document = session.requireDocument();
  assert.equal(session.requireDocument().width, 400);
  assertHistoryLocked(session);
  assert.throws(() => session.init(1000, 0), RangeError);
  assert.throws(() => session.resizeCanvas(1000, 0), RangeError);
  assert.strictEqual(session.requireDocument(), document);
  assert.equal(document.width, 400);
  assert.equal(document.height, 300);
  assertHistoryLocked(session);

  const shape = new RectShape("shape", 0, 0, 10, 10);
  session.execute(new CreateCommand(shape));
  assert.strictEqual(session.requireDocument().require("shape"), shape);
  session.undo();
  assert.deepEqual(session.requireDocument().topLevel(), []);
  assert.equal(session.requireDocument().height, 300);
  session.redo();
  assert.strictEqual(document.require("shape"), shape);
});

test("sessions with identical IDs keep document replacement, canvas changes and histories isolated", () => {
  const first = new EditorSession();
  const second = new EditorSession();
  first.init(400, 300);
  second.init(200, 100);
  const firstShape = new RectShape("shape", 10, 20, 30, 40);
  const secondShape = new RectShape("shape", 50, 60, 70, 80);
  first.execute(new CreateCommand(firstShape));
  second.execute(new CreateCommand(secondShape));
  const secondDocument = second.requireDocument();

  first.resizeCanvas(800, 600);
  assertHistoryLocked(first);
  second.undo();
  assert.deepEqual(secondDocument.topLevel(), []);
  first.init();
  second.redo();
  assert.strictEqual(second.requireDocument(), secondDocument);
  assert.strictEqual(secondDocument.require("shape"), secondShape);
  assert.equal(secondDocument.width, 200);
  assert.equal(secondDocument.height, 100);
  assert.deepEqual(first.requireDocument().topLevel(), []);
  assertHistoryLocked(first);
});
