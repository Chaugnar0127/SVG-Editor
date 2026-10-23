import type { GeometryChange, ShapeAttributes } from "./Shape.js";
import { StyledShape } from "./StyledShape.js";

interface CircleGeometry { readonly cx: number; readonly cy: number; readonly r: number }

export class CircleShape extends StyledShape {
  public override readonly type = "circle";
  private geometry: CircleGeometry;

  public constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id);
    this.geometry = { cx, cy, r };
    this.validate(this.geometry);
    if (fill !== undefined) super.prepareSet("fill", fill).apply();
  }

  public override attributes(): ShapeAttributes {
    return { ...this.geometry, ...super.attributes() };
  }

  public override prepareMove(dx: number, dy: number): GeometryChange {
    this.finite(dx, dy);
    return this.prepare({ ...this.geometry, cx: this.geometry.cx + dx, cy: this.geometry.cy + dy });
  }

  public override prepareScale(factor: number): GeometryChange {
    this.factor(factor);
    const { cx, cy, r } = this.geometry;
    return this.prepare({ cx: cx * factor, cy: cy * factor, r: r * factor });
  }

  public override prepareSet(attribute: string, value: string): GeometryChange {
    if (!["cx", "cy", "r"].includes(attribute)) return super.prepareSet(attribute, value);
    return this.prepare({ ...this.geometry, [attribute]: this.number(value, attribute) });
  }

  private prepare(next: CircleGeometry): GeometryChange {
    this.validate(next);
    return this.change(this.geometry, next, (geometry) => { this.geometry = geometry; });
  }

  private validate(geometry: CircleGeometry): void {
    this.finite(geometry.cx, geometry.cy);
    this.positive(geometry.r, "radius");
  }
}
