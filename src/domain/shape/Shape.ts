/** 属性名到属性值的只读映射。 */
export type ShapeAttributes = Readonly<Record<string, string | number>>;

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

  /** 按顺序读取直接子节点；叶子返回空数组。 */
  children(): readonly Shape[];
}
