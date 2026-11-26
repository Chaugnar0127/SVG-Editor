import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { ExtensionRegistry } from "../../src/application/extensions/ExtensionRegistry.js";
import type { Plugin } from "../../src/application/extensions/PluginContracts.js";
import { PluginLoader } from "../../src/assembly/PluginLoader.js";

function withDirectory(run: (directory: string) => Promise<void>): (t: test.TestContext) => Promise<void> {
  return async (t) => {
    const directory = mkdtempSync(join(tmpdir(), "svg-plugin-loader-"));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    await run(directory);
  };
}

function writeModule(directory: string, name: string, source: string): string {
  const path = join(directory, name);
  writeFileSync(path, source);
  return path;
}

function writeConfig(directory: string, plugins: readonly unknown[]): string {
  const path = join(directory, "plugins.config.json");
  writeFileSync(path, JSON.stringify({ plugins }));
  return path;
}

function simplePlugin(name: string, value: unknown): Plugin {
  return {
    manifest: { name, contributes: { commands: [name] } },
    activate(context) {
      context.registerCommand({
        name,
        usage: name,
        help: name,
        execute: () => ({ kind: "message", text: JSON.stringify(value) }),
      });
    },
  };
}

test("code and config assembly share registration and options behavior", withDirectory(async (directory) => {
  const options = { mode: "tree", threshold: 3 };
  const codedRegistry = new ExtensionRegistry();
  const codedLoader = new PluginLoader(codedRegistry);
  assert.equal(codedLoader.install(simplePlugin("shared", options), pathToFileURL(join(directory, "shared.mjs")), options), undefined);

  writeModule(directory, "shared.mjs", `
    export default {
      manifest: { name: "shared", contributes: { commands: ["shared"] } },
      activate(context, options) {
        context.registerCommand({ name: "shared", usage: "shared", help: "shared",
          execute: () => ({ kind: "message", text: JSON.stringify(options) }) });
      }
    };
  `);
  writeFileSync(join(directory, "package.json"), JSON.stringify({
    name: "shared-package",
    main: "./shared.mjs",
    contributes: { commands: ["shared"] },
  }));
  const configPath = writeConfig(directory, [
    { module: "./shared.mjs", options },
    { module: "./disabled.mjs", enabled: false },
  ]);
  const configuredRegistry = new ExtensionRegistry();
  const errors = await new PluginLoader(configuredRegistry).loadConfig(configPath);
  assert.deepEqual(errors, []);
  const context = { getDocument: () => undefined };
  assert.deepEqual(codedRegistry.command("shared")?.execute([], context),
    configuredRegistry.command("shared")?.execute([], context));
  assert.deepEqual(configuredRegistry.command("shared")?.execute([], context), {
    kind: "message", text: JSON.stringify(options),
  });
}));

test("config resolves packages through ESM import exports", withDirectory(async (directory) => {
  const packageName = `svg-editor-import-only-${process.pid}-${Date.now()}`;
  const packageDirectory = join(process.cwd(), "node_modules", packageName);
  mkdirSync(packageDirectory);
  writeFileSync(join(packageDirectory, "package.json"), JSON.stringify({
    name: packageName,
    type: "module",
    exports: { ".": { import: "./plugin.mjs" } },
    contributes: { commands: ["esm-only"] },
  }));
  writeModule(packageDirectory, "plugin.mjs", `export default {
    manifest: { name: "esm-only", contributes: { commands: ["esm-only"] } },
    activate(context) {
      context.registerCommand({ name: "esm-only", usage: "esm-only", help: "ESM only",
        execute: () => ({ kind: "message", text: "loaded through import" }) });
    }
  };`);
  try {
    const registry = new ExtensionRegistry();
    const errors = await new PluginLoader(registry).loadConfig(writeConfig(directory, [
      { module: packageName },
    ]));

    assert.deepEqual(errors, []);
    assert.deepEqual(registry.command("esm-only")?.execute([], { getDocument: () => undefined }), {
      kind: "message", text: "loaded through import",
    });
  } finally {
    rmSync(packageDirectory, { recursive: true, force: true });
  }
}));

test("config mode validates registrations against package.json contributes", withDirectory(async (directory) => {
  const packageDirectory = join(directory, "packaged");
  mkdirSync(packageDirectory);
  writeFileSync(join(packageDirectory, "package.json"), JSON.stringify({
    name: "package-manifest",
    type: "module",
    main: "./plugin.mjs",
    contributes: { commands: ["from-package"] },
  }));
  writeModule(packageDirectory, "plugin.mjs", `export default {
    manifest: { name: "code-manifest", contributes: { commands: ["wrong"] } },
    activate(context) {
      context.registerCommand({ name: "from-package", usage: "from-package", help: "from-package",
        execute: () => ({ kind: "message", text: "registered" }) });
    }
  };`);
  const registry = new ExtensionRegistry();
  const errors = await new PluginLoader(registry).loadConfig(writeConfig(directory, [
    { module: "./packaged/plugin.mjs" },
  ]));
  assert.deepEqual(errors, []);
  assert.equal(registry.command("from-package")?.name, "from-package");
  assert.equal(registry.command("wrong"), undefined);
}));

