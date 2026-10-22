import assert from "node:assert/strict";
import test from "node:test";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

test("group attributes are independent from each other and from child geometry", () => {
  const group = new GroupShape("group");
  const child = new RectShape("child", 10, 20, 30, 40, "red");
  group.add(child);
  assert.equal(group.type, "g");
  const attributes = group.attributes();
  assert.notStrictEqual(attributes, group.attributes());
  Reflect.set(attributes, "x", 999);
  Reflect.set(attributes, "fill", "blue");
  assert.deepEqual(group.attributes(), {});
  assert.deepEqual(group.children(), [child]);
  assert.deepEqual(child.position, { x: 10, y: 20 });
  assert.equal(child.fill, "red");
});

test("group stores children and delegates move and scale", () => {
  const group = new GroupShape("g1");
  const rect = new RectShape("r1", 10, 20, 100, 50);

  group.add(rect);
  group.move(5, -3);
  group.scale(2);

  assert.deepEqual(group.children().map((child) => child.id), ["r1"]);
  assert.deepEqual(rect.position, { x: 30, y: 34 });
  assert.equal(rect.width, 200);
  assert.equal(rect.height, 100);
});

test("group rejects invalid scale factors before changing children", () => {
  const group = new GroupShape("g1");
  const rect = new RectShape("r1", 10, 20, 100, 50);

  group.add(rect);

  assert.throws(
    () => group.scale(0),
    { name: "RangeError", message: "scale factor must be positive" },
  );

  assert.deepEqual(rect.position, { x: 10, y: 20 });
  assert.equal(rect.width, 100);
  assert.equal(rect.height, 50);
});

test("group rejects adding an ancestor as a descendant", () => {
  const outer = new GroupShape("outer");
  const inner = new GroupShape("inner");

  outer.add(inner);

  assert.throws(
    () => inner.add(outer),
    { name: "RangeError", message: "group cannot contain an ancestor" },
  );

  assert.deepEqual(inner.children(), []);
});

test("nested groups transform every descendant and preserve sibling order", () => {
  const outer = new GroupShape("outer");
  const inner = new GroupShape("inner");
  const nestedRect = new RectShape("nested", 10, 20, 100, 50);
  const siblingRect = new RectShape("sibling", -5, 4, 20, 10);

  inner.add(nestedRect);
  outer.add(inner);
  outer.add(siblingRect);

  outer.move(5, -3);
  outer.scale(2);

  assert.deepEqual(nestedRect.position, { x: 30, y: 34 });
  assert.equal(nestedRect.width, 200);
  assert.equal(nestedRect.height, 100);
  assert.deepEqual(siblingRect.position, { x: 0, y: 2 });
  assert.equal(siblingRect.width, 40);
  assert.equal(siblingRect.height, 20);
  assert.deepEqual(outer.children(), [inner, siblingRect]);
  assert.deepEqual(inner.children(), [nestedRect]);
});

test("changing the returned children array cannot bypass group membership rules", () => {
  const group = new GroupShape("group");
  const rect = new RectShape("rect", 0, 0, 10, 10);
  group.add(rect);

  const children = group.children();
  // Simulate a JavaScript caller, where TypeScript readonly does not apply.
  Reflect.set(children, "length", 0);

  assert.deepEqual(group.children(), [rect]);

  group.move(3, 4);
  assert.deepEqual(rect.position, { x: 3, y: 4 });
});

test("remove returns the original child and preserves the order of remaining siblings", () => {
  const group = new GroupShape("group");
  const first = new RectShape("first", 0, 0, 10, 10);
  const middle = new RectShape("middle", 20, 30, 10, 10);
  const last = new RectShape("last", 40, 50, 10, 10);
  group.add(first);
  group.add(middle);
  group.add(last);

  assert.strictEqual(group.remove("middle"), middle);
  assert.deepEqual(group.children(), [first, last]);

  group.move(3, 4);
  assert.deepEqual(first.position, { x: 3, y: 4 });
  assert.deepEqual(last.position, { x: 43, y: 54 });
  assert.deepEqual(middle.position, { x: 20, y: 30 });
});

test("removing an unknown or already removed child preserves group membership", () => {
  const group = new GroupShape("group");
  const first = new RectShape("first", 0, 0, 10, 10);
  const last = new RectShape("last", 0, 0, 10, 10);

  assert.throws(() => group.remove("missing"), RangeError);
  assert.deepEqual(group.children(), []);

  group.add(first);
  group.add(last);
  assert.throws(() => group.remove("missing"), RangeError);
  assert.deepEqual(group.children(), [first, last]);

  group.remove("first");
  assert.throws(() => group.remove("first"), RangeError);
  assert.deepEqual(group.children(), [last]);
});

