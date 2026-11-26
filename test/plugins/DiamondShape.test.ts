import assert from "node:assert/strict";
import test from "node:test";
import { DiamondShape } from "../../src/plugins/diamond/DiamondShape.js";

test("diamond exposes a geometry snapshot and supports reversible geometry changes", () => {
  const diamond = new DiamondShape("decision", 10, 20, 30, 40, "gold");
  assert.equal(diamond.type, "diamond");
  assert.deepEqual(diamond.attributes(), { cx: 10, cy: 20, width: 30, height: 40, fill: "gold" });
  assert.deepEqual(diamond.center, { cx: 10, cy: 20 });

  const move = diamond.prepareMove(5, -3);
  move.apply();
  assert.deepEqual(diamond.attributes(), { cx: 15, cy: 17, width: 30, height: 40, fill: "gold" });
  move.undo();
  assert.deepEqual(diamond.attributes(), { cx: 10, cy: 20, width: 30, height: 40, fill: "gold" });

  diamond.prepareScale(2).apply();
  assert.deepEqual(diamond.attributes(), { cx: 20, cy: 40, width: 60, height: 80, fill: "gold" });
  const resize = diamond.prepareSet("width", "90");
  resize.apply();
  resize.undo();
  assert.equal(diamond.width, 60);
});

test("diamond rejects invalid centers, dimensions, and scale results", () => {
  assert.throws(() => new DiamondShape("bad-center", Number.NaN, 0, 10, 10), { name: "RangeError" });
  assert.throws(() => new DiamondShape("bad-width", 0, 0, 0, 10), { name: "RangeError" });
  assert.throws(() => new DiamondShape("bad-height", 0, 0, 10, -1), { name: "RangeError" });
  assert.throws(() => new DiamondShape("collapsed", 1e16, 0, 1, 10), { name: "RangeError" });

  const diamond = new DiamondShape("stable", 1, 2, 3, 4);
  assert.throws(() => diamond.prepareScale(Number.POSITIVE_INFINITY), { name: "RangeError" });
  assert.deepEqual(diamond.attributes(), { cx: 1, cy: 2, width: 3, height: 4 });
});
