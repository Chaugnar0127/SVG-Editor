import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
    const expected = JSON.parse(
      readFileSync(join(fixturesDirectory, "expected", `${scenario.name}.stdout.json`), "utf8"),
    ) as string;
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
