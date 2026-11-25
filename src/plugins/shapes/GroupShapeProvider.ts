import { expectCount } from "../../application/arguments.js";
import type { SvgElementData } from "../../application/extensions/PluginContracts.js";
import { GroupShape } from "../../domain/shape/GroupShape.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { BuiltinShapeProvider } from "./BuiltinShapeProvider.js";

export class GroupShapeProvider extends BuiltinShapeProvider {
  public readonly name = "g";

  public create(id: string, parameters: readonly string[]): Shape {
    expectCount(parameters, [0], "create g <id> [in <containerId>]");
    return new GroupShape(id);
  }

  protected parametersFromElement(_element: SvgElementData): readonly string[] {
    return [];
  }

  protected override ignoresAttribute(name: string): boolean {
    return name === "data-kind";
  }
}
