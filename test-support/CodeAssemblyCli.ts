import { createCliHost } from "../src/assembly/CliHost.js";
import { PluginLoader } from "../src/assembly/PluginLoader.js";
import { ExtensionRegistry } from "../src/application/extensions/ExtensionRegistry.js";
import type { Plugin } from "../src/application/extensions/PluginContracts.js";
import boxPlugin from "../src/plugins/box/BoxPlugin.js";
import dirPlugin from "../src/plugins/dir/DirPlugin.js";
import statsPlugin from "../src/plugins/stats/StatsPlugin.js";
import modifiedStarPlugin from "../src/plugins/tree/ModifiedStarPlugin.js";
import builtinShapesPlugin from "../src/plugins/shapes/BuiltinShapesPlugin.js";

type PluginSource = readonly [Plugin, URL];
const source = (plugin: Plugin, path: string): PluginSource => [plugin, new URL(path, import.meta.url)];
const availablePlugins = new Map<string, PluginSource>([
  ["box", source(boxPlugin, "../src/plugins/box/BoxPlugin.ts")],
  ["dir", source(dirPlugin, "../src/plugins/dir/DirPlugin.ts")],
  ["stats", source(statsPlugin, "../src/plugins/stats/StatsPlugin.ts")],
  ["modified-star", source(modifiedStarPlugin, "../src/plugins/tree/ModifiedStarPlugin.ts")],
]);
const extensions = new ExtensionRegistry();
const loader = new PluginLoader(extensions);
const plugins = [source(builtinShapesPlugin, "../src/plugins/shapes/BuiltinShapesPlugin.ts"), ...process.argv.slice(2).map((name) => {
  const plugin = availablePlugins.get(name);
  if (plugin === undefined) throw new RangeError(`unknown test plugin: ${name}`);
  return plugin;
})];

for (const [plugin, url] of plugins) {
  const failure = loader.install(plugin, url);
  if (failure !== undefined) throw new Error(failure);
}

createCliHost(extensions).start();
