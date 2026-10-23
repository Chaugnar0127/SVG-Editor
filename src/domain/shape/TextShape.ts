import type { GeometryChange, ShapeAttributes } from "./Shape.js";
import { StyledShape } from "./StyledShape.js";

interface TextPosition { readonly x: number; readonly y: number }

export class TextShape extends StyledShape {
  public override readonly type = "text";
  private position: TextPosition;

  public constructor(id: string, x: number, y: number, private content: string) {
    super(id);
    this.finite(x, y);
    this.position = { x, y };
  }

  public override attributes(): ShapeAttributes {
    return { ...this.position, text: this.content, ...super.attributes() };
  }

  public override prepareMove(dx: number, dy: number): GeometryChange {
    this.finite(dx, dy);
    return this.prepare({ x: this.position.x + dx, y: this.position.y + dy });
  }

  public override prepareScale(factor: number): GeometryChange {
    this.factor(factor);
    return this.prepare({ x: this.position.x * factor, y: this.position.y * factor });
  }

  public override prepareSet(attribute: string, value: string): GeometryChange {
    if (attribute === "text") {
      return this.change(this.content, value, (content) => { this.content = content; });
    }
    if (attribute !== "x" && attribute !== "y") return super.prepareSet(attribute, value);
    return this.prepare({ ...this.position, [attribute]: this.number(value, attribute) });
  }

  private prepare(next: TextPosition): GeometryChange {
    this.finite(next.x, next.y);
    return this.change(this.position, next, (position) => { this.position = position; });
  }
}
