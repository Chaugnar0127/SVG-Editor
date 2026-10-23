import assert from "node:assert/strict";
import test from "node:test";
import { ShapeFactory } from "../../src/application/ShapeFactory.js";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

test("factory preserves rectangle geometry and optional fill without changing input parameters", () => {
  const factory = new ShapeFactory();
  for (const fill of [undefined, "#4a90d9", "none", "rgb(10 20 30)"]) {
    const parameters = Object.freeze([
      "-10.5", "2e1", "100.25", "50", ...(fill === undefined ? [] : [fill]),
    ]);
    const before = [...parameters];
    const shape = factory.create("rect", "矩形", parameters);
    assert.ok(shape instanceof RectShape);
    assert.equal(shape.id, "矩形");
    assert.deepEqual(shape.position, { x: -10.5, y: 20 });
    assert.equal(shape.width, 100.25);
    assert.equal(shape.height, 50);
    assert.equal(shape.fill, fill);
    assert.deepEqual(parameters, before);
    const another = factory.create("rect", "矩形", parameters);
    assert.notStrictEqual(another, shape, "factory does not own document IDs or cache shapes");
  }
});

test("factory creates independent empty groups and rejects extra group parameters", () => {
  const factory = new ShapeFactory();
  const first = factory.create("g", "in", Object.freeze([]));
  const second = factory.create("g", "in", []);
  assert.ok(first instanceof GroupShape);
  assert.ok(second instanceof GroupShape);
  first.add(new RectShape("child", 0, 0, 10, 10));
  assert.deepEqual(second.children(), []);
  assert.throws(() => factory.create("g", "extra", ["red"]), {
    name: "RangeError", message: "usage: create g <id> [in <containerId>]",
  });
});

test("factory rejects unknown types and empty or whitespace-containing IDs", () => {
  const factory = new ShapeFactory();
  for (const type of ["box", "hexagon", "Rect", "toString", "__proto__", ""]) {
    assert.throws(() => factory.create(type, "shape", []), {
      name: "RangeError",
      message: `unknown shape type: ${type} (is the plugin loaded?)`,
    });
  }
  for (const id of ["", " ", "two words", "a\tb", "a\nb", "a\u3000b"]) {
    for (const type of ["g", "rect"]) {
      assert.throws(() => factory.create(type, id, []), {
        message: "shape id must be non-empty and contain no whitespace",
      });
    }
  }
});

test("factory rejects partial or non-finite numeric tokens at every rectangle coordinate and dimension", () => {
  const factory = new ShapeFactory();
  for (const [index, label] of ["x", "y", "width", "height"].entries()) {
    for (const invalid of ["", " ", "10px", "NaN", "Infinity", "-Infinity", "1e309"]) {
      const parameters = ["10", "20", "100", "50"];
      parameters[index] = invalid;
      assert.throws(() => factory.create("rect", "shape", parameters), {
        name: "RangeError", message: `${label} must be a finite number`,
      });
    }
  }
});

test("factory rejects invalid rectangle arity, non-positive dimensions and blank fill", () => {
  const factory = new ShapeFactory();
  for (const parameters of [[], ["0", "0", "10"], ["0", "0", "10", "10", "red", "extra"]]) {
    assert.throws(() => factory.create("rect", "shape", parameters), {
      message: "usage: create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]",
    });
  }
  for (const index of [2, 3]) {
    for (const invalid of ["0", "-1", "1e-999"]) {
      const parameters = ["0", "0", "10", "10"];
      parameters[index] = invalid;
      assert.throws(() => factory.create("rect", "shape", parameters), RangeError);
    }
  }
  for (const fill of ["", " \t"]) {
    assert.throws(() => factory.create("rect", "shape", ["0", "0", "10", "10", fill]), {
      message: "fill must not be empty",
    });
  }
});
