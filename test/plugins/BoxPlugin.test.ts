import assert from "node:assert/strict";
import test from "node:test";
import type { DocumentStore } from "../../src/application/DocumentStore.js";
import { ExtensionRegistry } from "../../src/application/extensions/ExtensionRegistry.js";
import { EditorSession } from "../../src/application/EditorSession.js";
import { ShapeFactory } from "../../src/application/ShapeFactory.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import { Formatters } from "../../src/presentation/Formatters.js";
import boxPlugin from "../../src/plugins/box/BoxPlugin.js";
import { SvgCodec } from "../../src/infrastructure/SvgCodec.js";

test("box is an atomic composite container with reversible fill and label attributes", () => {
  const extensions = new ExtensionRegistry();
  assert.deepEqual(extensions.install(boxPlugin), { success: true });
  const session = new EditorSession(undefined, extensions);
  const commands = new CommandRegistry(session, extensions);
  session.init();
  assert.deepEqual(commands.execute(["create", "box", "n1", "120", "100", "160", "60", "Start"]), {
    kind: "message", text: "box#n1 created",
  });
  const box = session.requireDocument().require("n1");
  assert.equal(box.type, "box");
  assert.deepEqual(box.children().map(({ id }) => id), ["n1-rect", "n1-label"]);
  assert.throws(() => session.createShape("box", "n1", ["0", "0", "10", "10", "duplicate"]), {
    message: "id already exists: n1",
  });
  session.createShape("rect", "n2-rect", ["0", "0", "10", "10"]);
  assert.throws(() => session.createShape("box", "n2", ["0", "0", "10", "10", "conflict"]), {
    message: "id already exists: n2-rect",
  });
  assert.equal(session.requireDocument().elementCount, 4);

  commands.execute(["set", "n1", "fill", "#f5a623"]);
  assert.equal(box.children()[0]!.attributes().fill, "#f5a623");
  commands.execute(["undo"]);
  assert.equal(Object.hasOwn(box.children()[0]!.attributes(), "fill"), false);
  commands.execute(["redo"]);
  assert.equal(box.children()[0]!.attributes().fill, "#f5a623");

  commands.execute(["set", "n1", "label", "Processing v2"]);
  assert.equal(box.children()[1]!.attributes().text, "Processing v2");
  commands.execute(["undo"]);
  assert.equal(box.children()[1]!.attributes().text, "Start");
  commands.execute(["redo"]);
  assert.equal(box.children()[1]!.attributes().text, "Processing v2");

  assert.throws(() => session.ungroupShape("n1"), { message: "cannot ungroup protected container: n1" });
  assert.throws(() => session.deleteShape("n1-rect"), { message: "cannot modify required child: n1-rect" });
  assert.throws(() => session.addTo("n1", "n1-label"), { message: "cannot modify required child: n1-label" });
  assert.throws(() => session.moveShape("n1-rect", 1, 0), { message: "cannot modify required child: n1-rect" });
  assert.throws(() => session.setAttribute("n1-rect", "fill", "red"), {
    message: "cannot modify required child: n1-rect",
  });
  assert.match(new Formatters().tree(session.requireDocument(), undefined, extensions.treeDecorators()), /box#n1 \(box\)/u);
});

test("box moves as a nested composite and serializes with a marker that controls readback", () => {
  const extensions = new ExtensionRegistry();
  assert.deepEqual(extensions.install(boxPlugin), { success: true });
  const session = new EditorSession(undefined, extensions);
  session.init();
  session.createShape("g", "scene", []);
  session.createShape("box", "nested", ["1", "2", "30", "20", "Label"], "scene");
  session.moveShape("nested", 10, 5);
  const box = session.requireDocument().require("nested");
  assert.equal(box.children()[0]!.attributes().x, 11);
  assert.equal(box.children()[1]!.attributes().x, 31);

  const codec = new SvgCodec(new ShapeFactory(extensions));
  const source = codec.encode(session.requireDocument());
  assert.match(source, /<g id="nested" data-kind="box">/u);
  const loaded = codec.decode(source).document;
  assert.equal(loaded.require("nested").type, "box");
  assert.equal(loaded.require("nested-label").attributes().text, "Label");

  const plainCodec = new SvgCodec();
  const downgraded = plainCodec.decode(source).document.require("nested");
  assert.equal(downgraded.type, "g");
  assert.deepEqual(downgraded.children().map(({ id }) => id), ["nested-rect", "nested-label"]);
});

test("malformed box input rejects the read without replacing the active document", () => {
  const extensions = new ExtensionRegistry();
  assert.deepEqual(extensions.install(boxPlugin), { success: true });
  const malformed = '<svg xmlns="http://www.w3.org/2000/svg"><g id="broken" data-kind="box"><rect id="broken-rect" x="0" y="0" width="10" height="10" /></g></svg>';
  const codec = new SvgCodec(new ShapeFactory(extensions));
  const store: DocumentStore = {
    read: () => codec.decode(malformed),
    write: () => {},
  };
  const session = new EditorSession(store, extensions);
  session.init();
  session.createShape("rect", "retained", ["0", "0", "10", "10"]);
  const activeDocument = session.requireDocument();

  assert.throws(() => session.read("malformed.svg"), {
    message: "invalid box structure: missing required children for broken",
  });
  assert.strictEqual(session.requireDocument(), activeDocument);
  assert.ok(session.requireDocument().find("retained"));

  const duplicateIds = '<svg xmlns="http://www.w3.org/2000/svg"><g id="box" data-kind="box"><rect id="box-rect" x="0" y="0" width="10" height="10" /><text id="box-rect" x="0" y="0">bad</text></g></svg>';
  assert.throws(() => new SvgCodec(new ShapeFactory(extensions)).decode(duplicateIds), {
    message: "id already exists: box-rect",
  });
});
