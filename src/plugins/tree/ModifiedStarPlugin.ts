import type { Plugin } from "../../application/extensions/PluginContracts.js";
import type { TreeDecorationTarget, TreeDecorator } from "../../domain/TreeDecorator.js";
import type { Shape } from "../../domain/shape/Shape.js";
import type { SvgDocument } from "../../domain/document/SvgDocument.js";

class ModifiedStarDecorator implements TreeDecorator {
  public readonly name = "modified-star";
  private readonly savedSignatures = new Map<string, string>();

  /** 只比较当前子树与保存快照，祖先签名包含全部后代状态。 */
  public decorate(target: TreeDecorationTarget): readonly string[] {
    return this.savedSignatures.get(target.key) === target.signature ? [] : ["*"];
  }

  /** 成功保存或载入文档时替换实例内的基准快照。 */
  public onSaved(document: SvgDocument): void {
    this.savedSignatures.clear();
    this.savedSignatures.set("document:root", this.documentSignature(document));
    for (const shape of document.topLevel()) this.capture(shape);
  }

  private capture(shape: Shape): void {
    this.savedSignatures.set(`shape:${shape.id}`, this.shapeSignature(shape));
    for (const child of shape.children()) this.capture(child);
  }

  private shapeSignature(shape: Shape): string {
    return JSON.stringify([shape.id, shape.type, shape.attributes(), shape.children().map((child) => this.shapeSignature(child))]);
  }

  private documentSignature(document: SvgDocument): string {
    return JSON.stringify([
      document.width, document.height, document.viewBox,
      document.topLevel().map((shape) => this.shapeSignature(shape)),
    ]);
  }
}

export class ModifiedStarPlugin implements Plugin {
  public readonly manifest = { name: "modified-star", contributes: { decorators: ["modified-star"] } };

  /** 每次激活创建独立状态的装饰器实例。 */
  public activate(context: Parameters<Plugin["activate"]>[0]): void {
    context.registerTreeDecorator(new ModifiedStarDecorator());
  }
}

const modifiedStarPlugin = new ModifiedStarPlugin();
export default modifiedStarPlugin;
