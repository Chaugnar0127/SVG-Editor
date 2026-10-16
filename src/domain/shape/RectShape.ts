import type { Shape } from "./Shape.js";

export class RectShape implements Shape {
  private widthValue: number;
  private heightValue: number;

  public constructor(
    public readonly id: string,
    private x: number,
    private y: number,
    width: number,
    height: number,
  ) {
    if (!Number.isFinite(width) || width <= 0) {
      throw new RangeError("rectangle width must be a positive finite number");
    }

    if (!Number.isFinite(height) || height <= 0) {
      throw new RangeError("rectangle height must be a positive finite number");
    }

    this.widthValue = width;
    this.heightValue = height;
  }

  public get position(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public get width(): number {
    return this.widthValue;
  }

  public get height(): number {
    return this.heightValue;
  }

  public scale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new RangeError("scale factor must be positive");
    }

    const nextWidth = this.widthValue * factor;
    const nextHeight = this.heightValue * factor;

    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) {
      throw new RangeError("scaled rectangle dimensions must remain finite");
    }

    this.x *= factor;
    this.y *= factor;
    this.widthValue = nextWidth;
    this.heightValue = nextHeight;
  }

  public move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  public children(): readonly Shape[] {
    return [];
  }
}
