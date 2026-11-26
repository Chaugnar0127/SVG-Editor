import type { Plugin } from "../../application/extensions/PluginContracts.js";
import { CircleShapeProvider } from "./CircleShapeProvider.js";
import { EllipseShapeProvider } from "./EllipseShapeProvider.js";
import { GroupShapeProvider } from "./GroupShapeProvider.js";
import { LineShapeProvider } from "./LineShapeProvider.js";
import { RectShapeProvider } from "./RectShapeProvider.js";
import { TextShapeProvider } from "./TextShapeProvider.js";

/** 将内置图形 provider 接入宿主注册表。 */
export class BuiltinShapesPlugin implements Plugin {
  public readonly manifest = {
    name: "builtin-shapes",
    contributes: { shapes: ["rect", "circle", "ellipse", "line", "text", "g"] },
  };

  public activate(context: Parameters<Plugin["activate"]>[0]): void {
    for (const provider of [
      new RectShapeProvider(),
      new CircleShapeProvider(),
      new EllipseShapeProvider(),
      new LineShapeProvider(),
      new TextShapeProvider(),
      new GroupShapeProvider(),
    ]) {
      context.registerShapeProvider(provider);
    }
  }
}

const builtinShapesPlugin = new BuiltinShapesPlugin();
export default builtinShapesPlugin;
