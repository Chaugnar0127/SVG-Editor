import type { GeometryChange, ShapeAttributes } from "./Shape.js";
import { StyledShape } from "./StyledShape.js";

interface LineGeometry { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }

export class LineShape extends StyledShape {
  public override readonly type = "line";
  private geometry: LineGeometry;

  public constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string) {
    super(id);
    this.geometry = { x1, y1, x2, y2 };
    this.finite(x1, y1, x2, y2);
    if (stroke !== undefined) super.prepareSet("stroke", stroke).apply();
  }

  public override attributes(): ShapeAttributes {
    return { ...this.geometry, ...super.attributes() };
  }

  public override prepareMove(dx: number, dy: number): GeometryChange {
    this.finite(dx, dy);
    const { x1, y1, x2, y2 } = this.geometry;
    return this.prepare({ x1: x1 + dx, y1: y1 + dy, x2: x2 + dx, y2: y2 + dy });
  }

  public override prepareScale(factor: number): GeometryChange {
    this.factor(factor);
    const { x1, y1, x2, y2 } = this.geometry;
    return this.prepare({ x1: x1 * factor, y1: y1 * factor, x2: x2 * factor, y2: y2 * factor });
  }

  public override prepareSet(attribute: string, value: string): GeometryChange {
    if (!["x1", "y1", "x2", "y2"].includes(attribute)) return super.prepareSet(attribute, value);
    return this.prepare({ ...this.geometry, [attribute]: this.number(value, attribute) });
  }

  private prepare(next: LineGeometry): GeometryChange {
    this.finite(next.x1, next.y1, next.x2, next.y2);
    return this.change(this.geometry, next, (geometry) => { this.geometry = geometry; });
  }
}
