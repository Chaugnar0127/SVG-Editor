import { BoxShape } from "./BoxShape.js";
import type { AttributeHandler, Plugin, ShapeProvider, SvgElementData } from "../../application/extensions/PluginContracts.js";
import type { TreeDecorationTarget, TreeDecorator } from "../../domain/TreeDecorator.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { RectShape } from "../../domain/shape/RectShape.js";
import { TextShape } from "../../domain/shape/TextShape.js";

class BoxShapeProvider implements ShapeProvider {
  public readonly name = "box";
  public readonly elementName = "g";
  public readonly readMarker = { attribute: "data-kind", value: "box" };

  /** 构造固定的矩形与标题子图形；新增子树由文档一次性校验 ID。 */
  public create(id: string, parameters: readonly string[]): BoxShape {
    if (parameters.length !== 5) {
      throw new RangeError('usage: create box <id> <x> <y> <w> <h> "label" [in <containerId>]');
    }
    const [x, y, width, height, label] = parameters;
    if (x === undefined || y === undefined || width === undefined || height === undefined || label === undefined) {
      throw new RangeError('usage: create box <id> <x> <y> <w> <h> "label" [in <containerId>]');
    }
    return new BoxShape(
      id,
      new RectShape(`${id}-rect`, number(x, "x"), number(y, "y"), number(width, "width"), number(height, "height")),
      new TextShape(`${id}-label`, number(x, "x") + 20, number(y, "y") + 35, label),
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

class BoxAttributeHandler implements AttributeHandler {
  public readonly name = "box-attributes";

  public handles(shape: Shape, attribute: string): boolean {
    return shape instanceof BoxShape && (attribute === "fill" || attribute === "label");
  }

  public prepare(shape: Shape, attribute: string, value: string) {
    if (!(shape instanceof BoxShape)) throw new TypeError("box attribute handler received a non-box shape");
    return attribute === "fill"
      ? shape.rectangle.prepareSet("fill", value)
      : shape.label.prepareSet("text", value);
  }
}

class BoxTypeDecorator implements TreeDecorator {
  public readonly name = "box-type-label";

  public decorate(target: TreeDecorationTarget): readonly string[] {
    return target.shape instanceof BoxShape ? ["(box)"] : [];
  }
}

/** 一个插件共同提供 box 图形、其属性语义和树标签。 */
export class BoxPlugin implements Plugin {
  public readonly manifest = {
    name: "box",
    contributes: {
      shapes: ["box"],
      attributes: ["box-attributes"],
      decorators: ["box-type-label"],
    },
  };

  public activate(context: Parameters<Plugin["activate"]>[0]): void {
    context.registerShapeProvider(new BoxShapeProvider());
    context.registerAttributeHandler(new BoxAttributeHandler());
    context.registerTreeDecorator(new BoxTypeDecorator());
  }
}

function number(value: string, label: string): number {
  if (value.trim().length === 0 || !Number.isFinite(Number(value))) {
    throw new RangeError(`${label} must be a finite number`);
  }
  return Number(value);
}

const boxPlugin = new BoxPlugin();
export default boxPlugin;
