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

test("CLI moves a group atomically, shows current geometry and restores one-step history", () => {
  assert.deepEqual(runCli([
    "init",
    "create g scene",
    "create rect a 1 2 3 4 in scene",
    "create rect b 1e308 0 3 4 in scene",
    "move scene 5 -3",
    "show a",
    "undo",
    "move scene 1e308 0",
    "show a",
    "redo",
    "show a",
    "quit",
    "",
  ].join("\n")), [
    "svg-editor 0.1",
    "canvas 800x600 created",
    "g#scene created",
    "rect#a created in g#scene",
    "rect#b created in g#scene",
    "shape scene moved by (5,-3)",
    "rect#a  parent=g#scene",
    "  x=6", "  y=-1", "  width=3", "  height=4",
    "undo complete",
    "error: moved rectangle coordinates must remain finite",
    "rect#a  parent=g#scene",
    "  x=1", "  y=2", "  width=3", "  height=4",
    "redo complete",
    "rect#a  parent=g#scene",
    "  x=6", "  y=-1", "  width=3", "  height=4",
  ]);
});

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

test("CLI creates and deletes subtrees while preserving redo after a rejected creation", () => {
  assert.deepEqual(runCli([
    "init 400 300",
    "create g scene",
    "create rect r1 10 20 100 50 red in scene",
    "delete scene",
    "undo",
    "create rect r1 0 0 10 10",
    "redo",
    "delete r1",
    "undo",
    "delete r1",
    "redo",
    "quit",
    "create g ignored",
    "",
  ].join("\n")), [
    "svg-editor 0.1",
    "canvas 400x300 created",
    "g#scene created",
    "rect#r1 created in g#scene",
    "shape scene deleted",
    "undo complete",
    "error: id already exists: r1",
    "redo complete",
    "error: no such shape: r1",
    "undo complete",
    "shape r1 deleted",
    "error: nothing to redo",
  ]);
});

test("CLI recovers from creation syntax and domain errors with exactly one error prefix", () => {
  assert.deepEqual(runCli([
    "create g scene",
    "delete scene",
    "init",
    "create box unsupported",
    'create rect bad "" 0 10 10',
    "create g child in missing",
    "undo",
    "create g in",
    "create g child in in",
    "create rect leaf 0 0 10 10 #fff in child",
    "create g invalid in leaf",
    "delete child extra",
    "delete child",
    "undo",
    "delete leaf",
    "quit",
    "",
  ].join("\n")), [
    "svg-editor 0.1",
    "error: no document. use 'init' or 'read' first",
    "error: no document. use 'init' or 'read' first",
    "canvas 800x600 created",
    "error: unknown shape type: box (is the plugin loaded?)",
    "error: x must be a finite number",
    "error: no such container: missing",
    "error: undo not allowed after io command",
    "g#in created",
    "g#child created in g#in",
    "rect#leaf created in g#child",
    "error: not a container: leaf",
    "error: usage: delete <id>",
    "shape child deleted",
    "undo complete",
    "shape leaf deleted",
  ]);
});

test("CLI composes sorting, migration and deletion, preserves redo after failure, and continues after errors", () => {
  assert.deepEqual(runCli([
    "init",
    "create g scene",
    "create g other",
    "create rect a 0 0 10 10 red in scene",
    "create rect b 0 0 10 10 blue in scene",
    "create rect c 0 0 10 10 green in scene",
    "front a",
    "back c",
    "undo",
    "undo",
    "addto other b",
    "undo",
    "addto b a",
    "redo",
    "delete scene",
    "delete b",
    "undo",
    "undo",
    "undo",
    "addto scene scene",
    "front missing",
    "back a extra",
    "delete other",
    "delete b",
    "quit",
    "front a",
    "",
  ].join("\n")), [
    "svg-editor 0.1",
    "canvas 800x600 created",
    "g#scene created",
    "g#other created",
    "rect#a created in g#scene",
    "rect#b created in g#scene",
    "rect#c created in g#scene",
    "shape a brought to front",
    "shape c sent to back",
    "undo complete",
    "undo complete",
    "shape b moved into g#other",
    "undo complete",
    "error: not a container: b",
    "redo complete",
    "shape scene deleted",
    "shape b deleted",
    "undo complete",
    "undo complete",
    "undo complete",
    "error: cannot move a shape into itself or its descendant",
    "error: no such shape: missing",
    "error: usage: back <id>",
    "shape other deleted",
    "shape b deleted",
  ]);
});

test("CLI displays multiline trees and current parents without consuming edit history", () => {
  assert.deepEqual(runCli([
    "tree",
    "init 400 300",
    "tree",
    "create g scene",
    "create rect a 10 20 100 50 red in scene",
    "create rect b 0 0 10 10 in scene",
    "tree",
    "show a",
    "front a",
    "tree scene",
    "undo",
    "show scene",
    "redo",
    "tree scene",
    "create g other",
    "addto other a",
    "show a",
    "undo",
    "show a",
    "show missing",
    "tree scene extra",
    "redo",
    "tree other",
    "quit",
    "tree",
    "",
  ].join("\n")), [
    "svg-editor 0.1",
    "error: no document. use 'init' or 'read' first",
    "canvas 400x300 created",
    "svg (400x300)",
    "g#scene created",
    "rect#a created in g#scene",
    "rect#b created in g#scene",
    "svg (400x300)",
    "└── g#scene",
    "    ├── rect#a  x=10 y=20 w=100 h=50 fill=red",
    "    └── rect#b  x=0 y=0 w=10 h=10",
    "rect#a  parent=g#scene",
    "  x=10", "  y=20", "  width=100", "  height=50", "  fill=red",
    "shape a brought to front",
    "g#scene",
    "├── rect#b  x=0 y=0 w=10 h=10",
    "└── rect#a  x=10 y=20 w=100 h=50 fill=red",
    "undo complete",
    "g#scene  parent=svg",
    "redo complete",
    "g#scene",
    "├── rect#b  x=0 y=0 w=10 h=10",
    "└── rect#a  x=10 y=20 w=100 h=50 fill=red",
    "g#other created",
    "shape a moved into g#other",
    "rect#a  parent=g#other",
    "  x=10", "  y=20", "  width=100", "  height=50", "  fill=red",
    "undo complete",
    "rect#a  parent=g#scene",
    "  x=10", "  y=20", "  width=100", "  height=50", "  fill=red",
    "error: no such shape: missing",
    "error: usage: tree [id]",
    "redo complete",
    "g#other",
    "└── rect#a  x=10 y=20 w=100 h=50 fill=red",
  ]);
});
