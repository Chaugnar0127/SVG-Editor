import { StatsCommand } from "./StatsCommand.js";
import type { Plugin } from "../../application/extensions/PluginContracts.js";

export class StatsPlugin implements Plugin {
  public readonly manifest = { name: "stats", contributes: { commands: ["stats"] } };

  /** 将命令实例交给宿主暂存；是否发布由扩展注册表决定。 */
  public activate(context: Parameters<Plugin["activate"]>[0]): void {
    context.registerCommand(new StatsCommand());
  }
}

const statsPlugin = new StatsPlugin();
export default statsPlugin;
