import assert from "node:assert/strict";
import test from "node:test";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

test("prepared nested transformations leave geometry unchanged until applied and undo exact values", () => {
  const outer = new GroupShape("outer");
  const inner = new GroupShape("inner");
  const leaf = new RectShape("leaf", 1, -1, 3, 7, "red");
  const sibling = new RectShape("sibling", 0.1, 0.2, 0.3, 0.4);
  inner.add(leaf);
  outer.add(sibling);
  outer.add(inner);
  const before = [leaf.attributes(), sibling.attributes()];
  const move = outer.prepareMove(1e16, -1e16);
  assert.deepEqual([leaf.attributes(), sibling.attributes()], before);
  move.apply();
  const moved = [leaf.attributes(), sibling.attributes()];
  assert.deepEqual(leaf.position, { x: 1e16, y: -1e16 });
  const scale = outer.prepareScale(0.1);
  assert.deepEqual([leaf.attributes(), sibling.attributes()], moved);
  scale.apply();
  assert.equal(leaf.width, 3 * 0.1);
  assert.equal(sibling.height, 0.4 * 0.1);
  scale.undo();
  assert.deepEqual([leaf.attributes(), sibling.attributes()], moved);
  move.undo();
  // Subtracting 1e16 would lose the original 1 and 0.1 coordinates.
  assert.deepEqual([leaf.attributes(), sibling.attributes()], before);
  assert.strictEqual(outer.children()[0], sibling);
  assert.strictEqual(outer.children()[1], inner);
  assert.strictEqual(inner.children()[0], leaf);
});

test("leaf and empty groups reject invalid transformation inputs during preparation", () => {
  for (const shape of [new RectShape("r", 1, 2, 3, 4), new GroupShape("empty")]) {
    const before = shape.attributes();
    for (const invalid of [NaN, Infinity, -Infinity]) {
      assert.throws(() => shape.prepareMove(invalid, 0), RangeError);
      assert.throws(() => shape.prepareMove(0, invalid), RangeError);
    }
    for (const invalid of [NaN, Infinity, -Infinity, 0, -1]) {
      assert.throws(() => shape.prepareScale(invalid), RangeError);
    }
    assert.deepEqual(shape.attributes(), before);
  }
});

test("overflow in a later nested child leaves all previously prepared moves unapplied", () => {
  const outer = new GroupShape("outer");
  const inner = new GroupShape("inner");
  const first = new RectShape("first", 1, 2, 3, 4);
  const last = new RectShape("last", 1e308, -1e308, 3, 4);
  outer.add(first);
  outer.add(inner);
  inner.add(last);
  const before = [first.attributes(), last.attributes()];
  for (const [dx, dy] of [[1e308, 0], [0, -1e308]] as const) {
    assert.throws(() => outer.prepareMove(dx, dy), {
      message: "moved rectangle coordinates must remain finite",
    });
    assert.deepEqual([first.attributes(), last.attributes()], before);
  }
});

test("group scaling rejects dimension overflow, coordinate overflow and size underflow atomically", () => {
  const cases = [
    { last: new RectShape("last", 0, 0, 1e308, 1), factor: 2,
      message: "scaled rectangle dimensions must remain finite" },
    { last: new RectShape("last", 0, -1e308, 1, 1), factor: 2,
      message: "scaled rectangle coordinates must remain finite" },
    { last: new RectShape("last", 0, 0, 1, Number.MIN_VALUE), factor: 0.5,
      message: "scaled rectangle dimensions must remain positive" },
  ];
  for (const { last, factor, message } of cases) {
    const outer = new GroupShape("outer");
    const inner = new GroupShape("inner");
    const first = new RectShape("first", 1, 2, 3, 4);
    outer.add(first);
    outer.add(inner);
    inner.add(last);
    const before = [first.attributes(), last.attributes()];
    assert.throws(() => outer.prepareScale(factor), { message });
    assert.deepEqual([first.attributes(), last.attributes()], before);
  }
});
