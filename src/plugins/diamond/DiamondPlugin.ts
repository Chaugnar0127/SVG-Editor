import type { Plugin, PluginContext } from "../../application/extensions/PluginContracts.js";
import { DiamondShapeProvider } from "./DiamondShapeProvider.js";

export class DiamondPlugin implements Plugin {
  public readonly manifest = {
    name: "diamond",
    contributes: { shapes: ["diamond"] },
  };

  public activate(context: PluginContext): void {
    context.registerShapeProvider(new DiamondShapeProvider());
  }
}

export default new DiamondPlugin();
