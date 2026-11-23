import { expectCount, numberAt } from "../../application/arguments.js";
import type { Plugin, ShapeProvider, SvgElementData } from "../../application/extensions/PluginContracts.js";
import { CircleShape } from "../../domain/shape/CircleShape.js";
import { EllipseShape } from "../../domain/shape/EllipseShape.js";
import { GroupShape } from "../../domain/shape/GroupShape.js";
import { LineShape } from "../../domain/shape/LineShape.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { isContainerShape } from "../../domain/shape/Shape.js";
import { RectShape } from "../../domain/shape/RectShape.js";
import { TextShape } from "../../domain/shape/TextShape.js";

type ShapeType = "rect" | "g" | "circle" | "ellipse" | "line" | "text";

/** 单个适配器封装一种内置图形的 CLI 参数和 SVG 读回规则。 */
class BuiltinShapeProvider implements ShapeProvider {
  public readonly name: ShapeType;
  public readonly elementName: string;

  public constructor(private readonly type: ShapeType) {
    this.name = type;
    this.elementName = type;
  }

  public create(id: string, parameters: readonly string[]): Shape {
    switch (this.type) {
      case "rect":
        expectCount(parameters, [4, 5], "create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]");
        return new RectShape(id, numberAt(parameters, 0, "x"), numberAt(parameters, 1, "y"),
          numberAt(parameters, 2, "width"), numberAt(parameters, 3, "height"), parameters[4]);
      case "g":
        expectCount(parameters, [0], "create g <id> [in <containerId>]");
        return new GroupShape(id);
      case "circle":
        expectCount(parameters, [3, 4], "create circle <id> <cx> <cy> <r> [fill] [in <containerId>]");
        return new CircleShape(id, numberAt(parameters, 0, "cx"), numberAt(parameters, 1, "cy"),
          numberAt(parameters, 2, "r"), parameters[3]);
      case "ellipse":
        expectCount(parameters, [4, 5], "create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]");
        return new EllipseShape(id, numberAt(parameters, 0, "cx"), numberAt(parameters, 1, "cy"),
          numberAt(parameters, 2, "rx"), numberAt(parameters, 3, "ry"), parameters[4]);
      case "line":
        expectCount(parameters, [4, 5], "create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]");
        return new LineShape(id, numberAt(parameters, 0, "x1"), numberAt(parameters, 1, "y1"),
          numberAt(parameters, 2, "x2"), numberAt(parameters, 3, "y2"), parameters[4]);
      case "text":
        expectCount(parameters, [3], 'create text <id> <x> <y> "content" [in <containerId>]');
        return new TextShape(id, numberAt(parameters, 0, "x"), numberAt(parameters, 1, "y"), parameters[2]!);
    }
  }

  public canRead(element: SvgElementData): boolean {
    return element.name === this.elementName;
  }

  /** 将 SVG 属性转成该图形的既有构造参数，再使用模型校验样式与几何值。 */
  public read(element: SvgElementData, id: string, children: readonly Shape[]): Shape {
    const attributes = element.attributes;
    const numberOrZero = (name: string): string => numericAttribute(attributes[name] ?? "0", name);
    const parameters: readonly string[] = (() => {
      switch (this.type) {
        case "rect": return [numberOrZero("x"), numberOrZero("y"), numericAttribute(attributes.width ?? "", "width"), numericAttribute(attributes.height ?? "", "height"), ...(attributes.fill === undefined ? [] : [attributes.fill])];
        case "g": return [];
        case "circle": return [numberOrZero("cx"), numberOrZero("cy"), numericAttribute(attributes.r ?? "", "r"), ...(attributes.fill === undefined ? [] : [attributes.fill])];
        case "ellipse": return [numberOrZero("cx"), numberOrZero("cy"), numericAttribute(attributes.rx ?? "", "rx"), numericAttribute(attributes.ry ?? "", "ry"), ...(attributes.fill === undefined ? [] : [attributes.fill])];
        case "line": return [numberOrZero("x1"), numberOrZero("y1"), numberOrZero("x2"), numberOrZero("y2"), ...(attributes.stroke === undefined ? [] : [attributes.stroke])];
        case "text": return [numberOrZero("x"), numberOrZero("y"), element.text];
      }
    })();
    const shape = this.create(id, parameters);
    const geometry = new Set(this.geometryAttributes());
    for (const [name, value] of Object.entries(attributes)) {
      if (this.type === "g" && name === "data-kind") continue;
      if (geometry.has(name) || name === "fill" && this.type !== "g" || name === "stroke" && this.type === "line") continue;
      if (name === "text") throw new RangeError("text content must be an XML text node");
      shape.prepareSet(name, name === "stroke-width" ? numericAttribute(value, name) : value).apply();
    }
    if (this.type !== "text" && element.text.trim().length !== 0) {
      throw new RangeError(`unexpected text in <${this.type}>`);
    }
    if (children.length > 0 && !isContainerShape(shape)) {
      throw new RangeError(`children are not supported in <${this.type}>`);
    }
    if (isContainerShape(shape)) for (const child of children) shape.add(child);
    return shape;
  }

  public canWrite(_shape: Shape): boolean { return false; }
  public write(_shape: Shape): SvgElementData { throw new Error("built-in shapes use the default SVG writer"); }

  private geometryAttributes(): readonly string[] {
    switch (this.type) {
      case "rect": return ["x", "y", "width", "height"];
      case "g": return [];
      case "circle": return ["cx", "cy", "r"];
      case "ellipse": return ["cx", "cy", "rx", "ry"];
      case "line": return ["x1", "y1", "x2", "y2"];
      case "text": return ["x", "y"];
    }
  }
}

export class BuiltinShapesPlugin implements Plugin {
  public readonly manifest = {
    name: "builtin-shapes",
    contributes: { shapes: ["rect", "g", "circle", "ellipse", "line", "text"] },
  };

  /** 六种 Phase 1 图形通过同一注册机制加入宿主。 */
  public activate(context: Parameters<Plugin["activate"]>[0]): void {
    for (const type of ["rect", "g", "circle", "ellipse", "line", "text"] as const) {
      context.registerShapeProvider(new BuiltinShapeProvider(type));
    }
  }
}

function numericAttribute(value: string, label: string): string {
  const numeric = value.trim().replace(/px$/u, "");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(numeric)) {
    throw new RangeError(`${label} must be a finite number`);
  }
  return numeric;
}

const builtinShapesPlugin = new BuiltinShapesPlugin();
export default builtinShapesPlugin;
