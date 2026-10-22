import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

function runCli(input: string): string[] {
  const result = spawnSync(process.execPath, [
    "--import", "tsx", fileURLToPath(new URL("../../src/main.ts", import.meta.url)),
  ], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    input,
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.ok(result.stdout.startsWith("svg-editor 0.1\nsvg> "));
  assert.ok(!result.stdout.includes("\u001b"), "piped output should not contain terminal escapes");
  return result.stdout.replaceAll("svg> ", "").trim().split(/\r?\n/u);
}

test("CLI runs document commands and continues after lookup, arity, numeric and quoting errors", () => {
  const output = runCli([
    "",
    '# comment with an unmatched "',
    "canvas",
    "init 400 300",
    "canvas",
    "canvas 640 480",
    "canvas 900 0",
    "canvas",
    "canvas 900",
    'init ""',
    'init "800',
    "unknown",
    "undo",
    "redo",
    "canvas",
    "quit",
    "",
  ].join("\n"));
  assert.deepEqual(output, [
    "svg-editor 0.1",
    "error: no document. use 'init' or 'read' first",
    "canvas 400x300 created",
    "canvas 400x300",
    "canvas 640x480",
    "error: canvas height must be a positive finite number",
    "canvas 640x480",
    "error: usage: canvas [<width> <height>]",
    "error: width must be a finite number",
    "error: unterminated quoted argument",
    "error: unknown command: unknown",
    "error: undo not allowed after io command",
    "error: undo not allowed after io command",
    "canvas 640x480",
  ]);
});

test("CLI handles EOF with a final unterminated line without requiring quit", () => {
  assert.deepEqual(runCli("init 200 100\ncanvas"), [
    "svg-editor 0.1", "canvas 200x100 created", "canvas 200x100",
  ]);
});

test("CLI rejects exit arguments and continues accepting commands", () => {
  assert.deepEqual(runCli("exit extra\nquit extra\ninit\ncanvas\nquit\n"), [
    "svg-editor 0.1",
    "error: usage: exit | quit",
    "error: usage: exit | quit",
    "canvas 800x600 created",
    "canvas 800x600",
  ]);
});

for (const name of ["exit", "quit"]) {
  test(`CLI stops executing buffered input after ${name}`, () => {
    assert.deepEqual(runCli(`init 400 300\n${name}\ninit 900 700\ncanvas\n`), [
      "svg-editor 0.1", "canvas 400x300 created",
    ]);
  });
}
