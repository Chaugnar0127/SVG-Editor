import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { GeometryChange, Shape } from "../../domain/shape/Shape.js";
import type { EditCommand } from "../CommandBus.js";

export class ScaleCommand implements EditCommand {
  private previous: { shape: Shape; change: GeometryChange } | undefined;

  public constructor(private readonly id: string, private readonly factor: number) {}

  public execute(document: SvgDocument): void {
    if (this.previous !== undefined) throw new Error("scale command is already executed");
    const shape = document.require(this.id);
    const change = shape.prepareScale(this.factor);
    change.apply();
    this.previous = { shape, change };
  }

  public undo(document: SvgDocument): void {
    if (this.previous === undefined) throw new Error("scale command has not been executed");
    if (document.find(this.id) !== this.previous.shape) throw new RangeError(`no such shape: ${this.id}`);
    this.previous.change.undo();
    this.previous = undefined;
  }
}
