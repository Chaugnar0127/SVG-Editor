import type { GeometryChange, ShapeAttributes } from "./Shape.js";
import { StyledShape } from "./StyledShape.js";

interface DiamondGeometry {
  readonly cx: number;
  readonly cy: number;
  readonly width: number;
  readonly height: number;
}

/** 以中心点和两条对角线长度定义的菱形判断框。 */
export class DiamondShape extends StyledShape {
  public override readonly type = "diamond";
  private geometry: DiamondGeometry;

  public constructor(id: string, cx: number, cy: number, width: number, height: number, fill?: string) {
    super(id);
    this.geometry = { cx, cy, width, height };
    this.validate(this.geometry);
    if (fill !== undefined) super.prepareSet("fill", fill).apply();
  }

  public get center(): { readonly cx: number; readonly cy: number } {
    return { cx: this.geometry.cx, cy: this.geometry.cy };
  }

  public get width(): number {
    return this.geometry.width;
  }

  public get height(): number {
    return this.geometry.height;
  }

  public override attributes(): ShapeAttributes {
    return { ...this.geometry, ...super.attributes() };
  }

  public override prepareMove(dx: number, dy: number): GeometryChange {
    this.finite(dx, dy);
    return this.prepare({
      ...this.geometry,
      cx: this.geometry.cx + dx,
      cy: this.geometry.cy + dy,
    });
  }

  public override prepareScale(factor: number): GeometryChange {
    this.factor(factor);
    const { cx, cy, width, height } = this.geometry;
    return this.prepare({ cx: cx * factor, cy: cy * factor, width: width * factor, height: height * factor });
  }

  public override prepareSet(attribute: string, value: string): GeometryChange {
    if (!["cx", "cy", "width", "height"].includes(attribute)) return super.prepareSet(attribute, value);
    return this.prepare({ ...this.geometry, [attribute]: this.number(value, attribute) });
  }

  private prepare(next: DiamondGeometry): GeometryChange {
    this.validate(next);
    return this.change(this.geometry, next, (geometry) => { this.geometry = geometry; });
  }

  private validate(geometry: DiamondGeometry): void {
    this.finite(geometry.cx, geometry.cy);
    this.positive(geometry.width, "width");
    this.positive(geometry.height, "height");
    const left = geometry.cx - geometry.width / 2;
    const right = geometry.cx + geometry.width / 2;
    const top = geometry.cy - geometry.height / 2;
    const bottom = geometry.cy + geometry.height / 2;
    this.finite(left, right, top, bottom);
    if (left === right || top === bottom) {
      throw new RangeError("diamond dimensions must produce distinct finite vertices");
    }
  }
}
