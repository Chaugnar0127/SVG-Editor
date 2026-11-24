import { EditorSession } from "../application/EditorSession.js";
import { ExtensionRegistry } from "../application/extensions/ExtensionRegistry.js";
import { ShapeFactory } from "../application/ShapeFactory.js";
import { CommandRegistry } from "../cli/CommandRegistry.js";
import { Repl } from "../cli/Repl.js";
import { Tokenizer } from "../cli/Tokenizer.js";
import { NodeDirectoryReader } from "../infrastructure/NodeDirectoryReader.js";
import { SvgCodec } from "../infrastructure/SvgCodec.js";
import { SvgFileStore } from "../infrastructure/SvgFileStore.js";

/** Builds the CLI around an already configured extension registry. */
export function createCliHost(extensions: ExtensionRegistry): Repl {
  const shapeFactory = new ShapeFactory(extensions);
  const codec = new SvgCodec(shapeFactory);
  const session = new EditorSession(new SvgFileStore(codec), extensions, shapeFactory);
  const commands = new CommandRegistry(session, extensions, new NodeDirectoryReader());
  return new Repl(new Tokenizer(), commands);
}
