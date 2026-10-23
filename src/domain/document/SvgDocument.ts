import type { GeometryChange, Shape } from "../shape/Shape.js";
import { GroupShape } from "../shape/GroupShape.js";

/** 原图形及其所在位置的记录，供删除、迁移和排序撤销使用。 */
export interface ShapeLocation {
  readonly shape: Shape;
  readonly parent: GroupShape | null;
  readonly index: number;
}

export class SvgDocument {
  private widthValue: number;
  private heightValue: number;
  private readonly rootShapes: Shape[] = [];
  private viewBoxValue: readonly [number, number, number, number];

  /** 创建空文档，默认画布为 800×600；非法尺寸会在初始化前被拒绝。 */
  public constructor(width: number = 800, height: number = 600, viewBox?: readonly [number, number, number, number]) {
    this.validateDimensions(width, height);

    this.widthValue = width;
    this.heightValue = height;
    const box = viewBox ?? [0, 0, width, height];
    if (!box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) {
      throw new RangeError("viewBox must contain finite coordinates and positive dimensions");
    }
    this.viewBoxValue = [...box];
  }

  /** 读取画布宽度；修改尺寸统一通过 resize 完成。 */
  public get width(): number {
    return this.widthValue;
  }

  /** 读取画布高度；修改尺寸统一通过 resize 完成。 */
  public get height(): number {
    return this.heightValue;
  }

  public get viewBox(): readonly [number, number, number, number] {
    return [...this.viewBoxValue];
  }

  public get elementCount(): number {
    const count = (shapes: readonly Shape[]): number => shapes.reduce((total, shape) => total + 1 + count(shape.children()), 0);
    return count(this.rootShapes);
  }

  /** 两个尺寸全部校验通过后再更新，避免失败时只改了一半。 */
  public resize(width: number, height: number): void {
    this.validateDimensions(width, height);

    this.widthValue = width;
    this.heightValue = height;
    this.viewBoxValue = [0, 0, width, height];
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
  public remove(shape: Shape): ShapeLocation {
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
  public restore(detached: ShapeLocation): void {
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
  ): ShapeLocation {
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
  public bringToFront(shape: Shape): ShapeLocation {
    const { parent } = this.locate(shape);

    return this.moveTo(shape, parent);
  }

  /**
   * 将图形移到当前父容器的开头，对应最后面的绘制层级。
   * 返回原位置记录，供撤销时恢复。
   */
  public sendToBack(shape: Shape): ShapeLocation {
    const { parent } = this.locate(shape);

    return this.moveTo(shape, parent, 0);
  }

  /**
   * 按原文档顺序收编节点，在最近公共父容器的第一个相关分支处插入新组。
   * 准备阶段完成存在性、唯一性和祖先冲突检查，不摘除任何节点。
   */
  public prepareGroup(group: GroupShape, ids: readonly string[]): GeometryChange {
    this.validateNewSubtree(group);
    if (group.children().length !== 0) throw new RangeError("new group must be empty");
    if (ids.length === 0) throw new RangeError("group requires at least one shape");
    if (new Set(ids).size !== ids.length) throw new RangeError("group targets must be distinct");
    const selected = new Set(ids.map((id) => this.require(id)));
    const locations: ShapeLocation[] = [];
    const visit = (shapes: readonly Shape[], parent: GroupShape | null, ancestor?: Shape): void => {
      for (const [index, shape] of shapes.entries()) {
        const included = selected.has(shape);
        if (included && ancestor !== undefined) {
          throw new RangeError(`cannot group a container into its own descendant: ${ancestor.id}`);
        }
        if (included) locations.push({ shape, parent, index });
        if (shape instanceof GroupShape) visit(shape.children(), shape, included ? shape : ancestor);
      }
    };
    visit(this.rootShapes, null);

    const ancestry = (parent: GroupShape | null): (GroupShape | null)[] => {
      const chain: (GroupShape | null)[] = [];
      while (parent !== null) {
        chain.push(parent);
        parent = this.parentOf(parent);
      }
      return [...chain, null];
    };
    const chains = locations.map((location) => ancestry(location.parent));
    const parent = chains[0]!.find((candidate) => chains.every((chain) => chain.includes(candidate))) ?? null;
    const branchIndex = (shape: Shape): number => {
      let location = this.locate(shape);
      while (location.parent !== parent) location = this.locate(location.parent!);
      return location.index;
    };
    const index = Math.min(...locations.map(({ shape }) => branchIndex(shape)));

    return {
      apply: () => {
        for (const location of locations) {
          this.remove(location.shape);
          group.add(location.shape);
        }
        this.add(group, parent, index);
      },
      undo: () => {
        this.remove(group);
        for (const location of locations) group.remove(location.shape.id);
        // locations 保持文档顺序，同一父容器的下标从小到大恢复。
        for (const location of locations) this.restore(location);
      },
    };
  }

  /** 解散嵌套组，子节点占据原组的位置；显式样式下放以保留继承外观。 */
  public prepareUngroup(id: string): GeometryChange {
    const group = this.requireContainer(id);
    const location = this.locate(group);
    if (location.parent === null) throw new RangeError(`cannot ungroup top-level container: ${id}`);
    const children = group.children();
    const styles = children.flatMap((child) => Object.entries(group.attributes())
      .filter(([name]) => !Object.hasOwn(child.attributes(), name))
      .map(([name, value]) => child.prepareSet(name, String(value))));
    return {
      apply: () => {
        this.remove(group);
        for (const [offset, child] of children.entries()) {
          group.remove(child.id);
          this.add(child, location.parent, location.index + offset);
        }
        for (const style of styles) style.apply();
      },
      undo: () => {
        for (const child of children) {
          this.remove(child);
          group.add(child);
        }
        this.restore(location);
        for (const style of [...styles].reverse()) style.undo();
      },
    };
  }

  /**
   * 查找原图形的直接父容器和同级下标，不修改文档。
   * 目标对象不属于本文档时抛出 RangeError。
   */
  private locate(shape: Shape): ShapeLocation {
    const search = (
      siblings: readonly Shape[],
      parent: GroupShape | null,
    ): ShapeLocation | undefined => {
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
