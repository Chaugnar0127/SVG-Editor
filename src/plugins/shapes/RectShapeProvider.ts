import { expectCount, numberAt } from "../../application/arguments.js";
import type { SvgElementData } from "../../application/extensions/PluginContracts.js";
import { RectShape } from "../../domain/shape/RectShape.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { BuiltinShapeProvider } from "./BuiltinShapeProvider.js";

export class RectShapeProvider extends BuiltinShapeProvider {
  public readonly name = "rect";

  public create(id: string, parameters: readonly string[]): Shape {
    expectCount(parameters, [4, 5], "create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]");
    return new RectShape(
      id,
      numberAt(parameters, 0, "x"),
      numberAt(parameters, 1, "y"),
      numberAt(parameters, 2, "width"),
      numberAt(parameters, 3, "height"),
      parameters[4],
    );
  }

  protected parametersFromElement(element: SvgElementData): readonly string[] {
    const parameters = [
      this.numberOrZero(element, "x"),
      this.numberOrZero(element, "y"),
      this.requiredNumber(element, "width"),
      this.requiredNumber(element, "height"),
    ];
    const fill = element.attributes.fill;
    return fill === undefined ? parameters : [...parameters, fill];
  }

  protected override consumedAttributes(): readonly string[] {
    return ["x", "y", "width", "height", "fill"];
  }
}
