import { GroupShape } from "../domain/shape/GroupShape.js";
import { RectShape } from "../domain/shape/RectShape.js";
import { CircleShape } from "../domain/shape/CircleShape.js";
import { EllipseShape } from "../domain/shape/EllipseShape.js";
import { LineShape } from "../domain/shape/LineShape.js";
import { TextShape } from "../domain/shape/TextShape.js";
import type { Shape } from "../domain/shape/Shape.js";
import { expectCount, numberAt } from "./arguments.js";

type ShapeCreator = (id: string, parameters: readonly string[]) => Shape;
interface ShapeDefinition {
  readonly create: ShapeCreator;
  readonly geometry: readonly string[];
  readonly hasText?: boolean;
}

export class ShapeFactory {
  private readonly definitions: ReadonlyMap<string, ShapeDefinition> = new Map<string, ShapeDefinition>([
    ["rect", { create: (id, parameters) => this.createRect(id, parameters), geometry: ["x", "y", "width", "height"] }],
    ["g", { create: (id, parameters) => this.createGroup(id, parameters), geometry: [] }],
    ["circle", { create: (id, parameters) => this.createCircle(id, parameters), geometry: ["cx", "cy", "r"] }],
    ["ellipse", { create: (id, parameters) => this.createEllipse(id, parameters), geometry: ["cx", "cy", "rx", "ry"] }],
    ["line", { create: (id, parameters) => this.createLine(id, parameters), geometry: ["x1", "y1", "x2", "y2"] }],
    ["text", { create: (id, parameters) => this.createText(id, parameters), geometry: ["x", "y"], hasText: true }],
  ]);

  /** 根据类型及其专属参数构造图形，不修改任何文档。 */
  public create(
    type: string,
    id: string,
    parameters: readonly string[],
  ): Shape {
    const definition = this.definition(type);

    if (id.length === 0 || /\s/u.test(id)) {
      throw new RangeError(
        "shape id must be non-empty and contain no whitespace",
      );
    }

    return definition.create(id, parameters);
  }

  /** 导入器传普通属性，不把 XML 库类型带进应用层；类型分派仍只有此工厂。 */
  public fromAttributes(type: string, id: string, attributes: Readonly<Record<string, string>>, text: string): Shape {
    const definition = this.definition(type);
    const coordinates = new Set(["x", "y", "cx", "cy", "x1", "y1", "x2", "y2"]);
    const parameters = definition.geometry.map((name) => this.svgNumber(attributes[name] ?? (coordinates.has(name) ? "0" : ""), name));
    if (definition.hasText) parameters.push(text);
    else if (text.trim().length !== 0) throw new RangeError(`unexpected text in <${type}>`);
    const shape = this.create(type, id, parameters);
    for (const [name, value] of Object.entries(attributes)) {
      if (name === "text") throw new RangeError("text content must be an XML text node");
      shape.prepareSet(name, definition.geometry.includes(name) || name === "stroke-width" ? this.svgNumber(value, name) : value).apply();
    }
    return shape;
  }

  private definition(type: string): ShapeDefinition {
    const definition = this.definitions.get(type);
    if (definition === undefined) throw new RangeError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition;
  }

  private svgNumber(value: string, label: string): string {
    const numeric = value.trim().replace(/px$/u, "");
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(numeric)) {
      throw new RangeError(`${label} must be a finite number`);
    }
    return numeric;
  }

  private createRect(id: string, parameters: readonly string[]): RectShape {
    expectCount(
      parameters,
      [4, 5],
      "create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]",
    );

    return new RectShape(
      id,
      numberAt(parameters, 0, "x"),
      numberAt(parameters, 1, "y"),
      numberAt(parameters, 2, "width"),
      numberAt(parameters, 3, "height"),
      parameters[4],
    );
  }

  private createGroup(id: string, parameters: readonly string[]): GroupShape {
    expectCount(parameters, [0], "create g <id> [in <containerId>]");

    return new GroupShape(id);
  }

  private createCircle(id: string, parameters: readonly string[]): CircleShape {
    expectCount(parameters, [3, 4], "create circle <id> <cx> <cy> <r> [fill] [in <containerId>]");
    return new CircleShape(id, numberAt(parameters, 0, "cx"), numberAt(parameters, 1, "cy"),
      numberAt(parameters, 2, "r"), parameters[3]);
  }

  private createEllipse(id: string, parameters: readonly string[]): EllipseShape {
    expectCount(parameters, [4, 5], "create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]");
    return new EllipseShape(id, numberAt(parameters, 0, "cx"), numberAt(parameters, 1, "cy"),
      numberAt(parameters, 2, "rx"), numberAt(parameters, 3, "ry"), parameters[4]);
  }

  private createLine(id: string, parameters: readonly string[]): LineShape {
    expectCount(parameters, [4, 5], "create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]");
    return new LineShape(id, numberAt(parameters, 0, "x1"), numberAt(parameters, 1, "y1"),
      numberAt(parameters, 2, "x2"), numberAt(parameters, 3, "y2"), parameters[4]);
  }

  private createText(id: string, parameters: readonly string[]): TextShape {
    expectCount(parameters, [3], 'create text <id> <x> <y> "content" [in <containerId>]');
    return new TextShape(id, numberAt(parameters, 0, "x"), numberAt(parameters, 1, "y"), parameters[2]!);
  }
}
