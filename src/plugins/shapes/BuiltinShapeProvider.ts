import type { ShapeProvider, SvgElementData } from "../../application/extensions/PluginContracts.js";
import { isContainerShape, type Shape } from "../../domain/shape/Shape.js";

/** 共享内置 SVG 读回流程；每种图形的语法和构造规则由专属 provider 实现。 */
export abstract class BuiltinShapeProvider implements ShapeProvider {
  public abstract readonly name: string;

  public get elementName(): string {
    return this.name;
  }

  public abstract create(id: string, parameters: readonly string[]): Shape;

  public canRead(element: SvgElementData): boolean {
    return element.name === this.elementName;
  }

  public read(element: SvgElementData, id: string, children: readonly Shape[]): Shape {
    const shape = this.create(id, this.parametersFromElement(element));
    const consumedAttributes = new Set(this.consumedAttributes());

    for (const [name, value] of Object.entries(element.attributes)) {
      if (consumedAttributes.has(name) || this.ignoresAttribute(name)) continue;
      if (name === "text") throw new RangeError("text content must be an XML text node");
      const normalized = name === "stroke-width" ? this.numericAttribute(value, name) : value;
      shape.prepareSet(name, normalized).apply();
    }

    if (!this.acceptsText() && element.text.trim().length !== 0) {
      throw new RangeError(`unexpected text in <${this.elementName}>`);
    }
    if (children.length > 0 && !isContainerShape(shape)) {
      throw new RangeError(`children are not supported in <${this.elementName}>`);
    }
    if (isContainerShape(shape)) {
      for (const child of children) shape.add(child);
    }
    return shape;
  }

  public canWrite(_shape: Shape): boolean {
    return false;
  }

  public write(_shape: Shape): SvgElementData {
    throw new Error("built-in shapes use the default SVG writer");
  }

  protected abstract parametersFromElement(element: SvgElementData): readonly string[];

  protected consumedAttributes(): readonly string[] {
    return [];
  }

  protected ignoresAttribute(_name: string): boolean {
    return false;
  }

  protected acceptsText(): boolean {
    return false;
  }

  protected numberOrZero(element: SvgElementData, name: string): string {
    return this.numericAttribute(element.attributes[name] ?? "0", name);
  }

  protected requiredNumber(element: SvgElementData, name: string): string {
    return this.numericAttribute(element.attributes[name] ?? "", name);
  }

  protected numericAttribute(value: string, label: string): string {
    const numeric = value.trim().replace(/px$/u, "");
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(numeric)) {
      throw new RangeError(`${label} must be a finite number`);
    }
    return numeric;
  }
}
