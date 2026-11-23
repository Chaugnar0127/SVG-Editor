import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("CLI config mode loads configured plugins and keeps default shapes available", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-config-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, "sample.mjs"), `export default {
    manifest: { name: "greeting", contributes: { commands: ["greet"] } },
    activate(context, options) {
      context.registerCommand({ name: "greet", usage: "greet", help: "print a greeting",
        execute: () => ({ kind: "message", text: options.prefix }) });
    }
  };`);
  const disabledSideEffect = join(directory, "disabled-loaded.txt");
  writeFileSync(join(directory, "disabled.mjs"), `
    import { writeFileSync } from "node:fs";
    writeFileSync(${JSON.stringify(disabledSideEffect)}, "loaded");
    export default {};
  `);
  writeFileSync(join(directory, "plugins.config.json"), JSON.stringify({
    plugins: [
      { module: "./sample.mjs", options: { prefix: "hello from config" } },
      { module: "./disabled.mjs", enabled: false },
    ],
  }));
  const result = spawnSync(process.execPath, [
    "--import", import.meta.resolve("tsx"), fileURLToPath(new URL("../../src/main.ts", import.meta.url)),
  ], {
    cwd: directory,
    input: ["init", "create rect sample 0 0 10 10", "greet", "stats", "quit", ""].join("\n"),
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /rect#sample created/u);
  assert.match(result.stdout, /hello from config/u);
  assert.match(result.stdout, /error: unknown command: stats/u);
  assert.doesNotMatch(result.stdout, /plugin not found: \.\/disabled\.mjs/u);
  assert.equal(existsSync(disabledSideEffect), false);
});

test("invalid config starts with base capabilities and reports one error", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-invalid-config-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, "plugins.config.json"), '{"plugins":[{"module":42}]}');
  const result = spawnSync(process.execPath, [
    "--import", import.meta.resolve("tsx"), fileURLToPath(new URL("../../src/main.ts", import.meta.url)),
  ], {
    cwd: directory,
    input: ["init", "create rect sample 0 0 10 10", "stats", "quit", ""].join("\n"),
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /error: invalid plugin config/u);
  assert.match(result.stdout, /rect#sample created/u);
  assert.match(result.stdout, /error: unknown command: stats/u);
});
