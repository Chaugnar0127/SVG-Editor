import { GroupShape } from "../domain/shape/GroupShape.js";
import { RectShape } from "../domain/shape/RectShape.js";
import { CircleShape } from "../domain/shape/CircleShape.js";
import { EllipseShape } from "../domain/shape/EllipseShape.js";
import { LineShape } from "../domain/shape/LineShape.js";
import { TextShape } from "../domain/shape/TextShape.js";
import type { Shape } from "../domain/shape/Shape.js";
import { expectCount, numberAt } from "./arguments.js";

type ShapeCreator = (id: string, parameters: readonly string[]) => Shape;

export class ShapeFactory {
  private readonly creators: ReadonlyMap<string, ShapeCreator> = new Map<
    string,
    ShapeCreator
  >([
    ["rect", (id, parameters) => this.createRect(id, parameters)],
    ["g", (id, parameters) => this.createGroup(id, parameters)],
    ["circle", (id, parameters) => this.createCircle(id, parameters)],
    ["ellipse", (id, parameters) => this.createEllipse(id, parameters)],
    ["line", (id, parameters) => this.createLine(id, parameters)],
    ["text", (id, parameters) => this.createText(id, parameters)],
  ]);

  /** 根据类型及其专属参数构造图形，不修改任何文档。 */
  public create(
    type: string,
    id: string,
    parameters: readonly string[],
  ): Shape {
    const creator = this.creators.get(type);

    if (creator === undefined) {
      throw new RangeError(
        `unknown shape type: ${type} (is the plugin loaded?)`,
      );
    }

    if (id.length === 0 || /\s/u.test(id)) {
      throw new RangeError(
        "shape id must be non-empty and contain no whitespace",
      );
    }

    return creator(id, parameters);
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
