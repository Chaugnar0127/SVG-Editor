import type { TreeDecorationTarget, TreeDecorator } from "../../domain/TreeDecorator.js";
import type { Shape } from "../../domain/shape/Shape.js";
import type { SvgDocument } from "../../domain/document/SvgDocument.js";

export class ModifiedStarDecorator implements TreeDecorator {
  public readonly name = "modified-star";
  private readonly savedSignatures = new Map<string, string>();
  private readonly modifiedKeys = new Set<string>();

  /** 祖先标记由 prepare 的后序遍历汇总后代状态。 */
  public decorate(target: TreeDecorationTarget): readonly string[] {
    return this.modifiedKeys.has(target.key) ? ["*"] : [];
  }

  /** 每次 tree 查询后序遍历一次，并把后代变化向祖先传播。 */
  public prepare(document: SvgDocument): void {
    this.modifiedKeys.clear();
    const topLevelModified = document.topLevel().map((shape) => this.prepareShape(shape));
    const rootSignature = this.documentSignature(document);
    if (
      this.savedSignatures.get("document:root") !== rootSignature ||
      topLevelModified.some(Boolean)
    ) {
      this.modifiedKeys.add("document:root");
    }
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

  private prepareShape(shape: Shape): boolean {
    let modified = this.savedSignatures.get(`shape:${shape.id}`) !== this.shapeSignature(shape);
    for (const child of shape.children()) modified = this.prepareShape(child) || modified;
    if (modified) this.modifiedKeys.add(`shape:${shape.id}`);
    return modified;
  }

  private shapeSignature(shape: Shape): string {
    return JSON.stringify([
      shape.id,
      shape.type,
      shape.attributes(),
      shape.children().map((child) => [child.id, child.type]),
    ]);
  }

  private documentSignature(document: SvgDocument): string {
    return JSON.stringify([
      document.width, document.height, document.viewBox,
      document.topLevel().map((shape) => [shape.id, shape.type]),
    ]);
  }
}
