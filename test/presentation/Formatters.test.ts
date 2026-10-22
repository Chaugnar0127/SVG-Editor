import assert from "node:assert/strict";
import test from "node:test";
import { SvgDocument } from "../../src/domain/document/SvgDocument.js";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";
import type { Shape } from "../../src/domain/shape/Shape.js";
import { Formatters } from "../../src/presentation/Formatters.js";

function scene() {
  const document = new SvgDocument(400, 300);
  const outer = new GroupShape("outer");
  const inner = new GroupShape("inner");
  const a = new RectShape("a", -1.5, 2, 3, 4, "red");
  const b = new RectShape("b", 5, 6, 7, 8);
  const tail = new RectShape("tail", 9, 10, 11, 12, "none");
  const empty = new GroupShape("empty");
  inner.add(a);
  outer.add(inner);
  outer.add(b);
  document.add(outer);
  document.add(tail);
  document.add(empty);
  return { document, outer, inner, a, b, tail, empty, formatters: new Formatters() };
}

test("tree renders empty documents, nested branches, subtrees and leaves without trailing whitespace", () => {
  const { document, formatters } = scene();
  assert.equal(formatters.tree(new SvgDocument(320.5, 240.25)), "svg (320.5x240.25)");
  const output = formatters.tree(document);
  assert.equal(output, [
    "svg (400x300)",
    "├── g#outer",
    "│   ├── g#inner",
    "│   │   └── rect#a  x=-1.5 y=2 w=3 h=4 fill=red",
    "│   └── rect#b  x=5 y=6 w=7 h=8",
    "├── rect#tail  x=9 y=10 w=11 h=12 fill=none",
    "└── g#empty",
  ].join("\n"));
  assert.equal(formatters.tree(document, "outer"), [
    "g#outer",
    "├── g#inner",
    "│   └── rect#a  x=-1.5 y=2 w=3 h=4 fill=red",
    "└── rect#b  x=5 y=6 w=7 h=8",
  ].join("\n"));
  assert.equal(formatters.tree(document, "a"), "rect#a  x=-1.5 y=2 w=3 h=4 fill=red");
  assert.equal(formatters.tree(document, "empty"), "g#empty");
  for (const line of output.split("\n")) assert.equal(line.trimEnd(), line);
});

test("show reports the direct parent and full attribute names without inventing an omitted fill", () => {
  const { document, formatters } = scene();
  assert.equal(formatters.show(document, "a"), [
    "rect#a  parent=g#inner", "  x=-1.5", "  y=2", "  width=3", "  height=4", "  fill=red",
  ].join("\n"));
  assert.equal(formatters.show(document, "b"), [
    "rect#b  parent=g#outer", "  x=5", "  y=6", "  width=7", "  height=8",
  ].join("\n"));
  assert.equal(formatters.show(document, "outer"), "g#outer  parent=svg");
  assert.equal(formatters.show(document, "inner"), "g#inner  parent=g#outer");
  assert.equal(formatters.show(document, "empty"), "g#empty  parent=svg");
});

test("formatters reflect current geometry, parent, order and canvas size without caching or mutating them", () => {
  const { document, outer, inner, a, b, tail, empty, formatters } = scene();
  const originalTree = formatters.tree(document);
  const originalAttributes = a.attributes();
  for (let repeat = 0; repeat < 2; repeat++) {
    formatters.show(document, "a");
    assert.equal(formatters.tree(document), originalTree);
  }
  assert.deepEqual(document.topLevel(), [outer, tail, empty]);
  assert.deepEqual(outer.children(), [inner, b]);
  assert.deepEqual(inner.children(), [a]);
  assert.deepEqual(a.attributes(), originalAttributes);
  document.bringToFront(inner);
  assert.equal(formatters.tree(document, "outer"), [
    "g#outer",
    "├── rect#b  x=5 y=6 w=7 h=8",
    "└── g#inner",
    "    └── rect#a  x=-1.5 y=2 w=3 h=4 fill=red",
  ].join("\n"));
  document.moveTo(a, empty);
  a.move(2, -1);
  assert.equal(formatters.show(document, "a"), [
    "rect#a  parent=g#empty", "  x=0.5", "  y=1", "  width=3", "  height=4", "  fill=red",
  ].join("\n"));
  assert.equal(formatters.tree(document, "inner"), "g#inner");
  document.resize(800, 600);
  assert.equal(formatters.tree(document).split("\n")[0], "svg (800x600)");
  assert.strictEqual(document.require("a"), a);
});

test("formatters escape whitespace, quotes and backslashes and consume any Shape implementation", () => {
  const document = new SvgDocument();
  const custom: Shape = {
    id: "custom",
    type: "test-only",
    attributes: () => Object.freeze({
      count: 2, plain: "red", spaced: "rgb(10 20 30)",
      quote: 'a"b', slash: "a\\b", newline: "a\nb", empty: "",
    }),
    children: () => [],
    move: () => { throw new Error("display must not move a shape"); },
    scale: () => { throw new Error("display must not scale a shape"); },
  };
  document.add(custom);
  const pairs = [
    "count=2", "plain=red", 'spaced="rgb(10 20 30)"',
    'quote="a\\"b"', 'slash="a\\\\b"', 'newline="a\\nb"', 'empty=""',
  ];
  const formatters = new Formatters();
  assert.equal(formatters.tree(document, "custom"), `test-only#custom  ${pairs.join(" ")}`);
  assert.equal(formatters.show(document, "custom"), [
    "test-only#custom  parent=svg", ...pairs.map((pair) => `  ${pair}`),
  ].join("\n"));
});

test("unknown, empty and differently cased display IDs fail without changing the document", () => {
  const { document, formatters } = scene();
  const before = formatters.tree(document);
  for (const id of ["missing", "", "Outer"]) {
    for (const query of [() => formatters.tree(document, id), () => formatters.show(document, id)]) {
      assert.throws(query, { name: "RangeError", message: `no such shape: ${id}` });
      assert.equal(formatters.tree(document), before);
    }
  }
});
