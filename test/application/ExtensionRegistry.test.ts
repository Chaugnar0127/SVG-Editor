import assert from "node:assert/strict";
import test from "node:test";
import { ExtensionRegistry } from "../../src/application/extensions/ExtensionRegistry.js";
import type { Plugin, PluginCommand } from "../../src/application/extensions/PluginContracts.js";

function command(name: string): PluginCommand {
  return {
    name,
    usage: name,
    help: name,
    execute: () => ({ kind: "message", text: name }),
  };
}

function plugin(
  name: string,
  commands: readonly string[],
  activate: Plugin["activate"],
): Plugin {
  return { manifest: { name, contributes: { commands } }, activate };
}

test("plugin activation commits matching contributions and passes options", () => {
  const registry = new ExtensionRegistry();
  let received: unknown;
  const result = registry.install(plugin("stats", ["stats"], (context, options) => {
    received = options;
    context.registerCommand(command("stats"));
  }), { mode: "tree" });

  assert.deepEqual(result, { success: true });
  assert.deepEqual(received, { mode: "tree" });
  assert.equal(registry.command("stats")?.name, "stats");
});

test("activation failure discards partial registrations without removing prior plugins", () => {
  const registry = new ExtensionRegistry();
  registry.install(plugin("first", ["first"], (context) => context.registerCommand(command("first"))));

  const result = registry.install(plugin("broken", ["partial"], (context) => {
    context.registerCommand(command("partial"));
    throw new Error("activation failed");
  }));

  assert.equal(result.success, false);
  if (!result.success) assert.deepEqual(result.failure, {
    kind: "activation", pluginName: "broken", reason: "activation failed",
  });
  assert.equal(registry.command("first")?.name, "first");
  assert.equal(registry.command("partial"), undefined);
});

test("manifest mismatch and duplicate names reject only the current plugin", () => {
  const registry = new ExtensionRegistry();
  registry.install(plugin("first", ["shared"], (context) => context.registerCommand(command("shared"))));

  const mismatch = registry.install(plugin("mismatch", ["declared"], (context) => {
    context.registerCommand(command("actual"));
  }));
  const duplicate = registry.install(plugin("duplicate", ["shared"], (context) => {
    context.registerCommand(command("shared"));
  }));

  assert.equal(mismatch.success, false);
  assert.equal(duplicate.success, false);
  if (!duplicate.success) assert.deepEqual(duplicate.failure, {
    kind: "duplicate", category: "commands", name: "shared",
  });
  assert.equal(registry.commandsList().length, 1);
  assert.equal(registry.command("shared")?.name, "shared");
});

test("duplicate registration within one activation is rejected", () => {
  const registry = new ExtensionRegistry();
  const result = registry.install(plugin("duplicate", ["same"], (context) => {
    context.registerCommand(command("same"));
    context.registerCommand(command("same"));
  }));

  assert.equal(result.success, false);
  if (!result.success) assert.deepEqual(result.failure, {
    kind: "duplicate", category: "commands", name: "same",
  });
  assert.equal(registry.command("same"), undefined);
});
