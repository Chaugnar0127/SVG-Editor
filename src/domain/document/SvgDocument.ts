import type { Shape } from "../shape/Shape.js";
import { GroupShape } from "../shape/GroupShape.js";

/** 保存摘下的原子树及其原位置，供撤销删除时恢复。 */
export interface DetachedSubtree {
  readonly shape: Shape;
  readonly parent: GroupShape | null;
  readonly index: number;
}

export class SvgDocument {
  private widthValue: number;
  private heightValue: number;
  private readonly rootShapes: Shape[] = [];

  /** 创建空文档，默认画布为 800×600；非法尺寸会在初始化前被拒绝。 */
  public constructor(width: number = 800, height: number = 600) {
    this.validateDimensions(width, height);

    this.widthValue = width;
    this.heightValue = height;
  }

  /** 读取画布宽度；修改尺寸统一通过 resize 完成。 */
  public get width(): number {
    return this.widthValue;
  }

  /** 读取画布高度；修改尺寸统一通过 resize 完成。 */
  public get height(): number {
    return this.heightValue;
  }

  /** 两个尺寸全部校验通过后再更新，避免失败时只改了一半。 */
  public resize(width: number, height: number): void {
    this.validateDimensions(width, height);

    this.widthValue = width;
    this.heightValue = height;
  }

  /** 返回顶层节点数组的副本以保护内部顺序，数组内仍引用原图形。 */
  public topLevel(): readonly Shape[] {
    return [...this.rootShapes];
  }

  /** 按大小写敏感的 ID 查找任意层级的原图形，找不到时返回 undefined。 */
  public find(id: string): Shape | undefined {
    // 深度优先搜索：先查当前节点，再查子树；未命中则继续下一个兄弟节点。
    const search = (shapes: readonly Shape[]): Shape | undefined => {
      for (const shape of shapes) {
        if (shape.id === id) {
          return shape;
        }

        const found = search(shape.children());

        if (found !== undefined) {
          return found;
        }
      }

      return undefined;
    };

    return search(this.rootShapes);
  }

  /** 按 ID 获取必须存在的原图形；找不到时抛出 RangeError。 */
  public require(id: string): Shape {
    const shape = this.find(id);

    if (shape === undefined) {
      throw new RangeError(`no such shape: ${id}`);
    }

    return shape;
  }

  /** 查询原图形的直接父容器；顶层图形返回 null。 */
  public parentOf(shape: Shape): GroupShape | null {
    return this.locate(shape).parent;
  }

  /** 获取必须存在的组，区分目标不存在和目标不是容器两种错误。 */
  public requireContainer(id: string): GroupShape {
    const shape = this.find(id);

    if (shape === undefined) {
      throw new RangeError(`no such container: ${id}`);
    }

    if (!(shape instanceof GroupShape)) {
      throw new RangeError(`not a container: ${id}`);
    }

    return shape;
  }

  /**
   * 将新子树插入顶层或指定组，省略下标时追加到末尾。
   * 父容器失效、ID 冲突或下标非法时，在修改前抛出 RangeError。
   */
  public add(
    shape: Shape,
    parent: GroupShape | null = null,
    index?: number,
  ): void {
    if (parent !== null) {
      if (this.find(parent.id) !== parent) {
        throw new RangeError(`no such container: ${parent.id}`);
      }

      this.validateNewSubtree(shape);
      parent.add(shape, index);
      return;
    }

    const rootIndex = index ?? this.rootShapes.length;

    if (
      !Number.isInteger(rootIndex) ||
      rootIndex < 0 ||
      rootIndex > this.rootShapes.length
    ) {
      throw new RangeError(
        "root index must be an integer within document bounds",
      );
    }

    this.validateNewSubtree(shape);
    this.rootShapes.splice(rootIndex, 0, shape);
  }

