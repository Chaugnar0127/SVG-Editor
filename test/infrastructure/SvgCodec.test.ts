import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../../src/application/EditorSession.js";
import { SvgCodec } from "../../src/infrastructure/SvgCodec.js";
import { Formatters } from "../../src/presentation/Formatters.js";

const codec = new SvgCodec();
const wrap = (body: string, extra = ""): string => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" ${extra}>${body}</svg>`;

test("SVG round trip preserves six types, nesting, order, styles, text and custom viewBox", () => {
  const xml = wrap(`
    <rect id="bg" width="400" height="300" fill="#fff"/>
    <g id="scene" fill="red" stroke="black" stroke-width="0.5">
      <circle id="c" cx="5" cy="6" r="7"/>
      <ellipse id="e" cx="1" cy="2" rx="3" ry="4"/>
      <line id="l" x1="10" y1="20" x2="30" y2="40"/>
      <text id="t" x="1" y="2"><![CDATA[开始 < & " ]]>&#13;&#10;结束</text>
      <g id="empty"/>
    </g>`, 'viewBox="-10 -20 800 600"');
  const first = codec.decode(xml);
  assert.deepEqual(first.warnings, []);
  assert.equal(first.document.elementCount, 7);
  const encoded = codec.encode(first.document);
  assert.match(encoded, /xmlns="http:\/\/www.w3.org\/2000\/svg"/u);
  assert.match(encoded, /&lt; &amp;/u);
  assert.doesNotMatch(encoded, / text="/u);
  const second = codec.decode(encoded);
  assert.deepEqual(second.document.viewBox, [-10, -20, 800, 600]);
  assert.equal(new Formatters().tree(second.document), new Formatters().tree(first.document));
});

test("ID assignment reserves all explicit IDs including later and nested elements", () => {
  const result = codec.decode(wrap('<rect width="1" height="2"/><g><rect id="rect1" width="3" height="4"/><circle r="2"/></g>'));
  assert.deepEqual(result.warnings, [
    "warning: assigned id rect2 to unnamed <rect>",
    "warning: assigned id g1 to unnamed <g>",
    "warning: assigned id circle1 to unnamed <circle>",
  ]);
  assert.deepEqual(result.document.topLevel().map((shape) => shape.id), ["rect2", "g1"]);
  assert.ok(result.document.find("rect1"));
});

test("prefixed SVG namespace, fractional px lengths and missing coordinates are supported", () => {
  const { document } = codec.decode('<s:svg xmlns:s="http://www.w3.org/2000/svg" viewBox="0,0,320,240"><s:circle id="c" r="2.5px"/><s:text id="t"/></s:svg>');
  assert.equal(document.width, 320);
  assert.equal(document.height, 240);
  assert.deepEqual(document.require("c").attributes(), { cx: 0, cy: 0, r: 2.5 });
  assert.deepEqual(document.require("t").attributes(), { x: 0, y: 0, text: "" });
});

test("malformed or unsupported SVG is rejected instead of producing a partial document", () => {
  const invalid = [
    "", "<svg/>", '<svg xmlns="other"/>', '<svg xmlns="http://www.w3.org/2000/svg"><g></svg>',
    wrap('<g id="a"/><g id="a"/>'), wrap('<g id=""/>'), wrap('<g id="two words"/>'),
    wrap('<circle r="-1"/>'), wrap('<rect width="1"/>'), wrap('<rect width="0x10" height="2"/>'),
    wrap('<circle r="1" id="a" id="b"/>'), wrap('<g id="g" fill=red/>'),
    wrap('<text id="t">&unknown;</text>'), wrap('<text id="t">&#0;</text>'),
    wrap('<rect width="1" height="2"><circle r="1"/></rect>'),
    wrap('<text id="t"><tspan>nested</tspan></text>'), wrap('<g>stray</g>'),
    wrap('<path id="p" d="M0 0"/>'), wrap('<g transform="rotate(30)"/>'),
    wrap('<g style="fill:red"/>'), wrap('<foreign:g xmlns:foreign="other"/>'),
    wrap('<g onclick="alert(1)"/>'), wrap('<text text="content"/>'),
    wrap('', 'viewBox="0 0 0 10"'), wrap('', 'width="1"'),
    `<!DOCTYPE svg [<!ENTITY custom "injected">]>${wrap('<text>&custom;</text>')}`,
    `${wrap("")}<other/>`, `<?xml-stylesheet href="external.css"?>${wrap("")}`,
  ];
  for (const xml of invalid) assert.throws(() => codec.decode(xml), Error, xml);
});

test("encoding escapes text and IDs without adding elements, and rejects invalid XML characters", () => {
  const session = new EditorSession();
  session.init();
  session.createShape("text", 'a&"<>', ["0", "1", '</text><g id="injected"/> & 中文']);
  const copy = codec.decode(codec.encode(session.requireDocument())).document;
  assert.equal(copy.elementCount, 1);
  assert.equal(copy.require('a&"<>').attributes().text, '</text><g id="injected"/> & 中文');
  session.setAttribute('a&"<>', "text", "bad\u0000character");
  assert.throws(() => codec.encode(session.requireDocument()), /forbidden in XML/u);
});
