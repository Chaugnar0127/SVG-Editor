import { DOMImplementation, DOMParser, XMLSerializer, type Document, type Element, type Node } from "@xmldom/xmldom";
import type { LoadedDocument } from "../application/DocumentStore.js";
import { ShapeFactory } from "../application/ShapeFactory.js";
import { SvgDocument } from "../domain/document/SvgDocument.js";
import { GroupShape } from "../domain/shape/GroupShape.js";
import type { Shape } from "../domain/shape/Shape.js";

const svgNamespace = "http://www.w3.org/2000/svg";
const xmlnsNamespace = "http://www.w3.org/2000/xmlns/";

/** XML 适配器只处理结构、命名空间和转义，图形类型仍由工厂解释。 */
export class SvgCodec {
  public constructor(private readonly factory = new ShapeFactory()) {}

  public decode(source: string): LoadedDocument {
    this.assertXmlText(source);
    const xml = new DOMParser({ onError: (_level, message) => { throw new SyntaxError(message); } })
      .parseFromString(source, "application/xml");
    if (xml.doctype !== null) throw new SyntaxError("DOCTYPE is not supported");
    const root = xml.documentElement;
    if (root === null || root.localName !== "svg" || root.namespaceURI !== svgNamespace) {
      throw new SyntaxError("expected an <svg> root in the SVG namespace");
    }
    this.assertDocumentNodes(xml, root);
    const rootAttributes = this.attributes(root);
    for (const name of Object.keys(rootAttributes)) {
      if (!["width", "height", "viewBox"].includes(name)) throw new RangeError(`unsupported svg attribute: ${name}`);
    }
    const box = rootAttributes.viewBox === undefined ? undefined : this.parseViewBox(rootAttributes.viewBox);
    const width = this.length(rootAttributes.width ?? String(box?.[2] ?? 800), "canvas width");
    const height = this.length(rootAttributes.height ?? String(box?.[3] ?? 600), "canvas height");
    const document = new SvgDocument(width, height, box);
    const ids = new Set<string>();
    const reserveIds = (element: Element): void => {
      const id = element.getAttribute("id");
      if (id !== null) {
        if (ids.has(id)) throw new RangeError(`id already exists: ${id}`);
        ids.add(id);
      }
      for (const child of this.elements(element)) reserveIds(child);
    };
    for (const child of this.elements(root)) reserveIds(child);
    const warnings: string[] = [];
    const readShape = (element: Element): Shape => {
      if (element.namespaceURI !== svgNamespace) throw new RangeError(`unsupported namespace: ${element.namespaceURI}`);
      const attributes = this.attributes(element);
      const type = element.localName ?? element.tagName;
      let id = attributes.id;
      delete attributes.id;
      if (id === undefined) {
        let sequence = 1;
        do { id = `${type}${sequence++}`; } while (ids.has(id));
        ids.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
      }
      const shape = this.factory.fromAttributes(type, id, attributes, this.directText(element));
      const children = this.elements(element);
      if (children.length > 0 && !(shape instanceof GroupShape)) {
        throw new RangeError(`children are not supported in <${element.localName}>`);
      }
      if (shape instanceof GroupShape) for (const child of children) shape.add(readShape(child));
      return shape;
    };
    if (this.directText(root).trim().length !== 0) throw new SyntaxError("unexpected text in <svg>");
    for (const child of this.elements(root)) document.add(readShape(child));
    return { document, warnings };
  }

  public encode(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(svgNamespace, "svg", null);
    const root = xml.documentElement!;
    root.setAttribute("width", String(document.width));
    root.setAttribute("height", String(document.height));
    root.setAttribute("viewBox", document.viewBox.join(" "));
    const append = (parent: Element, shape: Shape, depth: number): void => {
      this.assertXmlText(shape.id);
      const element = xml.createElementNS(svgNamespace, shape.type);
      element.setAttribute("id", shape.id);
      for (const [name, value] of Object.entries(shape.attributes())) {
        this.assertXmlText(String(value));
        if (name === "text") element.appendChild(xml.createTextNode(String(value)));
        else element.setAttribute(name, String(value));
      }
      parent.appendChild(xml.createTextNode(`\n${"  ".repeat(depth)}`));
      parent.appendChild(element);
      const children = shape.children();
      for (const child of children) append(element, child, depth + 1);
      if (children.length > 0) element.appendChild(xml.createTextNode(`\n${"  ".repeat(depth)}`));
    };
    for (const shape of document.topLevel()) append(root, shape, 1);
    if (document.topLevel().length > 0) root.appendChild(xml.createTextNode("\n"));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xml).replaceAll("\r", "&#13;")}\n`;
  }

  private attributes(element: Element): Record<string, string> {
    const result: Record<string, string> = Object.create(null) as Record<string, string>;
    for (let index = 0; index < element.attributes.length; index++) {
      const attribute = element.attributes.item(index)!;
      if (attribute.namespaceURI === xmlnsNamespace) continue;
      if (attribute.namespaceURI) throw new RangeError(`unsupported attribute: ${attribute.name}`);
      this.assertXmlText(attribute.value);
      result[attribute.name] = attribute.value;
    }
    return result;
  }

  private elements(parent: Node): Element[] {
    const elements: Element[] = [];
    for (let child = parent.firstChild; child !== null; child = child.nextSibling) {
      if (child.nodeType === 1) elements.push(child as Element);
      else if (![3, 4, 8].includes(child.nodeType)) throw new SyntaxError(`unsupported XML node: ${child.nodeName}`);
    }
    return elements;
  }

  private directText(element: Element): string {
    let text = "";
    for (let child = element.firstChild; child !== null; child = child.nextSibling) {
      if (child.nodeType === 3 || child.nodeType === 4) text += child.nodeValue ?? "";
    }
    this.assertXmlText(text);
    return text;
  }

  private assertDocumentNodes(xml: Document, root: Element): void {
    for (let child = xml.firstChild; child !== null; child = child.nextSibling) {
      if (child === root || child.nodeType === 8 || (child.nodeType === 7 && child.nodeName === "xml")) continue;
      if (child.nodeType === 3 && (child.nodeValue ?? "").trim() === "") continue;
      throw new SyntaxError("unexpected content outside <svg>");
    }
  }

  private parseViewBox(value: string): readonly [number, number, number, number] {
    const parts = value.trim().split(/[\s,]+/u);
    if (parts.length !== 4) throw new RangeError("viewBox requires four numbers");
    return parts.map((part) => this.length(part, "viewBox")) as [number, number, number, number];
  }

  private length(value: string, label: string): number {
    const numeric = value.replace(/px$/u, "");
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(numeric.trim()) || !Number.isFinite(Number(numeric))) {
      throw new RangeError(`${label} must be a finite number`);
    }
    return Number(numeric);
  }

  private assertXmlText(value: string): void {
    if (/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(value)) {
      throw new RangeError("value contains a character forbidden in XML");
    }
  }
}
