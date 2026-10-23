import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { GeometryChange, Shape } from "../../domain/shape/Shape.js";
import type { EditCommand } from "../CommandBus.js";

export class SetAttributeCommand implements EditCommand {
  private previous: { shape: Shape; change: GeometryChange } | undefined;

  public constructor(
    private readonly id: string,
    private readonly attribute: string,
    private readonly value: string,
  ) {}

  public execute(document: SvgDocument): void {
    if (this.previous !== undefined) throw new Error("set command is already executed");
    const shape = document.require(this.id);
    const change = shape.prepareSet(this.attribute, this.value);
    change.apply();
    this.previous = { shape, change };
  }

  public undo(document: SvgDocument): void {
    if (this.previous === undefined) throw new Error("set command has not been executed");
    if (document.find(this.id) !== this.previous.shape) throw new RangeError(`no such shape: ${this.id}`);
    this.previous.change.undo();
    this.previous = undefined;
  }
}
