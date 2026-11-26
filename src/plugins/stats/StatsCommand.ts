import type { PluginCommand, PluginCommandContext } from "../../application/extensions/PluginContracts.js";
import { isContainerShape, type Shape } from "../../domain/shape/Shape.js";

export class StatsCommand implements PluginCommand {
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
