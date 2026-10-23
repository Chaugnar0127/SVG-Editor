import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../../src/application/EditorSession.js";
import { Formatters } from "../../src/presentation/Formatters.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";

function scene(): EditorSession {
  const session = new EditorSession();
  session.init();
  session.createShape("g", "scene", []);
  for (const id of ["left", "right"]) {
    session.createShape("g", id, [], "scene");
    for (let i = 0; i < 4; i++) session.createShape("rect", `${id}${i}`, ["1", "2", "3", "4"], id);
  }
  return session;
}

test("cross-parent grouping preserves document order, object identity and exact positions over redo", () => {
  const session = scene();
  const document = session.requireDocument();
  const format = new Formatters();
  const before = format.tree(document);
  const ids = ["right3", "left2", "right0", "left0"];
  const objects = ids.map((id) => document.require(id));
  session.groupShapes("collected", ids);
  const group = document.requireContainer("collected");
  const grouped = format.tree(document);
  assert.equal(document.parentOf(group)?.id, "scene");
  assert.deepEqual(group.children().map((shape) => shape.id), ["left0", "left2", "right0", "right3"]);
  for (let i = 0; i < 3; i++) {
    session.undo();
    assert.equal(format.tree(document), before);
    assert.deepEqual(ids.map((id) => document.require(id)), objects);
    session.redo();
    assert.equal(format.tree(document), grouped);
    assert.strictEqual(document.require("collected"), group);
  }
});

test("same-parent grouping and ungroup occupy the original slot and keep explicit child styles", () => {
  const session = scene();
  const document = session.requireDocument();
  session.groupShapes("pair", ["left2", "left1"]);
  const left = document.requireContainer("left");
  const pair = document.requireContainer("pair");
  assert.deepEqual(left.children().map((shape) => shape.id), ["left0", "pair", "left3"]);
  session.setAttribute("pair", "fill", "green");
  session.setAttribute("pair", "stroke", "black");
  session.setAttribute("pair", "stroke-width", "2");
  session.setAttribute("left2", "fill", "red");
  const before = new Formatters().tree(document);
  session.ungroupShape("pair");
  assert.deepEqual(left.children().map((shape) => shape.id), ["left0", "left1", "left2", "left3"]);
  assert.equal(document.require("left1").attributes().fill, "green");
  assert.equal(document.require("left2").attributes().fill, "red");
  assert.equal(document.require("left1").attributes().stroke, "black");
  assert.equal(document.require("left1").attributes()["stroke-width"], 2);
  for (let i = 0; i < 3; i++) {
    session.undo();
    assert.strictEqual(document.require("pair"), pair);
    assert.equal(new Formatters().tree(document), before);
    assert.equal(Object.hasOwn(document.require("left1").attributes(), "fill"), false);
    session.redo();
    assert.equal(document.find("pair"), undefined);
  }
});

test("invalid group selections and top-level ungroup preserve the tree and redo", () => {
  const session = scene();
  const document = session.requireDocument();
  session.setAttribute("scene", "fill", "blue");
  session.undo();
  const before = new Formatters().tree(document);
  const cases = [
    { action: () => session.groupShapes("bad", ["left0", "left"]), message: "cannot group a container into its own descendant: left" },
    { action: () => session.groupShapes("bad", ["scene", "left0"]), message: "cannot group a container into its own descendant: scene" },
    { action: () => session.groupShapes("scene", ["left0"]), message: "id already exists: scene" },
    { action: () => session.groupShapes("bad", ["left0", "missing"]), message: "no such shape: missing" },
    { action: () => session.groupShapes("bad", ["left0", "left0"]), message: "group targets must be distinct" },
    { action: () => session.groupShapes("bad", []), message: "group requires at least one shape" },
    { action: () => session.ungroupShape("scene"), message: "cannot ungroup top-level container: scene" },
    { action: () => session.ungroupShape("left0"), message: "not a container: left0" },
  ];
  for (const { action, message } of cases) {
    assert.throws(action, { message });
    assert.equal(new Formatters().tree(document), before);
    session.redo();
    assert.equal(document.require("scene").attributes().fill, "blue");
    session.undo();
  }
});

test("empty nested groups dissolve and restore without moving siblings", () => {
  const session = scene();
  const document = session.requireDocument();
  session.createShape("g", "empty", [], "left");
  const group = document.require("empty");
  session.reorderShape("empty", "back");
  const before = new Formatters().tree(document);
  session.ungroupShape("empty");
  assert.equal(document.find("empty"), undefined);
  session.undo();
  assert.equal(new Formatters().tree(document), before);
  assert.strictEqual(document.require("empty"), group);
});

test("CLI grouping, transformations, deletion and ungroup each consume one history unit", () => {
  const session = scene();
  const registry = new CommandRegistry(session);
  const before = new Formatters().tree(session.requireDocument());
  for (const tokens of [["group", "pair", "left1", "left2"], ["move", "pair", "10", "20"],
    ["scale", "pair", "2"], ["delete", "pair"], ["undo"], ["ungroup", "pair"]]) registry.execute(tokens);
  for (let i = 0; i < 4; i++) registry.execute(["undo"]);
  assert.equal(new Formatters().tree(session.requireDocument()), before);
  for (let i = 0; i < 4; i++) registry.execute(["redo"]);
  assert.equal(session.requireDocument().find("pair"), undefined);
  assert.deepEqual(session.requireDocument().require("left1").attributes(), { x: 22, y: 44, width: 6, height: 8 });
});
