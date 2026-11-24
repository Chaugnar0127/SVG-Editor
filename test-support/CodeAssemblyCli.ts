import { createCliHost } from "../src/assembly/CliHost.js";
import { PluginLoader } from "../src/assembly/PluginLoader.js";
import { ExtensionRegistry } from "../src/application/extensions/ExtensionRegistry.js";
import type { Plugin } from "../src/application/extensions/PluginContracts.js";
import boxPlugin from "../src/plugins/box/BoxPlugin.js";
import dirPlugin from "../src/plugins/dir/DirPlugin.js";
import statsPlugin from "../src/plugins/stats/StatsPlugin.js";
import modifiedStarPlugin from "../src/plugins/tree/ModifiedStarPlugin.js";
import builtinShapesPlugin from "../src/plugins/shapes/BuiltinShapesPlugin.js";

const availablePlugins = new Map<string, Plugin>([
  ["box", boxPlugin],
  ["dir", dirPlugin],
  ["stats", statsPlugin],
  ["modified-star", modifiedStarPlugin],
]);
const extensions = new ExtensionRegistry();
const loader = new PluginLoader(extensions);
const plugins = [builtinShapesPlugin, ...process.argv.slice(2).map((name) => {
  const plugin = availablePlugins.get(name);
  if (plugin === undefined) throw new RangeError(`unknown test plugin: ${name}`);
  return plugin;
})];

for (const plugin of plugins) {
  const failure = loader.install(plugin);
  if (failure !== undefined) throw new Error(failure);
}

createCliHost(extensions).start();
