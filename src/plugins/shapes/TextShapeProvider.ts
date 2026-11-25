import { expectCount, numberAt } from "../../application/arguments.js";
import type { SvgElementData } from "../../application/extensions/PluginContracts.js";
import { TextShape } from "../../domain/shape/TextShape.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { BuiltinShapeProvider } from "./BuiltinShapeProvider.js";

export class TextShapeProvider extends BuiltinShapeProvider {
  public readonly name = "text";

  public create(id: string, parameters: readonly string[]): Shape {
    expectCount(parameters, [3], 'create text <id> <x> <y> "content" [in <containerId>]');
    return new TextShape(
      id,
      numberAt(parameters, 0, "x"),
      numberAt(parameters, 1, "y"),
      parameters[2]!,
    );
  }

  protected parametersFromElement(element: SvgElementData): readonly string[] {
    return [this.numberOrZero(element, "x"), this.numberOrZero(element, "y"), element.text];
  }

  protected override consumedAttributes(): readonly string[] {
    return ["x", "y"];
  }

  protected override acceptsText(): boolean {
    return true;
  }
}
