import { expectCount, numberAt } from "../../application/arguments.js";
import type { SvgElementData } from "../../application/extensions/PluginContracts.js";
import { LineShape } from "../../domain/shape/LineShape.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { BuiltinShapeProvider } from "./BuiltinShapeProvider.js";

export class LineShapeProvider extends BuiltinShapeProvider {
  public readonly name = "line";
  public readonly usage = "create line <id> <x1> <y1> <x2> <y2> [stroke]";

  public create(id: string, parameters: readonly string[]): Shape {
    expectCount(parameters, [4, 5], `${this.usage} [in <containerId>]`);
    return new LineShape(
      id,
      numberAt(parameters, 0, "x1"),
      numberAt(parameters, 1, "y1"),
      numberAt(parameters, 2, "x2"),
      numberAt(parameters, 3, "y2"),
      parameters[4],
    );
  }

  protected parametersFromElement(element: SvgElementData): readonly string[] {
    const parameters = [
      this.numberOrZero(element, "x1"),
      this.numberOrZero(element, "y1"),
      this.numberOrZero(element, "x2"),
      this.numberOrZero(element, "y2"),
    ];
    const stroke = element.attributes.stroke;
    return stroke === undefined ? parameters : [...parameters, stroke];
  }

  protected override consumedAttributes(): readonly string[] {
    return ["x1", "y1", "x2", "y2", "stroke"];
  }
}
