import assert from "node:assert/strict";
import test from "node:test";
import { RectShape } from "../../src/domain/shape/RectShape.js";

test("rectangle attributes are independent snapshots and omit unset fill", () => {
  const plain = new RectShape("plain", 1, 2, 3, 4);
  assert.equal(plain.type, "rect");
  assert.deepEqual(plain.attributes(), { x: 1, y: 2, width: 3, height: 4 });
  assert.equal(Object.hasOwn(plain.attributes(), "fill"), false);
  const rect = new RectShape("rect", 10, 20, 30, 40, "red");
  const snapshot = rect.attributes();
  const altered = rect.attributes();
  assert.notStrictEqual(snapshot, altered);
  // Simulate JavaScript consumers that do not enforce TypeScript readonly.
  Reflect.set(altered, "x", 999);
  Reflect.set(altered, "fill", "blue");
  Reflect.deleteProperty(altered, "width");
  assert.deepEqual(rect.attributes(), { x: 10, y: 20, width: 30, height: 40, fill: "red" });
  rect.move(5, -5);
  rect.scale(2);
  assert.deepEqual(snapshot, { x: 10, y: 20, width: 30, height: 40, fill: "red" });
  assert.deepEqual(rect.attributes(), { x: 30, y: 30, width: 60, height: 80, fill: "red" });
});

test("rectangle construction rejects non-finite coordinates through the domain API", () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    for (const [x, y] of [[invalid, 0], [0, invalid]] as const) {
      assert.throws(() => new RectShape("shape", x, y, 10, 20), {
        name: "RangeError", message: "rectangle coordinates must be finite numbers",
      });
    }
  }
});

test("rectangle retains omitted or explicit fill through geometry changes and rejects blank fill", () => {
  for (const fill of [undefined, "none", "red", "rgb(10 20 30)"]) {
    const shape = new RectShape("shape", 10, 20, 30, 40, fill);
    shape.move(5, -5);
    shape.scale(2);
    assert.equal(shape.fill, fill);
    assert.deepEqual(shape.position, { x: 30, y: 30 });
  }
  for (const fill of ["", " \t"]) {
    assert.throws(() => new RectShape("shape", 0, 0, 10, 20, fill), {
      name: "RangeError", message: "fill must not be empty",
    });
  }
});

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