test("config validation is all-or-nothing and reports invalid configuration", withDirectory(async (directory) => {
  const registry = new ExtensionRegistry();
  const loader = new PluginLoader(registry);
  const malformed = join(directory, "invalid.json");
  writeFileSync(malformed, '{"plugins":[{"module":"./missing.mjs"},{"module":2}]}');
  assert.deepEqual(await loader.loadConfig(malformed), ["error: invalid plugin config"]);
  assert.deepEqual(registry.commandsList(), []);
  assert.deepEqual(await loader.loadConfig(join(directory, "absent.json")), ["error: invalid plugin config"]);
}));

test("both assembly modes validate the same package manifest even without entry fields", withDirectory(async (directory) => {
  const modulePath = writeModule(directory, "manifest-parity.mjs", `export default {
    manifest: { name: "object-manifest", contributes: { commands: ["actual"] } },
    activate(context) {
      context.registerCommand({ name: "actual", usage: "actual", help: "actual",
        execute: () => ({ kind: "message", text: "actual" }) });
    }
  };`);
  const moduleUrl = pathToFileURL(modulePath);
  const plugin = (await import(moduleUrl.href)).default as Plugin;
  for (const entryFields of [{ main: "./manifest-parity.mjs" }, {}]) {
    writeFileSync(join(directory, "package.json"), JSON.stringify({
      name: "package-manifest", ...entryFields, contributes: { commands: ["declared"] },
    }));
    const codeRegistry = new ExtensionRegistry();
    const configRegistry = new ExtensionRegistry();
    const expected = "error: plugin manifest mismatch: package-manifest (declared: commands=[declared], registered: commands=[actual])";
    assert.equal(new PluginLoader(codeRegistry).install(plugin, moduleUrl), expected);
    assert.deepEqual(await new PluginLoader(configRegistry).loadConfig(
      writeConfig(directory, [{ module: "./manifest-parity.mjs" }]),
    ), [expected]);
    assert.equal(codeRegistry.command("actual"), undefined);
    assert.equal(configRegistry.command("actual"), undefined);
  }
}));

test("one failed plugin does not block later entries or leak its staged contributions", withDirectory(async (directory) => {
  writeModule(directory, "no-default.mjs", "export const plugin = {}; export {}; ");
  writeModule(directory, "invalid-default.mjs", "export default { activate() {}, manifest: { name: 'invalid', contributes: { commands: 'not-an-array' } } };");
  writeModule(directory, "mismatch.mjs", `export default {
    manifest: { name: "mismatch", contributes: { commands: ["declared"] } },
    activate(context) { context.registerCommand({ name: "actual", usage: "actual", help: "actual", execute: () => ({kind:"message", text:"actual"}) }); }
  };`);
  writeModule(directory, "activation.mjs", `export default {
    manifest: { name: "activation", contributes: { commands: ["partial"] } },
    activate(context) { context.registerCommand({ name: "partial", usage: "partial", help: "partial", execute: () => ({kind:"message", text:"partial"}) }); throw new Error("broken activation"); }
  };`);
  writeModule(directory, "first.mjs", `export default {
    manifest: { name: "first", contributes: { commands: ["shared"] } },
    activate(context) { context.registerCommand({ name: "shared", usage: "shared", help: "shared", execute: () => ({kind:"message", text:"first"}) }); }
  };`);
  writeModule(directory, "duplicate.mjs", `export default {
    manifest: { name: "duplicate", contributes: { commands: ["shared"] } },
    activate(context) { context.registerCommand({ name: "shared", usage: "shared", help: "shared", execute: () => ({kind:"message", text:"duplicate"}) }); }
  };`);
  writeModule(directory, "dependent-failure.mjs", 'import "./missing-dependency.mjs"; export default {};');
  writeModule(directory, "last.mjs", `export default {
    manifest: { name: "last", contributes: { commands: ["last"] } },
    activate(context) { context.registerCommand({ name: "last", usage: "last", help: "last", execute: () => ({kind:"message", text:"last"}) }); }
  };`);
  const configPath = writeConfig(directory, [
    { module: "./missing.mjs" },
    { module: "./no-default.mjs" },
    { module: "./invalid-default.mjs" },
    { module: "./mismatch.mjs" },
    { module: "./activation.mjs" },
    { module: "./first.mjs" },
    { module: "./duplicate.mjs" },
    { module: "./dependent-failure.mjs" },
    { module: "./last.mjs" },
  ]);
  const registry = new ExtensionRegistry();
  const errors = await new PluginLoader(registry).loadConfig(configPath);

  assert.equal(errors[0], "error: plugin not found: ./missing.mjs");
  assert.equal(errors[1], "error: plugin has no default export: ./no-default.mjs");
  assert.equal(errors[2], "error: plugin failed to load: ./invalid-default.mjs (invalid default export)");
  assert.equal(errors[3], "error: plugin manifest mismatch: mismatch (declared: commands=[declared], registered: commands=[actual])");
  assert.equal(errors[4], "error: plugin failed to activate: activation (broken activation)");
  assert.equal(errors[5], "error: duplicate registration: commands/shared");
  assert.match(errors[6]!, /^error: plugin failed to load: \.\/dependent-failure\.mjs \(/u);
  assert.doesNotMatch(errors[6]!, /^error: plugin not found/u);
  assert.equal(errors.length, 7);
  assert.equal(registry.command("partial"), undefined);
  assert.equal(registry.command("declared"), undefined);
  assert.equal(registry.command("actual"), undefined);
  const shared = registry.command("shared")?.execute([], { getDocument: () => undefined });
  assert.ok(shared?.kind === "message");
  assert.equal(shared.text, "first");
  assert.equal(registry.command("last")?.name, "last");
}));
