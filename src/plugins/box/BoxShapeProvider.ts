import { BoxShape } from "./BoxShape.js";
import type { ShapeProvider, SvgElementData } from "../../application/extensions/PluginContracts.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { RectShape } from "../../domain/shape/RectShape.js";
import { TextShape } from "../../domain/shape/TextShape.js";
import { expectCount, numberAt } from "../../application/arguments.js";

export class BoxShapeProvider implements ShapeProvider {
  public readonly name = "box";
  public readonly usage = 'create box <id> <x> <y> <w> <h> "label"';
  public readonly elementName = "g";
  public readonly readMarker = { attribute: "data-kind", value: "box" };

  /** 构造固定的矩形与标题子图形；新增子树由文档一次性校验 ID。 */
  public create(id: string, parameters: readonly string[]): BoxShape {
    expectCount(parameters, [5], `${this.usage} [in <containerId>]`);
    const x = numberAt(parameters, 0, "x");
    const y = numberAt(parameters, 1, "y");
    const width = numberAt(parameters, 2, "width");
    const height = numberAt(parameters, 3, "height");
    const label = parameters[4]!;
    return new BoxShape(
      id,
      new RectShape(`${id}-rect`, x, y, width, height, "#4a90d9"),
      new TextShape(`${id}-label`, x + 20, y + 35, label),
    );
  }

  public canRead(element: SvgElementData): boolean {
    return element.name === this.elementName && element.attributes[this.readMarker.attribute] === this.readMarker.value;
  }

  /** 要求读入节点包含派生 ID 与类型完全匹配的矩形和文本。 */
  public read(element: SvgElementData, id: string, children: readonly Shape[]): BoxShape {
    if (!this.canRead(element)) throw new RangeError("invalid box marker");
    if (element.text.trim().length !== 0) throw new RangeError("unexpected text in <g>");
    const rectangle = children.find((child) => child.id === `${id}-rect`);
    const label = children.find((child) => child.id === `${id}-label`);
    if (rectangle === undefined || label === undefined) {
      throw new RangeError(`invalid box structure: missing required children for ${id}`);
    }
    if (!(rectangle instanceof RectShape)) {
      throw new RangeError(`invalid box structure: expected rect#${id}-rect`);
    }
    if (!(label instanceof TextShape)) {
      throw new RangeError(`invalid box structure: expected text#${id}-label`);
    }
    const box = new BoxShape(id, rectangle, label, children);
    for (const [name, value] of Object.entries(element.attributes)) {
      if (name !== this.readMarker.attribute) box.prepareSet(name, value).apply();
    }
    return box;
  }

  public canWrite(shape: Shape): boolean { return shape instanceof BoxShape; }

  public write(shape: Shape): SvgElementData {
    if (!(shape instanceof BoxShape)) throw new TypeError("box provider received a non-box shape");
    const attributes: Record<string, string> = { [this.readMarker.attribute]: this.readMarker.value };
    for (const [name, value] of Object.entries(shape.attributes())) attributes[name] = String(value);
    return { name: this.elementName, attributes, text: "" };
  }
}
