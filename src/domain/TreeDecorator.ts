import type { SvgDocument } from "./document/SvgDocument.js";
import type { Shape } from "./shape/Shape.js";

/** 树行格式化时传给装饰器的节点身份及领域对象。 */
export interface TreeDecorationTarget {
  readonly key: string;
  readonly shape: Shape | undefined;
  readonly documentRoot: boolean;
}

/** 树渲染扩展契约；保存回调由应用会话在成功保存或载入后触发。 */
export interface TreeDecorator {
  readonly name: string;
  prepare?(document: SvgDocument): void;
  decorate(target: TreeDecorationTarget): readonly string[];
  onSaved?(document: SvgDocument): void;
}