test("remove only accepts direct children and preserves a detached subtree for transfer", () => {
  const source = new GroupShape("source");
  const destination = new GroupShape("destination");
  const nested = new GroupShape("nested");
  const rect = new RectShape("rect", 10, 20, 30, 40);
  nested.add(rect);
  source.add(nested);

  assert.throws(() => source.remove("rect"), RangeError);
  assert.deepEqual(source.children(), [nested]);
  assert.deepEqual(nested.children(), [rect]);

  const removed = source.remove("nested");
  assert.strictEqual(removed, nested);
  assert.deepEqual(removed.children(), [rect]);
  assert.deepEqual(source.children(), []);

  destination.add(removed);
  source.move(100, 100);
  assert.deepEqual(rect.position, { x: 10, y: 20 });
  destination.move(3, 4);
  assert.deepEqual(rect.position, { x: 13, y: 24 });
});

test("remove matches child IDs case-sensitively", () => {
  const group = new GroupShape("group");
  const lower = new RectShape("rect", 0, 0, 10, 10);
  const upper = new RectShape("RECT", 0, 0, 10, 10);
  group.add(lower);
  group.add(upper);

  assert.strictEqual(group.remove("RECT"), upper);
  assert.deepEqual(group.children(), [lower]);
  assert.strictEqual(group.remove("rect"), lower);
  assert.deepEqual(group.children(), []);
});

test("add supports insertion at the start, middle, and end while preserving existing order", () => {
  const group = new GroupShape("group");
  const first = new RectShape("first", 0, 0, 10, 10);
  const middle = new RectShape("middle", 0, 0, 10, 10);
  const last = new RectShape("last", 0, 0, 10, 10);
  const appended = new RectShape("appended", 0, 0, 10, 10);

  group.add(middle, 0);
  group.add(first, 0);
  group.add(last, 2);
  group.add(appended);
  assert.deepEqual(group.children(), [first, middle, last, appended]);

  const removed = group.remove("middle");
  group.add(removed, 1);
  const restored = group.children();
  assert.deepEqual(restored, [first, middle, last, appended]);
  assert.strictEqual(restored[1], middle);
});

test("add rejects invalid insertion indices without changing children", () => {
  const group = new GroupShape("group");
  const existing = new RectShape("existing", 0, 0, 10, 10);
  const candidate = new RectShape("candidate", 0, 0, 10, 10);

  assert.throws(() => group.add(candidate, 1), RangeError);
  assert.deepEqual(group.children(), []);
  group.add(existing);

  const invalidIndices = [
    -1, 0.5, 2, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
  ];
  for (const index of invalidIndices) {
    assert.throws(() => group.add(candidate, index), RangeError);
    assert.deepEqual(group.children(), [existing]);
  }

  group.add(candidate, 1);
  assert.deepEqual(group.children(), [existing, candidate]);
});

test("indexed insertion rejects duplicate IDs and self-insertion without changing order", () => {
  const group = new GroupShape("group");
  const first = new RectShape("first", 0, 0, 10, 10);
  const last = new RectShape("last", 0, 0, 10, 10);
  const duplicate = new RectShape("first", 20, 30, 40, 50);
  group.add(first);
  group.add(last);

  assert.throws(() => group.add(first, 1), RangeError);
  assert.deepEqual(group.children(), [first, last]);
  assert.throws(() => group.add(duplicate, 1), RangeError);
  assert.deepEqual(group.children(), [first, last]);
  assert.throws(() => group.add(group, 0), RangeError);
  assert.deepEqual(group.children(), [first, last]);
});

test("indexed insertion rejects an ancestor several levels up without changing either tree", () => {
  const outer = new GroupShape("outer");
  const middle = new GroupShape("middle");
  const inner = new GroupShape("inner");
  const rect = new RectShape("rect", 10, 20, 30, 40);
  outer.add(middle);
  middle.add(inner);
  inner.add(rect);

  assert.throws(() => inner.add(outer, 0), RangeError);
  assert.deepEqual(outer.children(), [middle]);
  assert.deepEqual(middle.children(), [inner]);
  assert.deepEqual(inner.children(), [rect]);

  outer.move(3, 4);
  assert.deepEqual(rect.position, { x: 13, y: 24 });
});
