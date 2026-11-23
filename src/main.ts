import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PluginLoader } from "./assembly/PluginLoader.js";
import { EditorSession } from "./application/EditorSession.js";
import { ExtensionRegistry } from "./application/extensions/ExtensionRegistry.js";
import { ShapeFactory } from "./application/ShapeFactory.js";
import { CommandRegistry } from "./cli/CommandRegistry.js";
import { Repl } from "./cli/Repl.js";
import { Tokenizer } from "./cli/Tokenizer.js";
import { SvgFileStore } from "./infrastructure/SvgFileStore.js";
import { SvgCodec } from "./infrastructure/SvgCodec.js";
import { NodeDirectoryReader } from "./infrastructure/NodeDirectoryReader.js";
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

const shapeFactory = new ShapeFactory(extensions);
const codec = new SvgCodec(shapeFactory);
const session = new EditorSession(new SvgFileStore(codec), extensions, shapeFactory);
const tokenizer = new Tokenizer();
const commands = new CommandRegistry(session, extensions, new NodeDirectoryReader());

new Repl(tokenizer, commands).start();