  /**
   * 摘下文档中的原图形，保留其子树并返回原父容器和下标。
   * 目标对象不属于本文档时抛出 RangeError，不修改文档。
   */
  public remove(shape: Shape): DetachedSubtree {
    const location = this.locate(shape);

    if (location.parent === null) {
      this.rootShapes.splice(location.index, 1);
    } else {
      location.parent.remove(location.shape.id);
    }

    return location;
  }

  /**
   * 按记录将原子树放回指定父容器和下标。
   * 插入规则统一由 add 校验。
   */
  public restore(detached: DetachedSubtree): void {
    this.add(detached.shape, detached.parent, detached.index);
  }

  /**
   * 将文档中的原图形迁移到目标容器，parent 为 null 时表示顶层。
   * index 按摘下图形后的目标列表计算；省略时追加到末尾。
   * 成功时返回原位置记录；插入失败时恢复原位置并重新抛错。
   */
  public moveTo(
    shape: Shape,
    parent: GroupShape | null,
    index?: number,
  ): DetachedSubtree {
    if (this.find(shape.id) !== shape) {
      throw new RangeError(`no such shape: ${shape.id}`);
    }

    if (parent !== null) {
      if (this.find(parent.id) !== parent) {
        throw new RangeError(`no such container: ${parent.id}`);
      }

      const containsParent = (node: Shape): boolean => {
        return node === parent || node.children().some(containsParent);
      };

      if (containsParent(shape)) {
        throw new RangeError(
          "cannot move a shape into itself or its descendant",
        );
      }
    }

    const original = this.remove(shape);

    try {
      const targetIndex =
        index ??
        (parent === null ? this.rootShapes.length : parent.children().length);

      this.restore({ shape, parent, index: targetIndex });
    } catch (error) {
      this.restore(original);
      throw error;
    }

    return original;
  }

  /**
   * 将图形移到当前父容器的末尾，对应最前面的绘制层级。
   * 返回原位置记录，供撤销时恢复。
   */
  public bringToFront(shape: Shape): DetachedSubtree {
    const { parent } = this.locate(shape);

    return this.moveTo(shape, parent);
  }

  /**
   * 将图形移到当前父容器的开头，对应最后面的绘制层级。
   * 返回原位置记录，供撤销时恢复。
   */
  public sendToBack(shape: Shape): DetachedSubtree {
    const { parent } = this.locate(shape);

    return this.moveTo(shape, parent, 0);
  }

  /**
   * 查找原图形的直接父容器和同级下标，不修改文档。
   * 目标对象不属于本文档时抛出 RangeError。
   */
  private locate(shape: Shape): DetachedSubtree {
    const search = (
      siblings: readonly Shape[],
      parent: GroupShape | null,
    ): DetachedSubtree | undefined => {
      for (const [index, candidate] of siblings.entries()) {
        if (candidate === shape) {
          return { shape: candidate, parent, index };
        }

        if (candidate instanceof GroupShape) {
          const found = search(candidate.children(), candidate);

          if (found !== undefined) {
            return found;
          }
        }
      }

      return undefined;
    };

    const location = search(this.rootShapes, null);

    if (location === undefined) {
      throw new RangeError(`no such shape: ${shape.id}`);
    }

    return location;
  }

  /** 检查现有文档与待加入子树的全部 ID；重复时抛出 RangeError。 */
  private validateNewSubtree(shape: Shape): void {
    const ids = new Set<string>();

    const visit = (node: Shape): void => {
      if (ids.has(node.id)) {
        throw new RangeError(`id already exists: ${node.id}`);
      }

      ids.add(node.id);

      for (const child of node.children()) {
        visit(child);
      }
    };

    for (const root of this.rootShapes) {
      visit(root);
    }

    visit(shape);
  }

  /** 要求画布宽高为正的有限数；仅校验并抛出 RangeError，不修改状态。 */
  private validateDimensions(width: number, height: number): void {
    if (!Number.isFinite(width) || width <= 0) {
      throw new RangeError("canvas width must be a positive finite number");
    }

    if (!Number.isFinite(height) || height <= 0) {
      throw new RangeError("canvas height must be a positive finite number");
    }
  }
}
