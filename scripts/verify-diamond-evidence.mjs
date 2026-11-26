import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trimEnd();
const base = "evidence/diamond-base";
const code = "evidence/diamond-code";
const config = "evidence/diamond-config";
for (const ref of [code, config]) {
  assert.equal(git("rev-parse", `${ref}^`), git("rev-parse", base));
  const paths = git("diff", "--name-only", base, ref).split("\n");
  const extra = ref === code ? "src/main.ts" : "plugins.config.json";
  assert.ok(paths.includes(extra));
  assert.ok(paths.includes("src/plugins/diamond/DiamondPlugin.ts"));
  assert.ok(paths.every((path) => path === extra || path.startsWith("src/plugins/diamond/")
    || path === "test/plugins/DiamondPlugin.test.ts" || path === "test/plugins/DiamondShape.test.ts"));
}
assert.equal(git("diff", code, config, "--", "src/plugins/diamond"), "");

const cacheRoot = resolve(root, ".cache");
mkdirSync(cacheRoot, { recursive: true });
const directory = mkdtempSync(join(cacheRoot, "diamond-evidence-"));
const workingDirectory = join(directory, "working");
mkdirSync(workingDirectory);
const loader = import.meta.resolve("tsx");
function extract(ref, name, paths = []) {
  const target = join(directory, name);
  mkdirSync(target);
  const archive = join(directory, `${name}.tar`);
  git("archive", "--format=tar", "--output", archive, ref, "src", "package.json", "tsconfig.json", ...paths);
  execFileSync("tar", ["-xf", archive, "-C", target], { windowsHide: true });
  return target;
}
function run(target, args, input) {
  const result = spawnSync(process.execPath, ["--import", loader, join(target, "src/main.ts"), ...args], {
    cwd: workingDirectory, input, encoding: "utf8", timeout: 15000, windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  return result.stdout;
}

try {
  const codePath = extract(code, "code");
  const configPath = extract(config, "config", ["plugins.config.json"]);
  const input = ["help", "init", "create diamond decision 40 50 80 40 gold", "move decision 5 -10",
    "scale decision 2", "set decision fill red", "undo", "redo", "tree", "stats",
    "save diamond.svg", "read diamond.svg", "show decision", "quit", ""].join("\n");
  const codeOutput = run(codePath, [], input);
  const codeSvg = readFileSync(join(workingDirectory, "diamond.svg"), "utf8");
  const configOutput = run(configPath, ["--config", join(configPath, "plugins.config.json")], input);
  assert.equal(configOutput, codeOutput);
  assert.equal(readFileSync(join(workingDirectory, "diamond.svg"), "utf8"), codeSvg);
  assert.doesNotMatch(codeOutput, /error:/u);
  assert.match(codeSvg, /data-shape="diamond"/u);

  const finalPath = extract("final", "final");
  const emptyConfig = join(directory, "empty.json");
  writeFileSync(emptyConfig, '{"plugins":[]}');
  const baselineInput = "help\ninit\ncreate diamond d 0 0 10 10\ntree\nquit\n";
  assert.equal(run(codePath, ["--config", emptyConfig], baselineInput), run(finalPath, [], baselineInput));
  console.log(`diamond A/B: ${Buffer.byteLength(codeOutput)} output bytes identical; saved SVG identical`);
  console.log("Phase 1: help, disabled diamond, and empty tree match final byte for byte");
  console.log(`A: ${git("rev-parse", "--short", code)}; B: ${git("rev-parse", "--short", config)}; base: ${git("rev-parse", "--short", base)}`);
} finally {
  const target = resolve(directory);
  if (!target.startsWith(`${cacheRoot}${sep}`)) throw new Error("temporary path escaped evidence cache");
  rmSync(target, { recursive: true, force: true });
}
