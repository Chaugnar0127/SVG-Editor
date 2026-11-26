import { DOMParser, type Element } from "@xmldom/xmldom";
import { SvgSourceRanges } from "./SvgSourceRanges.js";

export interface SourcePosition {
  readonly line: number;
  readonly character: number;
}

export interface SourceRange {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export interface SvgOutlineNode {
  readonly label: string;
  readonly kind: "container" | "element";
  readonly range: SourceRange;
  readonly selectionRange: SourceRange;
  readonly children: readonly SvgOutlineNode[];
}

export function parseSvgOutline(source: string): readonly SvgOutlineNode[] {
  try {
    const xml = new DOMParser({
      onError: (_level, message) => {
        throw new SyntaxError(message);
      },
    }).parseFromString(source, "application/xml");
    const root = xml.documentElement;

    if (root === null || root.localName !== "svg" || xml.doctype !== null) return [];

    const lineStarts = getLineStarts(source);
    return [toOutlineNode(root, new SvgSourceRanges(source), lineStarts)];
  } catch {
    return [];
  }
}

function toOutlineNode(
  element: Element,
  ranges: SvgSourceRanges,
  lineStarts: readonly number[],
): SvgOutlineNode {
  const startOffset = offsetAt(element.lineNumber ?? 1, element.columnNumber ?? 1, lineStarts);
  const offsets = ranges.at(startOffset);
  const id = element.getAttribute("id");
  const tag = element.localName ?? element.tagName;

  return {
    label: id === null || id.length === 0 ? tag : `${tag}#${id}`,
    kind: tag === "svg" || tag === "g" ? "container" : "element",
    range: { start: positionAt(startOffset, lineStarts), end: positionAt(offsets.end, lineStarts) },
    selectionRange: { start: positionAt(startOffset, lineStarts), end: positionAt(offsets.openingEnd, lineStarts) },
    children: elementChildren(element).map((child) => toOutlineNode(child, ranges, lineStarts)),
  };
}

function elementChildren(element: Element): Element[] {
  const result: Element[] = [];

  for (let index = 0; index < element.childNodes.length; index++) {
    const child = element.childNodes.item(index);
    if (child?.nodeType === 1) result.push(child as Element);
  }

  return result;
}

function getLineStarts(source: string): number[] {
  const starts = [0];

  for (let index = 0; index < source.length; index++) {
    if (source[index] === "\r") {
      if (source[index + 1] === "\n") index++;
      starts.push(index + 1);
    } else if (source[index] === "\n") {
      starts.push(index + 1);
    }
  }

  return starts;
}

function offsetAt(line: number, character: number, lineStarts: readonly number[]): number {
  const lineStart = lineStarts[line - 1];
  if (lineStart === undefined) return 0;
  return lineStart + Math.max(0, character - 1);
}

function positionAt(offset: number, lineStarts: readonly number[]): SourcePosition {
  let low = 0;
  let high = lineStarts.length;

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (lineStarts[middle]! <= offset) low = middle;
    else high = middle;
  }

  return { line: low, character: offset - lineStarts[low]! };
}
