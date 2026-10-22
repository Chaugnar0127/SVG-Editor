import { GroupShape } from "../domain/shape/GroupShape.js";
import { RectShape } from "../domain/shape/RectShape.js";
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
}
