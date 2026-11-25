import { expectCount, numberAt } from "../../application/arguments.js";
import type { SvgElementData } from "../../application/extensions/PluginContracts.js";
import { CircleShape } from "../../domain/shape/CircleShape.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { BuiltinShapeProvider } from "./BuiltinShapeProvider.js";

export class CircleShapeProvider extends BuiltinShapeProvider {
  public readonly name = "circle";

  public create(id: string, parameters: readonly string[]): Shape {
    expectCount(parameters, [3, 4], "create circle <id> <cx> <cy> <r> [fill] [in <containerId>]");
    return new CircleShape(
      id,
      numberAt(parameters, 0, "cx"),
      numberAt(parameters, 1, "cy"),
      numberAt(parameters, 2, "r"),
      parameters[3],
    );
  }

  protected parametersFromElement(element: SvgElementData): readonly string[] {
    const parameters = [
      this.numberOrZero(element, "cx"),
      this.numberOrZero(element, "cy"),
      this.requiredNumber(element, "r"),
    ];
    const fill = element.attributes.fill;
    return fill === undefined ? parameters : [...parameters, fill];
  }

  protected override consumedAttributes(): readonly string[] {
    return ["cx", "cy", "r", "fill"];
  }
}
