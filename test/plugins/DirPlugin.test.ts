import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DirectoryEntry, DirectoryReader } from "../../src/application/DirectoryReader.js";
import { ExtensionRegistry } from "../../src/application/extensions/ExtensionRegistry.js";
import { EditorSession } from "../../src/application/EditorSession.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import { NodeDirectoryReader } from "../../src/infrastructure/NodeDirectoryReader.js";
import dirPlugin from "../../src/plugins/dir/DirPlugin.js";

class FakeDirectoryReader implements DirectoryReader {
  public constructor(
    public readonly currentPath: string,
    private readonly entries: readonly DirectoryEntry[] = [],
    private readonly failure?: Error,
  ) {}

  public list(): readonly DirectoryEntry[] {
    if (this.failure !== undefined) throw this.failure;
    return this.entries;
  }
}

function setup(reader: DirectoryReader) {
  const extensions = new ExtensionRegistry();
  assert.deepEqual(extensions.install(dirPlugin), { success: true });
  const session = new EditorSession();
  return { session, commands: new CommandRegistry(session, extensions, reader) };
}

test("dir sorts direct entries by kind and name, preserving hidden and special entries", () => {
  const reader = new FakeDirectoryReader("/workspace", [
    { name: "z.txt", kind: "file" },
    { name: "z-dir", kind: "directory" },
    { name: ".hidden", kind: "file" },
    { name: "a-dir", kind: "directory" },
    { name: "link", kind: "other" },
    { name: "a.txt", kind: "file" },
  ]);
  const { commands } = setup(reader);
  assert.deepEqual(commands.execute(["dir"]), {
    kind: "message",
    text: "[DIR]  a-dir\n[DIR]  z-dir\n[FILE]  .hidden\n[FILE]  a.txt\n[FILE]  z.txt\n[OTHER]  link",
  });
});

test("dir works without a document, formats empty and failed reads, and preserves edit history", () => {
  const empty = setup(new FakeDirectoryReader("/empty"));
  assert.deepEqual(empty.commands.execute(["dir"]), { kind: "message", text: "(empty directory)" });

  const failed = setup(new FakeDirectoryReader("/missing", [], new Error("permission denied")));
  assert.deepEqual(failed.commands.execute(["dir"]), {
    kind: "message", text: "error: cannot read directory: /missing",
  });
  failed.session.init();
  failed.session.createShape("rect", "pending", ["0", "0", "1", "1"]);
  failed.session.createShape("rect", "redoable", ["0", "0", "1", "1"]);
  failed.session.undo();
  failed.commands.execute(["dir"]);
  failed.commands.execute(["redo"]);
  assert.ok(failed.session.requireDocument().find("redoable"));

  const { session, commands } = setup(new FakeDirectoryReader("/workspace", [
    { name: "file.svg", kind: "file" },
  ]));
  session.init();
  session.createShape("rect", "first", ["0", "0", "1", "1"]);
  session.createShape("rect", "second", ["0", "0", "1", "1"]);
  session.undo();
  commands.execute(["dir"]);
  commands.execute(["redo"]);
  assert.ok(session.requireDocument().find("second"));
  assert.throws(() => commands.execute(["dir", "extra"]), { message: "usage: dir" });
});

test("dir command and Node adapter read a real temporary directory", () => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-dir-"));
  try {
    mkdirSync(join(directory, "z-folder"));
    mkdirSync(join(directory, ".hidden-folder"));
    writeFileSync(join(directory, "b.txt"), "b");
    writeFileSync(join(directory, ".hidden-file"), "h");
    const { commands } = setup(new NodeDirectoryReader(directory));
    assert.deepEqual(commands.execute(["dir"]), {
      kind: "message",
      text: "[DIR]  .hidden-folder\n[DIR]  z-folder\n[FILE]  .hidden-file\n[FILE]  b.txt",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
