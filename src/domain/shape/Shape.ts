/** 属性名到属性值的只读映射。 */
export type ShapeAttributes = Readonly<Record<string, string | number>>;

export interface Shape {
  readonly id: string;
  readonly type: string;

  /** 返回当前属性的独立副本，不包含 ID 和子节点。 */
  attributes(): ShapeAttributes;

  /** 按增量平移；容器将操作递归传递给后代。 */
  move(dx: number, dy: number): void;

  /** 按正的有限倍率缩放位置和尺寸；容器递归缩放后代。 */
  scale(factor: number): void;

  /** 按顺序读取直接子节点；叶子返回空数组。 */
  children(): readonly Shape[];
}
