import type { Plugin, PluginCommand, PluginCommandContext } from "../../application/extensions/PluginContracts.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { isContainerShape } from "../../domain/shape/Shape.js";

class StatsCommand implements PluginCommand {
  public readonly name = "stats";
  public readonly usage = "stats";
  public readonly help = "count leaf shapes and containers";

  /** 只读遍历当前文档，按首次遇到的叶子类型保留统计顺序。 */
  public execute(args: readonly string[], context: PluginCommandContext) {
    if (args.length !== 0) throw new RangeError("usage: stats");
    const document = context.getDocument();
    if (document === undefined) throw new RangeError("no document. use 'init' or 'read' first");

    const counts = new Map<string, number>();
    let total = 0;
    let containers = 0;
    const visit = (shapes: readonly Shape[]): void => {
      for (const shape of shapes) {
        const children = shape.children();
        if (isContainerShape(shape)) {
          containers++;
        } else {
          counts.set(shape.type, (counts.get(shape.type) ?? 0) + 1);
          total++;
        }
        visit(children);
      }
    };
    visit(document.topLevel());

    const kinds = [...counts].map(([type, count]) => `${type}: ${count}`);
    return { kind: "message" as const, text: [...kinds, `(total ${total}, containers ${containers})`].join("  ") };
  }
}

export class StatsPlugin implements Plugin {
  public readonly manifest = { name: "stats", contributes: { commands: ["stats"] } };

  /** 将命令实例交给宿主暂存；是否发布由扩展注册表决定。 */
  public activate(context: Parameters<Plugin["activate"]>[0]): void {
    context.registerCommand(new StatsCommand());
  }
}

const statsPlugin = new StatsPlugin();
export default statsPlugin;
