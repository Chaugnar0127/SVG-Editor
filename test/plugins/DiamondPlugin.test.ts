import assert from "node:assert/strict";
import test from "node:test";
import { ExtensionRegistry } from "../../src/application/extensions/ExtensionRegistry.js";
import { ShapeFactory } from "../../src/application/ShapeFactory.js";
import { SvgCodec } from "../../src/infrastructure/SvgCodec.js";
import diamondPlugin from "../../src/plugins/diamond/DiamondPlugin.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import { EditorSession } from "../../src/application/EditorSession.js";
import { Tokenizer } from "../../src/cli/Tokenizer.js";
test("diamond provider writes a marked SVG polygon and reads it back with geometry and styles", () => {
  const extensions = new ExtensionRegistry();
  assert.deepEqual(extensions.install(diamondPlugin), { success: true });
  const codec = new SvgCodec(new ShapeFactory(extensions));
  const document = codec.decode(
    '<svg xmlns="http://www.w3.org/2000/svg"><polygon id="d" data-shape="diamond" points="35,20 20,35 5,20 20,5" fill="gold" stroke="black"/></svg>',
  ).document;
  const diamond = document.require("d");
  assert.equal(diamond.type, "diamond");
  assert.deepEqual(diamond.attributes(), { cx: 20, cy: 20, width: 30, height: 30, fill: "gold", stroke: "black" });

  const encoded = codec.encode(document);
  assert.match(encoded, /<polygon[^>]*data-shape="diamond"[^>]*points="20,5 35,20 20,35 5,20"/u);
  const copy = codec.decode(encoded).document.require("d");
  assert.equal(copy.type, "diamond");
  assert.deepEqual(copy.attributes(), diamond.attributes());
});

test("diamond provider rejects malformed marked polygons", () => {
  const extensions = new ExtensionRegistry();
  assert.deepEqual(extensions.install(diamondPlugin), { success: true });
  const codec = new SvgCodec(new ShapeFactory(extensions));
  assert.throws(
    () => codec.decode('<svg xmlns="http://www.w3.org/2000/svg"><polygon data-shape="diamond" points="0,0 4,0 4,4"/></svg>'),
    { name: "RangeError", message: "diamond polygon must contain four vertices" },
  );
  assert.throws(
    () => codec.decode('<svg xmlns="http://www.w3.org/2000/svg"><polygon data-shape="diamond" points="0,0 4,0 4,4 0,4"/></svg>'),
    { name: "RangeError", message: "diamond polygon points must describe an axis-aligned diamond" },
  );
  assert.throws(
    () => codec.decode('<svg xmlns="http://www.w3.org/2000/svg"><polygon data-shape="diamond" points="0,0 4,4 4,0 0,4"/></svg>'),
    { name: "RangeError", message: "diamond polygon points must describe an axis-aligned diamond" },
  );
});
test("create, move, scale, and set commands dispatch diamond behavior through its provider", () => {
  const extensions = new ExtensionRegistry();
  extensions.install(diamondPlugin);
  const session = new EditorSession(undefined, extensions);
  const registry = new CommandRegistry(session);
  const tokenizer = new Tokenizer();
  const execute = (line: string) => registry.execute(tokenizer.tokenize(line));
  execute("init");
  assert.deepEqual(execute("create diamond decision 40 50 80 40 gold"), {
    kind: "message", text: "diamond#decision created",
  });
  execute("move decision 5 -10");
  execute("scale decision 2");
  execute("set decision width 100");
  assert.deepEqual(session.requireDocument().require("decision").attributes(), {
    cx: 90, cy: 80, width: 100, height: 80, fill: "gold",
  });

  execute("undo");
  assert.deepEqual(session.requireDocument().require("decision").attributes(), {
    cx: 90, cy: 80, width: 160, height: 80, fill: "gold",
  });
  execute("undo");
  assert.deepEqual(session.requireDocument().require("decision").attributes(), {
    cx: 45, cy: 40, width: 80, height: 40, fill: "gold",
  });
});
