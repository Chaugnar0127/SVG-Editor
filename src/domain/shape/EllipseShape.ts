import type { GeometryChange, ShapeAttributes } from "./Shape.js";
import { StyledShape } from "./StyledShape.js";

interface EllipseGeometry { readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number }

export class EllipseShape extends StyledShape {
  public override readonly type = "ellipse";
  private geometry: EllipseGeometry;

  public constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string) {
    super(id);
    this.geometry = { cx, cy, rx, ry };
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
    const { cx, cy, rx, ry } = this.geometry;
    return this.prepare({ cx: cx * factor, cy: cy * factor, rx: rx * factor, ry: ry * factor });
  }

  public override prepareSet(attribute: string, value: string): GeometryChange {
    if (!["cx", "cy", "rx", "ry"].includes(attribute)) return super.prepareSet(attribute, value);
    return this.prepare({ ...this.geometry, [attribute]: this.number(value, attribute) });
  }

  private prepare(next: EllipseGeometry): GeometryChange {
    this.validate(next);
    return this.change(this.geometry, next, (geometry) => { this.geometry = geometry; });
  }

  private validate(geometry: EllipseGeometry): void {
    this.finite(geometry.cx, geometry.cy);
    this.positive(geometry.rx, "rx");
    this.positive(geometry.ry, "ry");
  }
}
