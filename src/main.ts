import { EditorSession } from "./application/EditorSession.js";
import { CommandRegistry } from "./cli/CommandRegistry.js";
import { Repl } from "./cli/Repl.js";
import { Tokenizer } from "./cli/Tokenizer.js";

const session = new EditorSession();
const tokenizer = new Tokenizer();
const commands = new CommandRegistry(session);

new Repl(tokenizer, commands).start();