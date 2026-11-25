import { expectCount, numberAt } from "../../application/arguments.js";
import type { SvgElementData } from "../../application/extensions/PluginContracts.js";
import { EllipseShape } from "../../domain/shape/EllipseShape.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { BuiltinShapeProvider } from "./BuiltinShapeProvider.js";

export class EllipseShapeProvider extends BuiltinShapeProvider {
  public readonly name = "ellipse";

  public create(id: string, parameters: readonly string[]): Shape {
    expectCount(parameters, [4, 5], "create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]");
    return new EllipseShape(
      id,
      numberAt(parameters, 0, "cx"),
      numberAt(parameters, 1, "cy"),
      numberAt(parameters, 2, "rx"),
      numberAt(parameters, 3, "ry"),
      parameters[4],
    );
  }

  protected parametersFromElement(element: SvgElementData): readonly string[] {
    const parameters = [
      this.numberOrZero(element, "cx"),
      this.numberOrZero(element, "cy"),
      this.requiredNumber(element, "rx"),
      this.requiredNumber(element, "ry"),
    ];
    const fill = element.attributes.fill;
    return fill === undefined ? parameters : [...parameters, fill];
  }

  protected override consumedAttributes(): readonly string[] {
    return ["cx", "cy", "rx", "ry", "fill"];
  }
}
