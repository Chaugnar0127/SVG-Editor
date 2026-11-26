import { expectCount, numberAt } from "../../application/arguments.js";
import type { SvgElementData } from "../../application/extensions/PluginContracts.js";
import { DiamondShape } from "../../domain/shape/DiamondShape.js";
import type { Shape } from "../../domain/shape/Shape.js";
import { BuiltinShapeProvider } from "./BuiltinShapeProvider.js";

export class DiamondShapeProvider extends BuiltinShapeProvider {
  public readonly name = "diamond";
  public readonly usage = "create diamond <id> <cx> <cy> <width> <height> [fill]";
  public readonly readMarker = { attribute: "data-shape", value: "diamond" } as const;

  public override get elementName(): string {
    return "polygon";
  }

  public create(id: string, parameters: readonly string[]): Shape {
    expectCount(parameters, [4, 5], `${this.usage} [in <containerId>]`);
    return new DiamondShape(
      id,
      numberAt(parameters, 0, "cx"),
      numberAt(parameters, 1, "cy"),
      numberAt(parameters, 2, "width"),
      numberAt(parameters, 3, "height"),
      parameters[4],
    );
  }

  public override canWrite(shape: Shape): boolean {
    return shape instanceof DiamondShape;
  }

  public override write(shape: Shape): SvgElementData {
    if (!(shape instanceof DiamondShape)) throw new TypeError("diamond provider can only write diamond shapes");
    const { cx, cy } = shape.center;
    const { width, height } = shape;
    const attributes = shape.attributes();
    const styles = Object.fromEntries(
      Object.entries(attributes)
        .filter(([name]) => !["cx", "cy", "width", "height"].includes(name))
        .map(([name, value]) => [name, String(value)]),
    );
    return {
      name: this.elementName,
      attributes: {
        "data-shape": this.readMarker.value,
        points: this.points(cx, cy, width, height),
        ...styles,
      },
      text: "",
    };
  }

  protected parametersFromElement(element: SvgElementData): readonly string[] {
    const [cx, cy, width, height] = this.geometryFromPoints(element.attributes.points ?? "");
    const fill = element.attributes.fill;
    const parameters = [cx, cy, width, height];
    return fill === undefined ? parameters : [...parameters, fill];
  }

  protected override consumedAttributes(): readonly string[] {
    return ["points", this.readMarker.attribute, "fill"];
  }

  private points(cx: number, cy: number, width: number, height: number): string {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    return `${cx},${cy - halfHeight} ${cx + halfWidth},${cy} ${cx},${cy + halfHeight} ${cx - halfWidth},${cy}`;
  }

  private geometryFromPoints(value: string): readonly [string, string, string, string] {
    const parts = value.trim().split(/[\s,]+/u);
    if (parts.length !== 8 || parts.some((part) => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(part))) {
      throw new RangeError("diamond polygon must contain four vertices");
    }
    const coordinates = parts.map(Number);
    if (!coordinates.every(Number.isFinite)) throw new RangeError("diamond points must be finite numbers");

    const points = Array.from({ length: 4 }, (_, index) => ({
      x: coordinates[index * 2]!,
      y: coordinates[index * 2 + 1]!,
    }));
    const xs = points.map(({ x }) => x);
    const ys = points.map(({ y }) => y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const width = right - left;
    const height = bottom - top;
    const cx = left + width / 2;
    const cy = top + height / 2;
    const expected = [
      { x: cx, y: top }, { x: right, y: cy }, { x: cx, y: bottom }, { x: left, y: cy },
    ];
    const tolerance = Math.max(1, ...coordinates.map(Math.abs)) * Number.EPSILON * 8;
    const closeTo = (point: { readonly x: number; readonly y: number }, candidate: { readonly x: number; readonly y: number }): boolean =>
      Math.abs(point.x - candidate.x) <= tolerance && Math.abs(point.y - candidate.y) <= tolerance;
    const firstIndex = expected.findIndex((candidate) => closeTo(points[0]!, candidate));
    const forward = firstIndex >= 0 && points.every((point, index) => closeTo(point, expected[(firstIndex + index) % 4]!));
    const reverse = firstIndex >= 0 && points.every((point, index) => closeTo(point, expected[(firstIndex - index + 4) % 4]!));
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(width) || !Number.isFinite(height)
      || width <= 0 || height <= 0 || (!forward && !reverse)) {
      throw new RangeError("diamond polygon points must describe an axis-aligned diamond");
    }
    return [String(cx), String(cy), String(width), String(height)];
  }
}
