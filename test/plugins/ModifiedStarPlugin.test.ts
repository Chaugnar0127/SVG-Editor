import assert from "node:assert/strict";
import test from "node:test";
import type { DocumentStore } from "../../src/application/DocumentStore.js";
import { ExtensionRegistry } from "../../src/application/extensions/ExtensionRegistry.js";
import { EditorSession } from "../../src/application/EditorSession.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import type { SvgDocument } from "../../src/domain/document/SvgDocument.js";
import modifiedStarPlugin from "../../src/plugins/tree/ModifiedStarPlugin.js";

const store: DocumentStore = {
  read: () => { throw new Error("not used"); },
  write: (_path: string, _document: SvgDocument) => {},
};

test("modified-star marks new nodes, compares subtrees to save point, and clears after undo", () => {
  const extensions = new ExtensionRegistry();
  assert.deepEqual(extensions.install(modifiedStarPlugin), { success: true });
  const session = new EditorSession(store, extensions);
  const commands = new CommandRegistry(session, extensions);
  session.init();
  const cleanEmptyTree = commands.execute(["tree"]);
  assert.ok(cleanEmptyTree?.kind === "message");
  assert.equal(cleanEmptyTree.text, "svg (800x600)");

  session.createShape("g", "scene", []);
  session.createShape("rect", "leaf", ["0", "0", "10", "10"], "scene");
  const initialDirtyTree = commands.execute(["tree"]);
  assert.ok(initialDirtyTree?.kind === "message");
  assert.equal(initialDirtyTree.text, [
    "svg (800x600) *",
    "└── g#scene *",
    "    └── rect#leaf  x=0 y=0 w=10 h=10 *",
  ].join("\n"));

  session.save("scene.svg");
  const cleanTree = commands.execute(["tree"]);
  assert.ok(cleanTree?.kind === "message");
  assert.equal(cleanTree.text.includes(" *"), false);

  session.setAttribute("leaf", "fill", "red");
  const editedTree = commands.execute(["tree"]);
  assert.ok(editedTree?.kind === "message");
  assert.match(editedTree.text, /svg \(800x600\) \*/u);
  assert.match(editedTree.text, /g#scene \*/u);
  assert.match(editedTree.text, /rect#leaf.*fill=red \*/u);

  session.undo();
  const undoneTree = commands.execute(["tree"]);
  assert.ok(undoneTree?.kind === "message");
  assert.equal(undoneTree.text, cleanTree.text);
  session.redo();
  const redoneTree = commands.execute(["tree"]);
  assert.ok(redoneTree?.kind === "message");
  assert.equal(redoneTree.text, editedTree.text);
});
