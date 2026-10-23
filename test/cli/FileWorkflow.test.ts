import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SvgCodec } from "../../src/infrastructure/SvgCodec.js";

test("lab transcript runs through real CLI, saves browser SVG and reads missing IDs", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-cli-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, "other.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>
    <text id="t1" x="10" y="290">imported</text><circle id="c1" cx="50" cy="50" r="10"/>
    <g id="g1"><rect id="r2" x="0" y="0" width="10" height="10"/><circle id="c2" cx="5" cy="5" r="2"/></g>
    <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/></svg>`);
  const input = [
    "help", "init 800 600", "create rect bg 0 0 800 600 #ffffff", 'create text title 20 40 "My Diagram"',
    "create circle c1 100 100 20 red", "create rect box 200 80 60 60 #3366ff", "group markers c1 box",
    "tree", "move c1 30 0", "undo", "redo", 'set title text "My Diagram v2"', "undo",
    "group bad c1 markers", "delete box", "undo", 'save "demo with spaces.svg"', "undo",
    "read other.svg", "tree", "scale g1 2", "save", "redo", "read missing.svg", "show c2", "quit", "init 1 1", "",
  ].join("\n");
  const result = spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), fileURLToPath(new URL("../../src/main.ts", import.meta.url))], {
    cwd: directory, input, encoding: "utf8", timeout: 10_000, windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const output = result.stdout.replaceAll("svg> ", "");
  assert.match(output, /g#markers created with 2 children/u);
  assert.match(output, /error: cannot group a container into its own descendant: markers/u);
  assert.match(output, /saved to demo with spaces.svg \(5 elements\)/u);
  assert.match(output, /warning: assigned id rect1 to unnamed <rect>\nread other.svg \(7 elements\)/u);
  assert.match(output, /saved to other.svg \(7 elements\)/u);
  assert.match(output, /error: cannot read file: missing.svg/u);
  assert.equal(output.match(/error: undo not allowed after io command/gu)?.length, 2);
  assert.doesNotMatch(output, /canvas 1x1/u);
  const codec = new SvgCodec();
  const saved = codec.decode(readFileSync(join(directory, "demo with spaces.svg"), "utf8")).document;
  assert.equal(saved.require("title").attributes().text, "My Diagram");
  assert.equal(saved.require("c1").attributes().cx, 130);
  assert.equal(saved.parentOf(saved.require("box"))?.id, "markers");
  const updated = codec.decode(readFileSync(join(directory, "other.svg"), "utf8")).document;
  assert.equal(updated.require("c2").attributes().r, 4);
});
