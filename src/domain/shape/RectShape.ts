import type { GeometryChange, Shape, ShapeAttributes } from "./Shape.js";
import { StyledShape } from "./StyledShape.js";

export class RectShape extends StyledShape implements Shape {
  public override readonly type = "rect";
  private widthValue: number;
  private heightValue: number;

  /** 创建矩形；坐标必须有限，宽高必须为正的有限数。 */
  public constructor(
    id: string,
    private x: number,
    private y: number,
    width: number,
    height: number,
    fillValue?: string,
  ) {
    super(id);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new RangeError("rectangle coordinates must be finite numbers");
    }

    if (!Number.isFinite(width) || width <= 0) {
      throw new RangeError("rectangle width must be a positive finite number");
    }

    if (!Number.isFinite(height) || height <= 0) {
      throw new RangeError("rectangle height must be a positive finite number");
    }

    if (fillValue !== undefined && fillValue.trim().length === 0) {
      throw new RangeError("fill must not be empty");
    }

    this.widthValue = width;
    this.heightValue = height;
    if (fillValue !== undefined) super.prepareSet("fill", fillValue).apply();
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

  /** undefined 表示未显式指定填充色。 */
  public get fill(): string | undefined {
    return super.attributes().fill as string | undefined;
  }

  /** 返回独立属性副本；未设置的 fill 不出现在结果中。 */
  public override attributes(): ShapeAttributes {
    return {
      x: this.x,
      y: this.y,
      width: this.widthValue,
      height: this.heightValue,
      ...super.attributes(),
    };
  }

  /**
   * 准备以原点为基准的位置与尺寸缩放，拒绝溢出及尺寸下溢到零。
   */
  public override prepareScale(factor: number): GeometryChange {
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new RangeError("scale factor must be positive");
    }

    const nextWidth = this.widthValue * factor;
    const nextHeight = this.heightValue * factor;
    const nextX = this.x * factor;
    const nextY = this.y * factor;

    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) {
      throw new RangeError("scaled rectangle dimensions must remain finite");
    }

    if (nextWidth <= 0 || nextHeight <= 0) {
      throw new RangeError("scaled rectangle dimensions must remain positive");
    }

    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
      throw new RangeError("scaled rectangle coordinates must remain finite");
    }

    return this.geometryChange(nextX, nextY, nextWidth, nextHeight);
  }

  /** 保存原坐标和目标坐标，准备过程不改变矩形。 */
  public override prepareMove(dx: number, dy: number): GeometryChange {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new RangeError("move offsets must be finite numbers");
    }

    const nextX = this.x + dx;
    const nextY = this.y + dy;

    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
      throw new RangeError("moved rectangle coordinates must remain finite");
    }

    return this.geometryChange(nextX, nextY, this.widthValue, this.heightValue);
  }

  /** 矩形是叶子节点，没有子节点。 */
  public override children(): readonly Shape[] {
    return [];
  }

  public override prepareSet(attribute: string, value: string): GeometryChange {
    if (!["x", "y", "width", "height"].includes(attribute)) {
      return super.prepareSet(attribute, value);
    }
    const next = this.number(value, attribute);
    if (attribute === "width" || attribute === "height") this.positive(next, attribute);
    return this.geometryChange(
      attribute === "x" ? next : this.x,
      attribute === "y" ? next : this.y,
      attribute === "width" ? next : this.widthValue,
      attribute === "height" ? next : this.heightValue,
    );
  }

  /** 平移与缩放共用精确恢复逻辑；传入值已由准备方法完成校验。 */
  private geometryChange(
    nextX: number,
    nextY: number,
    nextWidth: number,
    nextHeight: number,
  ): GeometryChange {
    const previousX = this.x;
    const previousY = this.y;
    const previousWidth = this.widthValue;
    const previousHeight = this.heightValue;

    return {
      apply: () => {
        this.x = nextX;
        this.y = nextY;
        this.widthValue = nextWidth;
        this.heightValue = nextHeight;
      },
      undo: () => {
        this.x = previousX;
        this.y = previousY;
        this.widthValue = previousWidth;
        this.heightValue = previousHeight;
      },
    };
  }
}
