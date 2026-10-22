import assert from "node:assert/strict";
import test from "node:test";
import { Tokenizer } from "../../src/cli/Tokenizer.js";

test("tokenizer ignores blank lines and whole-line comments before interpreting quotes", () => {
  const tokenizer = new Tokenizer();
  for (const line of ["", " \t ", "# comment", '  # an unmatched " quote']) {
    assert.deepEqual(tokenizer.tokenize(line), []);
  }
});

test("tokenizer separates unquoted whitespace and preserves quoted spaces and Unicode", () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize(' \tcreate text title 20\t40 "开始 SVG"  '), [
    "create", "text", "title", "20", "40", "开始 SVG",
  ]);
  assert.deepEqual(tokenizer.tokenize('create text t 0 0 "  a\tb  "'), [
    "create", "text", "t", "0", "0", "  a\tb  ",
  ]);
});

test("tokenizer preserves empty arguments and joins adjacent quoted and unquoted segments", () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize('init "" ""'), ["init", "", ""]);
  assert.deepEqual(tokenizer.tokenize('show prefix" with space"suffix'), [
    "show", "prefix with spacesuffix",
  ]);
  assert.deepEqual(tokenizer.tokenize('""'), [""]);
});

test("tokenizer preserves color hashes and treats only a leading unquoted hash as a comment", () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize("create rect r 0 0 10 10 #ffffff in scene"), [
    "create", "rect", "r", "0", "0", "10", "10", "#ffffff", "in", "scene",
  ]);
  assert.deepEqual(tokenizer.tokenize('show "#node"'), ["show", "#node"]);
  assert.deepEqual(tokenizer.tokenize("canvas # trailing"), ["canvas", "#", "trailing"]);
});

test("tokenizer preserves literal backslashes in Windows paths", () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize(String.raw`read "C:\My Files\drawing.svg"`), [
    "read", String.raw`C:\My Files\drawing.svg`,
  ]);
});

test("tokenizer rejects unclosed quotes and retains no state between calls", () => {
  const tokenizer = new Tokenizer();
  for (const line of ['init "800', '"', 'canvas 400 "300']) {
    assert.throws(() => tokenizer.tokenize(line), {
      name: "SyntaxError", message: "unterminated quoted argument",
    });
    assert.deepEqual(tokenizer.tokenize("canvas"), ["canvas"]);
  }
  const previous = tokenizer.tokenize("init 400 300");
  previous.length = 0;
  assert.deepEqual(tokenizer.tokenize("init 400 300"), ["init", "400", "300"]);
});
