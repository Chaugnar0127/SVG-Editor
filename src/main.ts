import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createCliHost } from "./assembly/CliHost.js";
import { PluginLoader } from "./assembly/PluginLoader.js";
import { ExtensionRegistry } from "./application/extensions/ExtensionRegistry.js";
import builtinShapesPlugin from "./plugins/shapes/BuiltinShapesPlugin.js";

const extensions = new ExtensionRegistry();
const loader = new PluginLoader(extensions);
const baseFailure = loader.install(builtinShapesPlugin);
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
    (await import("./plugins/stats/StatsPlugin.js")).default,
    (await import("./plugins/dir/DirPlugin.js")).default,
    (await import("./plugins/tree/ModifiedStarPlugin.js")).default,
    (await import("./plugins/box/BoxPlugin.js")).default,
  ];
  pluginErrors = defaults
    .map((plugin) => loader.install(plugin))
    .filter((failure): failure is string => failure !== undefined);
}
for (const error of pluginErrors) console.log(error);

createCliHost(extensions).start();
