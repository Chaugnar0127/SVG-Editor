import type { Shape, ShapeAttributes } from "./Shape.js";

export class GroupShape implements Shape {
  public readonly type = "g";
  private readonly childShapes: Shape[] = [];

  /** 创建具有指定 ID 的空组。 */
  public constructor(public readonly id: string) {}

  /** 组没有独立几何或样式属性。 */
  public attributes(): ShapeAttributes {
    return {};
  }

  /** 返回直接子节点数组的副本，避免外部绕过 add/remove 改变成员关系。 */
  public children(): readonly Shape[] {
    return [...this.childShapes];
  }

  /**
   * 在指定位置插入原图形，省略位置时追加到末尾。
   * 非法下标、自包含、祖先环或同级 ID 重复均在修改前抛出 RangeError。
   * 此处只检查同级 ID；跨子树的唯一性由文档加入操作检查。
   */
  public add(child: Shape, index: number = this.childShapes.length): void {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > this.childShapes.length
    ) {
      throw new RangeError(
        "child index must be an integer within group bounds",
      );
    }

    if (child.id === this.id) {
      throw new RangeError("group cannot contain itself");
    }

    if (this.containsShape(child, this)) {
      throw new RangeError("group cannot contain an ancestor");
    }

    if (this.childShapes.some((existing) => existing.id === child.id)) {
      throw new RangeError(`child id already exists: ${child.id}`);
    }

    this.childShapes.splice(index, 0, child);
  }

  /**
   * 按 ID 移出一个直接子节点并返回原对象，其子树和其他节点顺序保持不变。
   * 找不到直接子节点时抛出 RangeError，不递归删除后代。
   */
  public remove(id: string): Shape {
    const index = this.childShapes.findIndex((child) => child.id === id);
    const child = this.childShapes[index];

    if (child === undefined) {
      throw new RangeError(`no such child: ${id}`);
    }

    this.childShapes.splice(index, 1);
    return child;
  }

  /** 按对象身份检查子树是否包含目标，用于阻止把祖先放进后代形成环。 */
  private containsShape(root: Shape, target: Shape): boolean {
    if (root === target) {
      return true;
    }

    return root.children().some((child) => this.containsShape(child, target));
  }

  /** 向直接子节点转发平移，嵌套组通过相同接口递归移动全部后代。 */
  public move(dx: number, dy: number): void {
    for (const child of this.childShapes) {
      child.move(dx, dy);
    }
  }

  /**
   * 校验倍率后向子节点转发缩放，使后代的位置和尺寸一起变化。
   * 当前子节点若中途抛错，已经完成的变换不会自动回滚。
   */
  public scale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new RangeError("scale factor must be positive");
    }

    for (const child of this.childShapes) {
      child.scale(factor);
    }
  }
}
