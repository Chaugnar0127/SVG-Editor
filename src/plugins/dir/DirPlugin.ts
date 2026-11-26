import { DirCommand } from "./DirCommand.js";
import type { Plugin } from "../../application/extensions/PluginContracts.js";

export class DirPlugin implements Plugin {
  public readonly manifest = { name: "dir", contributes: { commands: ["dir"] } };

  /** 通过扩展上下文注册命令，具体文件系统由宿主注入。 */
  public activate(context: Parameters<Plugin["activate"]>[0]): void {
    context.registerCommand(new DirCommand());
  }
}

const dirPlugin = new DirPlugin();
export default dirPlugin;
