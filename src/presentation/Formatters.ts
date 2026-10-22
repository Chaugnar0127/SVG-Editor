import type { SvgDocument } from "../domain/document/SvgDocument.js";
import type { Shape } from "../domain/shape/Shape.js";

const treeAttributeNames: ReadonlyMap<string, string> = new Map([
  ["width", "w"],
  ["height", "h"],
]);

export class Formatters {
  /** 展示全文档或指定子树，保持模型中的节点顺序。 */
  public tree(document: SvgDocument, id?: string): string {
    const root = id === undefined ? undefined : document.require(id);

    const lines = [
      root === undefined
        ? `svg (${document.width}x${document.height})`
        : this.describe(root),
    ];

    const children = root === undefined ? document.topLevel() : root.children();

    this.appendChildren(lines, children, "");

    return lines.join("\n");
  }

  /** 展示单个图形的直接父容器及完整属性名。 */
  public show(document: SvgDocument, id: string): string {
    const shape = document.require(id);
    const parent = document.parentOf(shape);
    const parentLabel = parent === null ? "svg" : this.label(parent);

    return [
      `${this.label(shape)}  parent=${parentLabel}`,
      ...this.attributePairs(shape, false).map((pair) => `  ${pair}`),
    ].join("\n");
  }

  private appendChildren(
    lines: string[],
    children: readonly Shape[],
    prefix: string,
  ): void {
    for (const [index, child] of children.entries()) {
      const isLast = index === children.length - 1;
      const branch = isLast ? "└── " : "├── ";

      lines.push(`${prefix}${branch}${this.describe(child)}`);

      const childPrefix = prefix + (isLast ? "    " : "│   ");

      this.appendChildren(lines, child.children(), childPrefix);
    }
  }

  private describe(shape: Shape): string {
    const attributes = this.attributePairs(shape, true);

    return attributes.length === 0
      ? this.label(shape)
      : `${this.label(shape)}  ${attributes.join(" ")}`;
  }

  private label(shape: Shape): string {
    return `${shape.type}#${shape.id}`;
  }

  private attributePairs(shape: Shape, compact: boolean): string[] {
    return Object.entries(shape.attributes()).map(([name, value]) => {
      const label = compact ? (treeAttributeNames.get(name) ?? name) : name;

      return `${label}=${this.formatValue(value)}`;
    });
  }

  private formatValue(value: string | number): string {
    if (
      typeof value === "string" &&
      (value.length === 0 || /[\s"\\]/u.test(value))
    ) {
      return JSON.stringify(value);
    }

    return String(value);
  }
}
