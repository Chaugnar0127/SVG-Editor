import { GroupShape } from "../shape/GroupShape.js";
import { RectShape } from "../shape/RectShape.js";
import type { Shape } from "../shape/Shape.js";

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
    this.expectCount(
      parameters,
      [4, 5],
      "create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]",
    );

    return new RectShape(
      id,
      this.numberAt(parameters, 0, "x"),
      this.numberAt(parameters, 1, "y"),
      this.numberAt(parameters, 2, "width"),
      this.numberAt(parameters, 3, "height"),
      parameters[4],
    );
  }

  private createGroup(id: string, parameters: readonly string[]): GroupShape {
    this.expectCount(parameters, [0], "create g <id> [in <containerId>]");

    return new GroupShape(id);
  }

  private expectCount(
    parameters: readonly string[],
    allowed: readonly number[],
    usage: string,
  ): void {
    if (!allowed.includes(parameters.length)) {
      throw new RangeError(`usage: ${usage}`);
    }
  }

  private numberAt(
    parameters: readonly string[],
    index: number,
    label: string,
  ): number {
    const raw = parameters[index];

    if (raw === undefined || raw.trim().length === 0) {
      throw new RangeError(`${label} must be a finite number`);
    }

    const value = Number(raw);

    if (!Number.isFinite(value)) {
      throw new RangeError(`${label} must be a finite number`);
    }

    return value;
  }
}
