import type { SvgDocument } from "./document/SvgDocument.js";
import type { Shape } from "./shape/Shape.js";

/** 树行装饰器能读取的节点快照；签名相同代表该子树内容未变化。 */
export interface TreeDecorationTarget {
  readonly key: string;
  readonly signature: string;
  readonly shape: Shape | undefined;
  readonly documentRoot: boolean;
}

/** 树渲染扩展契约；保存回调由应用会话在成功保存或载入后触发。 */
export interface TreeDecorator {
  readonly name: string;
  decorate(target: TreeDecorationTarget): readonly string[];
  onSaved?(document: SvgDocument): void;
}
