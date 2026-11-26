import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createCliHost } from "./assembly/CliHost.js";
import { PluginLoader } from "./assembly/PluginLoader.js";
import { ExtensionRegistry } from "./application/extensions/ExtensionRegistry.js";
import builtinShapesPlugin from "./plugins/shapes/BuiltinShapesPlugin.js";

const extensions = new ExtensionRegistry();
const loader = new PluginLoader(extensions);
const baseFailure = loader.install(builtinShapesPlugin, new URL("./plugins/shapes/BuiltinShapesPlugin.js", import.meta.url));
if (baseFailure !== undefined) throw new Error(baseFailure);

const startupArguments = process.argv.slice(2);
const explicitConfig = startupArguments.length === 2
  && startupArguments[0] === "--config"
  && startupArguments[1]!.trim().length > 0;
const invalidStartupArguments = startupArguments.length > 0 && !explicitConfig;
const configPath = explicitConfig
  ? resolve(process.cwd(), startupArguments[1]!)
  : resolve(process.cwd(), "plugins.config.json");
let pluginErrors: readonly string[];
if (invalidStartupArguments) {
  pluginErrors = ["error: invalid plugin config"];
} else if (explicitConfig || existsSync(configPath)) {
  pluginErrors = await loader.loadConfig(configPath);
} else {
  const defaults = [
    "./plugins/stats/StatsPlugin.js",
    "./plugins/dir/DirPlugin.js",
    "./plugins/tree/ModifiedStarPlugin.js",
    "./plugins/box/BoxPlugin.js",
  ];
  const failures: string[] = [];
  for (const module of defaults) {
    const url = new URL(module, import.meta.url);
    const plugin = (await import(url.href)).default;
    const failure = loader.install(plugin, url);
    if (failure !== undefined) failures.push(failure);
  }
  pluginErrors = failures;
}
for (const error of pluginErrors) console.log(error);

createCliHost(extensions).start();
