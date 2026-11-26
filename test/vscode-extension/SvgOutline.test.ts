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
  assert.deepEqual(nodes[0]?.range.end, { line: 4, character: 6 });
  assert.deepEqual(nodes[0]?.selectionRange.end, { line: 1, character: 50 });
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

test("full ranges include nested closing tags and skip markup inside comments and CDATA", () => {
  const lines = [
    '<svg xmlns:s="http://www.w3.org/2000/svg">',
    '  <g id="outer" data-note="quoted > character">',
    '    <!-- </g><g> -->',
    '    <g id="inner"><s:rect id="r" /></g>',
    '    <text><![CDATA[</g><svg>]]></text>',
    '    <?note pretend="</g>"?>',
    '  </g>',
    '</svg>',
  ];
  for (const newline of ["\n", "\r\n", "\r"]) {
    const [root] = parseSvgOutline(lines.join(newline));
    assert.ok(root);
    assert.deepEqual(root.range.end, { line: 7, character: 6 });
    assert.deepEqual(root.selectionRange.end, { line: 0, character: lines[0]!.length });
    const outer = root.children[0]!;
    assert.deepEqual(outer.range.end, { line: 6, character: 6 });
    assert.deepEqual(outer.selectionRange.end, { line: 1, character: lines[1]!.length });
    const inner = outer.children[0]!;
    assert.deepEqual(inner.range.end, { line: 3, character: lines[3]!.length });
    assert.deepEqual(inner.children[0]!.range, inner.children[0]!.selectionRange);
    assert.deepEqual(outer.children[1]!.range.end, { line: 4, character: lines[4]!.length });
  }
});

test("outline ranges refresh after multiline edits and handle multiline opening tags", () => {
  const before = parseSvgOutline('<svg><g id="scene"/></svg>');
  assert.deepEqual(before[0]?.range.end, { line: 0, character: 26 });
  const after = parseSvgOutline('<svg>\n<g\n id="scene">\n<rect/>\n</g>\n</svg>');
  assert.deepEqual(after[0]?.range.end, { line: 5, character: 6 });
  assert.deepEqual(after[0]?.children[0]?.range.end, { line: 4, character: 4 });
  assert.deepEqual(after[0]?.children[0]?.selectionRange.end, { line: 2, character: 12 });
  assert.deepEqual(parseSvgOutline('<svg>\n<g id="scene">'), []);
});
