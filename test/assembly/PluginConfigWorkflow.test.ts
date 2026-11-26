import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const { version } = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };

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
    "--config", "plugins.config.json",
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
    "--config", "plugins.config.json",
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

test("config rejects built-in command collisions, rolls back the plugin, and continues startup", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-command-conflict-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, "conflict.mjs"), `export default {
    manifest: { name: "conflict", contributes: { commands: ["partial", "help"] } },
    activate(context) {
      for (const name of ["partial", "help"]) context.registerCommand({
        name, usage: name, help: name, execute: () => ({ kind: "message", text: "conflicting plugin" })
      });
    }
  };`);
  writeFileSync(join(directory, "later.mjs"), `export default {
    manifest: { name: "later", contributes: { commands: ["later"] } },
    activate(context) {
      context.registerCommand({ name: "later", usage: "later", help: "later",
        execute: () => ({ kind: "message", text: "later plugin works" }) });
    }
  };`);
  writeFileSync(join(directory, "plugins.config.json"), JSON.stringify({ plugins: [
    { module: "./conflict.mjs" }, { module: "./later.mjs" },
  ] }));
  const result = spawnSync(process.execPath, [
    "--import", import.meta.resolve("tsx"), fileURLToPath(new URL("../../src/main.ts", import.meta.url)),
    "--config", "plugins.config.json",
  ], {
    cwd: directory, input: "help\npartial\nlater\ninit\nquit\n", encoding: "utf8",
    timeout: 10_000, windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /error: duplicate registration: commands\/help/u);
  assert.match(result.stdout, /create rect <id>/u);
  assert.match(result.stdout, /error: unknown command: partial/u);
  assert.match(result.stdout, /later plugin works/u);
  assert.match(result.stdout, /canvas 800x600 created/u);
  assert.doesNotMatch(result.stdout, /conflicting plugin/u);
});

test("code and config assembly produce identical Phase 1, box, and command transcripts", (t) => {
  const codeDirectory = mkdtempSync(join(tmpdir(), "svg-editor-code-assembly-"));
  const configWorkingDirectory = mkdtempSync(join(tmpdir(), "svg-editor-config-assembly-"));
  const configDirectory = mkdtempSync(join(tmpdir(), "svg-editor-assembly-config-"));
  t.after(() => rmSync(codeDirectory, { recursive: true, force: true }));
  t.after(() => rmSync(configWorkingDirectory, { recursive: true, force: true }));
  t.after(() => rmSync(configDirectory, { recursive: true, force: true }));

  const fixturesDirectory = fileURLToPath(new URL("../fixtures/phase2", import.meta.url));
  const scenarios = [
    { name: "phase1-baseline", plugins: [] },
    { name: "phase1-box", plugins: ["box"] },
    { name: "stats-dir", plugins: ["stats", "dir"] },
  ];

  const cliPath = fileURLToPath(new URL("../../src/main.ts", import.meta.url));
  const codeAssemblyPath = fileURLToPath(new URL("../../test-support/CodeAssemblyCli.ts", import.meta.url));
  const loaderPath = import.meta.resolve("tsx");
  const modulePaths: Readonly<Record<string, string>> = {
    box: "../../src/plugins/box/BoxPlugin.ts",
    dir: "../../src/plugins/dir/DirPlugin.ts",
    stats: "../../src/plugins/stats/StatsPlugin.ts",
  };

  for (const scenario of scenarios) {
    const codeWorkingDirectory = join(codeDirectory, scenario.name);
    const configCwd = join(configWorkingDirectory, scenario.name);
    const input = readFileSync(join(fixturesDirectory, "transcripts", `${scenario.name}.input.txt`), "utf8");
    const historicalExpected = JSON.parse(
      readFileSync(join(fixturesDirectory, "expected", `${scenario.name}.stdout.json`), "utf8"),
    ) as string;
    // Preserve historical command output while checking the current package version in the banner.
    const expected = historicalExpected.replace(/^svg-editor [^\n]+\n/u, `svg-editor ${version}\n`);
    for (const directory of [codeWorkingDirectory, configCwd]) {
      mkdirSync(join(directory, "docs"), { recursive: true });
      for (const file of ["demo.svg", "other.svg"]) {
        copyFileSync(join(fixturesDirectory, "files", file), join(directory, file));
      }
    }
    const plugins = scenario.plugins.map((name) => {
      const path = modulePaths[name];
      assert.ok(path, `missing plugin path for ${name}`);
      return { module: fileURLToPath(new URL(path, import.meta.url)) };
    });
    const configPath = join(configDirectory, `${scenario.name}.json`);
    writeFileSync(configPath, JSON.stringify({ plugins }));
    const run = (entry: string, args: readonly string[], cwd: string) => spawnSync(process.execPath, [
      "--import", loaderPath, entry, ...args,
    ], {
      cwd,
      input,
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true,
    });

    const codeAssembly = run(codeAssemblyPath, scenario.plugins, codeWorkingDirectory);
    const configAssembly = run(cliPath, ["--config", configPath], configCwd);

    assert.ifError(codeAssembly.error);
    assert.ifError(configAssembly.error);
    assert.equal(codeAssembly.status, 0, `${scenario.name}: ${codeAssembly.stderr}`);
    assert.equal(configAssembly.status, 0, `${scenario.name}: ${configAssembly.stderr}`);
    assert.equal(codeAssembly.stderr, "", scenario.name);
    assert.equal(configAssembly.stderr, "", scenario.name);
    assert.equal(codeAssembly.stdout, expected, `${scenario.name}: code assembly differs from the golden transcript`);
    assert.equal(configAssembly.stdout, expected, `${scenario.name}: config assembly differs from the golden transcript`);
    assert.equal(configAssembly.stdout, codeAssembly.stdout, scenario.name);
  }
});
