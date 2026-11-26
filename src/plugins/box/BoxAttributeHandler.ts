import { BoxShape } from "./BoxShape.js";
import type { AttributeHandler } from "../../application/extensions/PluginContracts.js";
import type { GeometryChange, Shape } from "../../domain/shape/Shape.js";

export class BoxAttributeHandler implements AttributeHandler {
  public readonly name = "box-attributes";

  public handles(shape: Shape, attribute: string): boolean {
    return shape instanceof BoxShape && (attribute === "fill" || attribute === "label");
  }

  public prepare(shape: Shape, attribute: string, value: string): GeometryChange {
    if (!(shape instanceof BoxShape)) throw new TypeError("box attribute handler received a non-box shape");
    return attribute === "fill"
      ? shape.rectangle.prepareSet("fill", value)
      : shape.label.prepareSet("text", value);
  }
}
