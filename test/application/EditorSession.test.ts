import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../../src/application/EditorSession.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

function createRect(session: EditorSession, id: string, x: number, y: number, width: number, height: number): RectShape {
  session.createShape("rect", id, [x, y, width, height].map(String));
  const shape = session.requireDocument().require(id);
  assert.ok(shape instanceof RectShape);
  return shape;
}

function assertHistoryLocked(session: EditorSession): void {
  const error = {
    name: "RangeError",
    message: "undo not allowed after io command",
  };
  assert.throws(() => session.undo(), error);
  assert.throws(() => session.redo(), error);
}

test("an uninitialized session rejects document operations and allows initialization afterwards", () => {
  const session = new EditorSession();
  const operations = [
    () => session.requireDocument(),
    () => session.resizeCanvas(400, 300),
    () => session.moveShape("shape", 1, 2),
    () => session.createShape("g", "group", []),
    () => session.createShape("unknown", "", []),
    () => session.deleteShape("shape"),
    () => session.addTo("group", "shape"),
    () => session.reorderShape("shape", "front"),
    () => session.reorderShape("shape", "back"),
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
  const shape = createRect(session, "shape", 10, 20, 30, 40);
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
  const first = createRect(session, "first", 10, 20, 30, 40);
  const second = createRect(session, "second", 0, 0, 10, 10);
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
  const oldShape = createRect(session, "shape", 10, 20, 30, 40);
  createRect(session, "undone", 0, 0, 10, 10);
  session.undo();

  session.init(640, 480);
  const document = session.requireDocument();
  assert.notStrictEqual(document, oldDocument);
  assert.deepEqual(document.topLevel(), []);
  assert.equal(document.width, 640);
  assert.equal(document.height, 480);
  assertHistoryLocked(session);
  assert.throws(() => session.deleteShape("missing"), RangeError);
  assertHistoryLocked(session);

  const replacement = createRect(session, "shape", 50, 60, 70, 80);
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
  session.createShape("g", "group", []);
  session.createShape("rect", "leaf", ["10", "20", "30", "40"], "group");
  const group = document.requireContainer("group");
  const leaf = document.require("leaf");
  assert.ok(leaf instanceof RectShape);
  session.deleteShape("leaf");
  session.undo();

  session.resizeCanvas(640.5, 480.25);
  assert.strictEqual(session.requireDocument(), document);
  assert.equal(document.width, 640.5);
  assert.equal(document.height, 480.25);
  assert.strictEqual(document.require("group"), group);
  assert.strictEqual(document.require("leaf"), leaf);
  assertHistoryLocked(session);
  assert.throws(() => session.createShape("rect", "leaf", ["0", "0", "10", "10"]), {
    message: "id already exists: leaf",
  });
  assertHistoryLocked(session);

  const next = createRect(session, "next", 0, 0, 10, 10);
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
  const first = createRect(session, "first", 0, 0, 10, 10);
  const second = createRect(session, "second", 0, 0, 10, 10);
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
  assert.throws(() => session.createShape("rect", "bad", ["0", "0", "0", "10"]), RangeError);
  assert.throws(() => session.createShape("g", "bad", [], "missing"), RangeError);
  assert.throws(() => session.deleteShape("missing"), RangeError);
  assert.throws(() => session.moveShape("missing", 1, 2), RangeError);
  assert.throws(() => session.addTo("missing", "missing"), RangeError);
  assert.throws(() => session.reorderShape("missing", "front"), RangeError);
  assert.throws(() => session.reorderShape("missing", "back"), RangeError);
  assert.strictEqual(session.requireDocument(), document);
  assert.equal(document.width, 400);
  assert.equal(document.height, 300);
  assertHistoryLocked(session);

  const shape = createRect(session, "shape", 0, 0, 10, 10);
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
  createRect(first, "shape", 10, 20, 30, 40);
  const secondShape = createRect(second, "shape", 50, 60, 70, 80);
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

test("session creation and deletion preserve original nested objects, fill and sibling order across history", () => {
  const session = new EditorSession();
  session.init();
  session.createShape("g", "scene", []);
  session.createShape("rect", "before", ["0", "0", "10", "10"], "scene");
  session.createShape("g", "nested", [], "scene");
  session.createShape("rect", "leaf", ["-1.5", "20", "30", "40", "#4a90d9"], "nested");
  session.createShape("rect", "after", ["0", "0", "10", "10"], "scene");
  const document = session.requireDocument();
  const scene = document.requireContainer("scene");
  const nested = document.requireContainer("nested");
  const before = document.require("before");
  const after = document.require("after");
  const leaf = document.require("leaf");
  assert.ok(leaf instanceof RectShape);

  session.deleteShape("nested");
  for (let cycle = 0; cycle < 2; cycle++) {
    assert.deepEqual(scene.children(), [before, after]);
    assert.equal(document.find("nested"), undefined);
    assert.equal(document.find("leaf"), undefined);
    session.undo();
    assert.deepEqual(scene.children(), [before, nested, after]);
    assert.strictEqual(document.require("nested"), nested);
    assert.strictEqual(document.require("leaf"), leaf);
    assert.deepEqual(nested.children(), [leaf]);
    assert.deepEqual(leaf.position, { x: -1.5, y: 20 });
    assert.equal(leaf.width, 30);
    assert.equal(leaf.height, 40);
    assert.equal(leaf.fill, "#4a90d9");
    session.redo();
  }

  session.undo();
  session.undo();
  assert.deepEqual(scene.children(), [before, nested]);
  session.redo();
  assert.strictEqual(document.require("after"), after);
  assert.deepEqual(scene.children(), [before, nested, after]);
});
