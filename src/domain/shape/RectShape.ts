import type { Shape } from "./Shape.js";

export class RectShape implements Shape {
  private widthValue: number;
  private heightValue: number;

  /** 以左上角坐标和宽高创建矩形；宽高必须为正的有限数。 */
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

  /** 返回左上角坐标的副本，修改返回对象不会改变矩形位置。 */
  public get position(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** 读取当前宽度，外部不能通过此属性直接赋值。 */
  public get width(): number {
    return this.widthValue;
  }

  /** 读取当前高度，外部不能通过此属性直接赋值。 */
  public get height(): number {
    return this.heightValue;
  }

  /**
   * 以坐标原点为基准，同时缩放位置与宽高。
   * 非法倍率或宽高计算结果非有限时，在修改字段前抛出 RangeError。
   */
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

  /** 按增量平移左上角，宽高保持不变。 */
  public move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  /** 矩形是叶子节点，没有子节点；返回空数组以支持统一的树遍历。 */
  public children(): readonly Shape[] {
    return [];
  }
}
