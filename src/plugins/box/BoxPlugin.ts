import { BoxTypeDecorator } from "./BoxTypeDecorator.js";
import { BoxAttributeHandler } from "./BoxAttributeHandler.js";
import { BoxShapeProvider } from "./BoxShapeProvider.js";
import type { Plugin } from "../../application/extensions/PluginContracts.js";

/** 一个插件共同提供 box 图形、其属性语义和树标签。 */
export class BoxPlugin implements Plugin {
  public readonly manifest = {
    name: "box",
    contributes: {
      shapes: ["box"],
      attributes: ["box-attributes"],
      decorators: ["box-type-label"],
    },
  };

  public activate(context: Parameters<Plugin["activate"]>[0]): void {
    context.registerShapeProvider(new BoxShapeProvider());
    context.registerAttributeHandler(new BoxAttributeHandler());
    context.registerTreeDecorator(new BoxTypeDecorator());
  }
}

const boxPlugin = new BoxPlugin();
export default boxPlugin;
