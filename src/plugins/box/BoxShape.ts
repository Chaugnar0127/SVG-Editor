import { GroupShape } from "../../domain/shape/GroupShape.js";
import type { Shape } from "../../domain/shape/Shape.js";

/** 复合图形保留矩形和标题为受保护部件，并允许附加嵌套内容。 */
export class BoxShape extends GroupShape {
  public override readonly type = "box";
  public override readonly ungroupable = false;

  public constructor(
    id: string,
    private readonly rectangleShape: Shape,
    private readonly labelShape: Shape,
    children?: readonly Shape[],
  ) {
    super(id);
    if (rectangleShape.id !== `${id}-rect` || rectangleShape.type !== "rect") {
      throw new RangeError(`invalid box structure: expected rect#${id}-rect`);
    }
    if (labelShape.id !== `${id}-label` || labelShape.type !== "text") {
      throw new RangeError(`invalid box structure: expected text#${id}-label`);
    }
    const orderedChildren = children ?? [rectangleShape, labelShape];
    if (!orderedChildren.includes(rectangleShape) || !orderedChildren.includes(labelShape)) {
      throw new RangeError(`invalid box structure: missing required children for ${id}`);
    }
    for (const child of orderedChildren) super.add(child);
  }

  public get rectangle(): Shape { return this.rectangleShape; }
  public get label(): Shape { return this.labelShape; }

  /** 必需部件只能由 box 的属性处理器修改，不能被普通命令摘走或改写。 */
  public override canModifyChild(id: string): boolean {
    if (id === this.rectangleShape.id || id === this.labelShape.id) return false;
    return super.canModifyChild(id);
  }

  public override remove(id: string): Shape {
    if (!this.canModifyChild(id)) throw new RangeError(`cannot remove required child: ${id}`);
    return super.remove(id);
  }
}
