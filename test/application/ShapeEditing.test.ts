import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../../src/application/EditorSession.js";
import { ShapeFactory } from "../../src/application/ShapeFactory.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import { Tokenizer } from "../../src/cli/Tokenizer.js";

const cases = [
  { type: "circle", args: ["1", "-2", "3", "red"], scaled: { cx: 2, cy: -4, r: 6, fill: "red" }, moved: { cx: 6, cy: 5, r: 3, fill: "red" } },
  { type: "ellipse", args: ["1", "-2", "3", "4"], scaled: { cx: 2, cy: -4, rx: 6, ry: 8 }, moved: { cx: 6, cy: 5, rx: 3, ry: 4 } },
  { type: "line", args: ["1", "-2", "3", "4", "blue"], scaled: { x1: 2, y1: -4, x2: 6, y2: 8, stroke: "blue" }, moved: { x1: 6, y1: 5, x2: 8, y2: 11, stroke: "blue" } },
  { type: "text", args: ["1", "-2", "内容 & <标签>"], scaled: { x: 2, y: -4, text: "内容 & <标签>" }, moved: { x: 6, y: 5, text: "内容 & <标签>" } },
] as const;

for (const { type, args, scaled, moved } of cases) {
  test(`${type} moves and scales with exact undo and unchanged style/content`, () => {
    const session = new EditorSession();
    session.init();
    session.createShape(type, "a", args);
    const shape = session.requireDocument().require("a");
    const original = shape.attributes();
    session.moveShape("a", 5, 7);
    assert.deepEqual(shape.attributes(), moved);
    session.undo();
    session.scaleShape("a", 2);
    assert.deepEqual(shape.attributes(), scaled);
    session.undo();
    assert.deepEqual(shape.attributes(), original);
    session.redo();
    assert.deepEqual(shape.attributes(), scaled);
    session.undo();
    session.moveShape("a", 1e16, 1e16);
    session.undo();
    assert.deepEqual(shape.attributes(), original);
  });
}

test("set validates per-shape attributes and restores absence of style through mixed history", () => {
  const session = new EditorSession();
  session.init();
  session.createShape("g", "scene", []);
  for (const { type, args } of cases) session.createShape(type, type, args, "scene");
  session.setAttribute("scene", "fill", "green");
  session.setAttribute("line", "stroke-width", "0");
  session.setAttribute("text", "text", "");
  session.setAttribute("circle", "r", "0.125");
  session.scaleShape("scene", 0.5);
  const document = session.requireDocument();
  assert.equal(document.require("circle").attributes().r, 0.0625);
  assert.equal(document.require("line").attributes()["stroke-width"], 0);
  session.undo();
  session.undo();
  assert.equal(document.require("circle").attributes().r, 3);
  session.undo();
  assert.equal(document.require("text").attributes().text, "内容 & <标签>");
  session.undo();
  assert.equal(Object.hasOwn(document.require("line").attributes(), "stroke-width"), false);
  session.undo();
  assert.deepEqual(document.require("scene").attributes(), {});
  session.redo();
  assert.equal(document.require("scene").attributes().fill, "green");
});

test("invalid attributes and late-child overflow preserve document and redo branch", () => {
  const session = new EditorSession();
  session.init();
  session.createShape("g", "scene", []);
  session.createShape("text", "first", ["1", "2", "ok"], "scene");
  session.createShape("circle", "last", ["1", "2", "1e308"], "scene");
  session.setAttribute("first", "fill", "blue");
  session.undo();
  const document = session.requireDocument();
  const before = document.require("first").attributes();
  for (const action of [
    () => session.scaleShape("scene", 2),
    () => session.scaleShape("scene", 0),
    () => session.setAttribute("last", "r", "-1"),
    () => session.setAttribute("last", "r", "1e309"),
    () => session.setAttribute("last", "r", ""),
    () => session.setAttribute("scene", "x", "1"),
    () => session.setAttribute("first", "r", "1"),
    () => session.setAttribute("last", "id", "new"),
    () => session.setAttribute("last", "stroke-width", "-1"),
    () => session.setAttribute("last", "fill", ""),
  ]) {
    assert.throws(action, RangeError);
    assert.deepEqual(document.require("first").attributes(), before);
    session.redo();
    assert.equal(document.require("first").attributes().fill, "blue");
    session.undo();
  }
});

test("all numeric fields enforce finite values and positive radii during creation", () => {
  const factory = new ShapeFactory();
  for (const { type, args } of cases) {
    const count = type === "text" ? 2 : type === "circle" ? 3 : 4;
    for (let i = 0; i < count; i++) {
      for (const invalid of ["", "Infinity", "NaN", "10px"]) {
        const parameters: string[] = [...args];
        parameters[i] = invalid;
        assert.throws(() => factory.create(type, "a", parameters), RangeError);
      }
    }
  }
  assert.throws(() => factory.create("circle", "a", ["0", "0", "0"]));
  assert.throws(() => factory.create("ellipse", "a", ["0", "0", "1", "-1"]));
});

test("CLI accepts text equal to in and routes scale/set without treating text as a clause", () => {
  const session = new EditorSession();
  const registry = new CommandRegistry(session);
  const tokenizer = new Tokenizer();
  for (const line of ['init', 'create g scene', 'create text t 1 2 "in"',
    'create text nested 3 4 "in" in scene', 'set t text "two words"', 'scale scene 2']) {
    registry.execute(tokenizer.tokenize(line));
  }
  assert.equal(session.requireDocument().require("t").attributes().text, "two words");
  assert.deepEqual(session.requireDocument().require("nested").attributes(), { x: 6, y: 8, text: "in" });
});
