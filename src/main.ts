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
import statsPlugin from "./plugins/stats/StatsPlugin.js";
import dirPlugin from "./plugins/dir/DirPlugin.js";
import modifiedStarPlugin from "./plugins/tree/ModifiedStarPlugin.js";
import boxPlugin from "./plugins/box/BoxPlugin.js";

const extensions = new ExtensionRegistry();
for (const plugin of [builtinShapesPlugin, statsPlugin, dirPlugin, modifiedStarPlugin, boxPlugin]) {
  const result = extensions.install(plugin);
  if (!result.success) throw new Error(`default plugin failed to install: ${plugin.manifest.name}`);
}

const shapeFactory = new ShapeFactory(extensions);
const codec = new SvgCodec(shapeFactory);
const session = new EditorSession(new SvgFileStore(codec), extensions, shapeFactory);
const tokenizer = new Tokenizer();
const commands = new CommandRegistry(session, extensions, new NodeDirectoryReader());

new Repl(tokenizer, commands).start();
