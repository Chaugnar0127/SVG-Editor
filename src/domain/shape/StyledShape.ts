import type { GeometryChange, Shape, ShapeAttributes } from "./Shape.js";

/** 共享 ID、呈现属性和局部恢复逻辑；几何规则仍由具体图形维护。 */
export abstract class StyledShape implements Shape {
  public abstract readonly type: string;
  private style: Record<string, string | number> = {};

  public constructor(public readonly id: string) {
    if (id.length === 0 || /\s/u.test(id)) {
      throw new RangeError("shape id must be non-empty and contain no whitespace");
    }
  }

  public attributes(): ShapeAttributes {
    return { ...this.style };
  }

  public children(): readonly Shape[] {
    return [];
  }

  public abstract prepareMove(dx: number, dy: number): GeometryChange;
  public abstract prepareScale(factor: number): GeometryChange;

  public prepareSet(attribute: string, value: string): GeometryChange {
    if (!["fill", "stroke", "stroke-width"].includes(attribute)) {
      throw new RangeError(`unknown attribute: ${attribute}`);
    }
    let next: string | number = value;
    if (attribute === "stroke-width") {
      next = this.number(value, attribute);
      if (next < 0) throw new RangeError("stroke-width must not be negative");
    } else if (value.trim().length === 0) {
      throw new RangeError(`${attribute} must not be empty`);
    }
    return this.change<string | number | undefined>(this.style[attribute], next, (style) => {
      if (style === undefined) delete this.style[attribute];
      else this.style[attribute] = style;
    });
  }

  protected change<T>(previous: T, next: T, assign: (value: T) => void): GeometryChange {
    return { apply: () => assign(next), undo: () => assign(previous) };
  }

  protected number(value: string, label: string): number {
    const number = Number(value);
    if (value.trim().length === 0 || !Number.isFinite(number)) {
      throw new RangeError(`${label} must be a finite number`);
    }
    return number;
  }

  protected finite(...values: number[]): void {
    if (!values.every(Number.isFinite)) {
      throw new RangeError("shape coordinates must remain finite");
    }
  }

  protected positive(value: number, label: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${label} must be a positive finite number`);
    }
  }

  protected factor(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError("scale factor must be positive");
    }
  }
}
