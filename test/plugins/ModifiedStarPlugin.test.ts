import assert from "node:assert/strict";
import test from "node:test";
import type { DocumentStore } from "../../src/application/DocumentStore.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import type { SvgDocument } from "../../src/domain/document/SvgDocument.js";
import modifiedStarPlugin from "../../src/plugins/tree/ModifiedStarPlugin.js";
import boxPlugin from "../../src/plugins/box/BoxPlugin.js";
import { createTestExtensions, createTestSession } from "../support/plugins.js";

const store: DocumentStore = {
  read: () => { throw new Error("not used"); },
  write: (_path: string, _document: SvgDocument) => {},
};

test("dirty ignores attribute insertion order but preserves values and child order", () => {
  const extensions = createTestExtensions([modifiedStarPlugin]);
  const session = createTestSession(store, extensions);
  const commands = new CommandRegistry(session, extensions);
  const tree = (): string => {
    const result = commands.execute(["tree"]);
    assert.ok(result?.kind === "message");
    return result.text;
  };
  session.init();
  session.createShape("rect", "r", ["0", "0", "10", "10"]);
  session.setAttribute("r", "fill", "red");
  session.setAttribute("r", "stroke", "blue");
  session.save("same.svg");
  session.deleteShape("r");
  session.createShape("rect", "r", ["0", "0", "10", "10"]);
  session.setAttribute("r", "stroke", "blue");
  session.setAttribute("r", "fill", "red");
  assert.doesNotMatch(tree(), /\*/u);
  session.setAttribute("r", "fill", "green");
  assert.match(tree(), /fill=green \*/u);
  session.undo();
  assert.doesNotMatch(tree(), /\*/u);

  session.createShape("g", "group", []);
  session.createShape("rect", "a", ["0", "0", "1", "1"], "group");
  session.createShape("rect", "b", ["0", "0", "1", "1"], "group");
  session.save("ordered.svg");
  session.reorderShape("a", "front");
  assert.match(tree(), /g#group \*/u);
  session.undo();
  assert.doesNotMatch(tree(), /\*/u);
});

test("box tree label composes with modified-star and follows save and undo", () => {
  const extensions = createTestExtensions([modifiedStarPlugin, boxPlugin]);
  const session = createTestSession(store, extensions);
  const commands = new CommandRegistry(session, extensions);
  session.init();
  session.createShape("box", "n1", ["120", "100", "160", "60", "Start"]);
  const tree = () => commands.execute(["tree", "n1"]);
  const dirty = tree();
  assert.ok(dirty?.kind === "message");
  assert.equal(dirty.text.split("\n")[0], "g#n1 * (box)");
  session.save("box.svg");
  const clean = tree();
  assert.ok(clean?.kind === "message");
  assert.equal(clean.text.split("\n")[0], "g#n1 (box)");
  session.setAttribute("n1", "label", "Changed");
  session.undo();
  assert.deepEqual(tree(), clean);
});

test("modified-star marks new nodes, compares subtrees to save point, and clears after undo", () => {
  const extensions = createTestExtensions([modifiedStarPlugin]);
  const session = createTestSession(store, extensions);
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

  session.undo();
  session.createShape("rect", "new-leaf", ["5", "6", "7", "8"], "scene");
  const insertedTree = commands.execute(["tree"]);
  assert.ok(insertedTree?.kind === "message");
  assert.match(insertedTree.text, /svg \(800x600\) \*/u);
  assert.match(insertedTree.text, /g#scene \*/u);
  assert.match(insertedTree.text, /rect#new-leaf.*\*/u);

  session.undo();
  const restoredTree = commands.execute(["tree"]);
  assert.ok(restoredTree?.kind === "message");
  assert.equal(restoredTree.text, cleanTree.text);
});
