import assert from "node:assert/strict";
import test from "node:test";
import { ExtensionRegistry } from "../../src/application/extensions/ExtensionRegistry.js";
import { ShapeFactory } from "../../src/application/ShapeFactory.js";
import { SvgCodec } from "../../src/infrastructure/SvgCodec.js";
import builtinShapesPlugin from "../../src/plugins/shapes/BuiltinShapesPlugin.js";

test("six Phase 1 shapes are unavailable before registration and available after one plugin activation", () => {
  const extensions = new ExtensionRegistry();
  const factory = new ShapeFactory(extensions);
  assert.throws(() => factory.create("rect", "r", ["0", "0", "1", "1"]), {
    message: "unknown shape type: rect (is the plugin loaded?)",
  });

  assert.deepEqual(extensions.install(builtinShapesPlugin), { success: true });
  for (const [type, parameters] of [
    ["rect", ["0", "0", "10", "10"]], ["g", []], ["circle", ["0", "0", "5"]],
    ["ellipse", ["0", "0", "5", "4"]], ["line", ["0", "0", "10", "10"]], ["text", ["0", "0", "label"]],
  ] as const) {
    assert.equal(factory.create(type, type, parameters).type, type);
  }
  assert.deepEqual(extensions.shapeProviders().map(({ name }) => name), ["rect", "g", "circle", "ellipse", "line", "text"]);
});

test("the registered providers read and write the original six-shape SVG model", () => {
  const extensions = new ExtensionRegistry();
  assert.deepEqual(extensions.install(builtinShapesPlugin), { success: true });
  const codec = new SvgCodec(new ShapeFactory(extensions));
  const source = '<svg xmlns="http://www.w3.org/2000/svg"><rect id="r" width="10px" height="5"/><g id="g"><text id="t">hello</text></g></svg>';
  const document = codec.decode(source).document;
  assert.deepEqual(document.topLevel().map(({ type }) => type), ["rect", "g"]);
  assert.equal(document.require("r").attributes().width, 10);
  assert.equal(document.require("t").attributes().text, "hello");
  const copy = codec.decode(codec.encode(document)).document;
  assert.equal(copy.require("g").children()[0]!.id, "t");
});
