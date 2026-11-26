/** 属性名到属性值的只读映射。 */
export type ShapeAttributes = Readonly<Record<string, string | number>>;

/** 图形为树形展示提供的主要信息及已包含在摘要中的属性名。 */
export interface ShapeSummary {
  readonly text: string;
  readonly representedAttributes: readonly string[];
}

/**
 * 已完成校验的几何变更。
 * apply 和 undo 只提交已确定的值，不再进行可能失败的业务校验。
 * 准备后应同步提交，期间不得插入其他编辑；多次变更须按逆序撤销。
 */
export interface GeometryChange {
  apply(): void;
  undo(): void;
}

export interface Shape {
  readonly id: string;
  readonly type: string;

  /** 返回当前属性的独立副本，不包含 ID 和子节点。 */
  attributes(): ShapeAttributes;

  /** 计算并校验平移结果，准备期间不修改任何图形。 */
  prepareMove(dx: number, dy: number): GeometryChange;

  /** 计算并校验缩放结果，准备期间不修改任何图形。 */
  prepareScale(factor: number): GeometryChange;

  /** 准备白名单属性变更，撤销时恢复原值或原先未设置的状态。 */
  prepareSet(attribute: string, value: string): GeometryChange;

  /** 按顺序读取直接子节点；叶子返回空数组。 */
  children(): readonly Shape[];

  /** 可选的树形名称；未提供时使用领域类型与 ID。 */
  treeLabel?(): string;

  /** 可选的多态树形摘要；未提供时由展示层列出全部属性。 */
  treeSummary?(): ShapeSummary | undefined;
}

/** 可承载子图形的领域能力；文档结构操作只依赖此契约。 */
export interface ContainerShape extends Shape {
  readonly ungroupable: boolean;
  add(child: Shape, index?: number): void;
  remove(id: string): Shape;
  canModifyChild(id: string): boolean;
}

/** 结构判断基于公开能力，不依赖某一种容器的具体类。 */
export function isContainerShape(shape: Shape): shape is ContainerShape {
  const candidate = shape as Shape & Partial<ContainerShape>;
  return typeof candidate.add === "function"
    && typeof candidate.remove === "function"
    && typeof candidate.canModifyChild === "function"
    && typeof candidate.ungroupable === "boolean";
}
