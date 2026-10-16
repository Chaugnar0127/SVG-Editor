import assert from "node:assert/strict";
import test from "node:test";
import { RectShape } from "../../src/domain/shape/RectShape.js";

test("move changes position but preserves size", () => {
  const rect = new RectShape("r1", 10, 20, 100, 50);

  rect.move(5, -3);

  assert.deepEqual(rect.position, { x: 15, y: 17 });
  assert.equal(rect.width, 100);
  assert.equal(rect.height, 50);
});

test("rejects non-positive or non-finite width and height", () => {
  for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => new RectShape("r1", 0, 0, width, 10),
      { name: "RangeError", message: "rectangle width must be a positive finite number" },
    );
  }

  for (const height of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => new RectShape("r1", 0, 0, 10, height),
      { name: "RangeError", message: "rectangle height must be a positive finite number" },
    );
  }
});

test("scale changes position and dimensions proportionally", () => {
  const rect = new RectShape("r1", 10, 20, 100, 50);

  rect.scale(2);

  assert.deepEqual(rect.position, { x: 20, y: 40 });
  assert.equal(rect.width, 200);
  assert.equal(rect.height, 100);
});

test("rejects invalid scale factors without changing the rectangle", () => {
  const rect = new RectShape("r1", 10, 20, 100, 50);

  for (const factor of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => rect.scale(factor),
      { name: "RangeError", message: "scale factor must be positive" },
    );
  }

  assert.deepEqual(rect.position, { x: 10, y: 20 });
  assert.equal(rect.width, 100);
  assert.equal(rect.height, 50);
});
