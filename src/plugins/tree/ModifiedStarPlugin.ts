import { ModifiedStarDecorator } from "./ModifiedStarDecorator.js";
import type { Plugin } from "../../application/extensions/PluginContracts.js";

export class ModifiedStarPlugin implements Plugin {
  public readonly manifest = { name: "modified-star", contributes: { decorators: ["modified-star"] } };

  /** 每次激活创建独立状态的装饰器实例。 */
  public activate(context: Parameters<Plugin["activate"]>[0]): void {
    context.registerTreeDecorator(new ModifiedStarDecorator());
  }
}

const modifiedStarPlugin = new ModifiedStarPlugin();
export default modifiedStarPlugin;
