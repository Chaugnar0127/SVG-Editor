import assert from "node:assert/strict";
import test from "node:test";
import { parseSvgOutline } from "../../vscode-extension/src/svgOutline.js";

test("SVG outline preserves nested elements, labels and source locations", () => {
  const nodes = parseSvgOutline([
    "<?xml version=\"1.0\"?>",
    "<svg xmlns=\"http://www.w3.org/2000/svg\" id=\"root\">",
    "  <g id=\"scene\"><rect id=\"start\" width=\"20 > 10\"/></g>",
    "  <text>label</text>",
    "</svg>",
  ].join("\n"));

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]?.label, "svg#root");
  assert.deepEqual(nodes[0]?.range.start, { line: 1, character: 0 });
  assert.deepEqual(nodes[0]?.range.end, { line: 1, character: 50 });
  assert.equal(nodes[0]?.children[0]?.label, "g#scene");
  assert.equal(nodes[0]?.children[0]?.children[0]?.label, "rect#start");
  assert.deepEqual(nodes[0]?.children[0]?.children[0]?.range.start, { line: 2, character: 16 });
  assert.equal(nodes[0]?.children[1]?.label, "text");
});

test("outline refreshes from edited text and clears for incomplete XML", () => {
  const before = parseSvgOutline("<svg><g id=\"old\"/></svg>");
  const after = parseSvgOutline("<svg><g id=\"new\"/><rect id=\"added\"/></svg>");

  assert.equal(before[0]?.children[0]?.label, "g#old");
  assert.deepEqual(after[0]?.children.map(({ label }) => label), ["g#new", "rect#added"]);
  assert.deepEqual(parseSvgOutline("<svg><g id=\"broken\"></svg>"), []);
  assert.deepEqual(parseSvgOutline("<html><body/></html>"), []);
});
