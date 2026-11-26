import assert from "node:assert/strict";
import test from "node:test";
import { ExtensionRegistry } from "../../src/application/extensions/ExtensionRegistry.js";
import { ShapeFactory } from "../../src/application/ShapeFactory.js";
import { SvgCodec } from "../../src/infrastructure/SvgCodec.js";
import builtinShapesPlugin from "../../src/plugins/shapes/BuiltinShapesPlugin.js";
import boxPlugin from "../../src/plugins/box/BoxPlugin.js";
import { EditorSession } from "../../src/application/EditorSession.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import { RectShapeProvider } from "../../src/plugins/shapes/RectShapeProvider.js";
import { BuiltinShapeProvider } from "../../src/plugins/shapes/BuiltinShapeProvider.js";

test("Phase 1 shapes are unavailable before registration and available after activation", () => {
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
  assert.deepEqual(extensions.shapeProviders().map(({ name }) => name), ["rect", "circle", "ellipse", "line", "text", "g"]);
  assert.throws(() => factory.create("diamond", "d", ["0", "0", "10", "10"]), {
    message: "unknown shape type: diamond (is the plugin loaded?)",
  });
});

test("help follows registered shape syntax without requiring an initialized document", () => {
  const extensions = new ExtensionRegistry();
  extensions.install(builtinShapesPlugin);
  const session = new EditorSession(undefined, extensions);
  const commands = new CommandRegistry(session);
  const help = () => {
    const result = commands.execute(["help"]);
    assert.ok(result?.kind === "message");
    return result.text;
  };
  assert.doesNotMatch(help(), /create diamond/u);
  assert.doesNotMatch(help(), /create box/u);
  extensions.install(boxPlugin);
  assert.match(help(), /create box <id> <x> <y> <w> <h> "label"/u);

  // A future provider supplies its own syntax without changing the CLI's help table.
  class FutureShapeProvider extends BuiltinShapeProvider {
    public readonly name = "future";
    public readonly usage = "create future <id> <x> <y> <w> <h>";
    public create(id: string, parameters: readonly string[]) {
      return new RectShapeProvider().create(id, parameters);
    }
    protected parametersFromElement(): readonly string[] { return ["0", "0", "1", "1"]; }
  }
  extensions.install({
    manifest: { name: "future", contributes: { shapes: ["future"] } },
    activate: (context) => context.registerShapeProvider(new FutureShapeProvider()),
  });
  assert.match(help(), /create future <id> <x> <y> <w> <h>/u);
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

test("built-in providers preserve common styles on every shape during SVG readback", () => {
  const extensions = new ExtensionRegistry();
  assert.deepEqual(extensions.install(builtinShapesPlugin), { success: true });
  const codec = new SvgCodec(new ShapeFactory(extensions));
  const source = '<svg xmlns="http://www.w3.org/2000/svg">'
    + '<rect id="r" width="10" height="5" fill="red"/>'
    + '<circle id="c" r="3" fill="orange"/>'
    + '<ellipse id="e" rx="4" ry="2" fill="yellow"/>'
    + '<line id="l" x2="10" fill="green" stroke="black"/>'
    + '<text id="t" fill="blue">label</text>'
    + '<g id="g" fill="purple"/>'
    + '</svg>';

  const document = codec.decode(source).document;
  assert.deepEqual(
    document.topLevel().map((shape) => shape.attributes().fill),
    ["red", "orange", "yellow", "green", "blue", "purple"],
  );
  const copy = codec.decode(codec.encode(document)).document;
  assert.deepEqual(
    copy.topLevel().map((shape) => shape.attributes().fill),
    ["red", "orange", "yellow", "green", "blue", "purple"],
  );
});

