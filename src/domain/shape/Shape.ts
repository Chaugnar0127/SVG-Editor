export interface Shape {
  readonly id: string;

  /** 按增量平移；容器将操作递归传递给后代。 */
  move(dx: number, dy: number): void;

  /** 按正的有限倍率缩放位置和尺寸；容器递归缩放后代。 */
  scale(factor: number): void;

  /** 按顺序读取直接子节点；叶子返回空数组，调用方可统一遍历整棵树。 */
  children():readonly Shape[];
}
