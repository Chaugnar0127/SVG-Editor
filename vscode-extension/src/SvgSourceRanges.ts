export interface ElementOffsets {
  readonly start: number;
  readonly openingEnd: number;
  readonly end: number;
}

/** 对已由 XML parser 验证的源码扫描一次，保留原始换行和完整元素边界。 */
export class SvgSourceRanges {
  private readonly elements = new Map<number, ElementOffsets>();

  public constructor(private readonly source: string) {
    const stack: { start: number; openingEnd: number }[] = [];
    let cursor = 0;
    while (cursor < source.length) {
      const start = source.indexOf("<", cursor);
      if (start === -1) break;
      if (source.startsWith("<!--", start)) {
        cursor = this.after("-->", start + 4);
        continue;
      }
      if (source.startsWith("<![CDATA[", start)) {
        cursor = this.after("]]>", start + 9);
        continue;
      }
      if (source.startsWith("<?", start)) {
        cursor = this.after("?>", start + 2);
        continue;
      }

      const end = this.tagEnd(start);
      if (source.startsWith("</", start)) {
        const opening = stack.pop();
        if (opening === undefined) throw new SyntaxError("unmatched closing tag");
        this.elements.set(opening.start, { ...opening, end });
      } else if (source[end - 2] === "/") {
        this.elements.set(start, { start, openingEnd: end, end });
      } else {
        stack.push({ start, openingEnd: end });
      }
      cursor = end;
    }
    if (stack.length !== 0) throw new SyntaxError("unclosed element");
  }

  public at(start: number): ElementOffsets {
    const offsets = this.elements.get(start);
    if (offsets === undefined) throw new SyntaxError("element source range not found");
    return offsets;
  }

  private after(delimiter: string, start: number): number {
    const end = this.source.indexOf(delimiter, start);
    if (end === -1) throw new SyntaxError("incomplete XML markup");
    return end + delimiter.length;
  }

  private tagEnd(start: number): number {
    let quote: string | undefined;
    for (let index = start; index < this.source.length; index++) {
      const character = this.source[index];
      if (quote !== undefined) {
        if (character === quote) quote = undefined;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        return index + 1;
      }
    }
    throw new SyntaxError("unclosed tag");
  }
}
