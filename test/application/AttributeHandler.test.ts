import assert from "node:assert/strict";
import test from "node:test";
import { ExtensionRegistry } from "../../src/application/extensions/ExtensionRegistry.js";
import type { AttributeHandler, Plugin } from "../../src/application/extensions/PluginContracts.js";
import { EditorSession } from "../../src/application/EditorSession.js";
import type { GeometryChange, Shape } from "../../src/domain/shape/Shape.js";

function installHandlers(handlers: readonly AttributeHandler[]): ExtensionRegistry {
  const extensions = new ExtensionRegistry();
  const plugin: Plugin = {
    manifest: { name: "attribute-test", contributes: { attributes: handlers.map(({ name }) => name) } },
    activate: (context) => handlers.forEach((handler) => context.registerAttributeHandler(handler)),
  };
  assert.deepEqual(extensions.install(plugin), { success: true });
  return extensions;
}

function handler(name: string, attribute: string, prepare: AttributeHandler["prepare"]): AttributeHandler {
  return {
    name,
    handles: (_shape, requested) => requested === attribute,
    prepare,
  };
}

test("a failed partial attribute change rolls back and leaves redo history intact", () => {
  const failing = handler("failing-fill", "synthetic", (shape, _attribute, value) => {
    const fill = shape.prepareSet("fill", value);
    return {
      apply: () => { fill.apply(); throw new Error("simulated handler failure"); },
      undo: () => fill.undo(),
    };
  });
  const session = new EditorSession(undefined, installHandlers([failing]));
  session.init();
  session.createShape("rect", "first", ["0", "0", "10", "10"]);
  session.createShape("rect", "redoable", ["0", "0", "5", "5"]);
  session.undo();
  const first = session.requireDocument().require("first");

  assert.throws(() => session.setAttribute("first", "synthetic", "red"), {
    message: "simulated handler failure",
  });
  assert.equal(Object.hasOwn(first.attributes(), "fill"), false);
  session.redo();
  assert.ok(session.requireDocument().find("redoable"));
});

test("multiple matching handlers fail before preparing a mutation", () => {
  let prepared = 0;
  const prepare = (_shape: Shape, _attribute: string, _value: string): GeometryChange => {
    prepared++;
    return { apply: () => {}, undo: () => {} };
  };
  const session = new EditorSession(undefined, installHandlers([
    handler("first-fill", "fill", prepare),
    handler("second-fill", "fill", prepare),
  ]));
  session.init();
  session.createShape("rect", "target", ["0", "0", "10", "10"]);

  assert.throws(() => session.setAttribute("target", "fill", "blue"), {
    message: "multiple attribute handlers match: rect#target fill",
  });
  assert.equal(prepared, 0);
  assert.equal(Object.hasOwn(session.requireDocument().require("target").attributes(), "fill"), false);
});

test("attributes without a matching handler keep the existing shape validation path", () => {
  const session = new EditorSession(undefined, installHandlers([]));
  session.init();
  session.createShape("rect", "target", ["0", "0", "10", "10"]);
  session.setAttribute("target", "fill", "green");
  assert.equal(session.requireDocument().require("target").attributes().fill, "green");
  assert.throws(() => session.setAttribute("target", "label", "unknown"), {
    message: "unknown attribute: label",
  });
});
