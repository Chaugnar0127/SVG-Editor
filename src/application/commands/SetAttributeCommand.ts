import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { GeometryChange, Shape } from "../../domain/shape/Shape.js";
import type { EditCommand } from "../CommandBus.js";

export type AttributeChangeFactory = (
  shape: Shape,
  attribute: string,
  value: string,
) => GeometryChange;

export class SetAttributeCommand implements EditCommand {
  private previous: { shape: Shape; change: GeometryChange } | undefined;

  public constructor(
    private readonly id: string,
    private readonly attribute: string,
    private readonly value: string,
    private readonly createChange: AttributeChangeFactory = (shape, attribute, value) =>
      shape.prepareSet(attribute, value),
  ) {}

  public execute(document: SvgDocument): void {
    if (this.previous !== undefined) throw new Error("set command is already executed");
    const shape = document.requireModifiable(this.id);
    const change = this.createChange(shape, this.attribute, this.value);
    try {
      change.apply();
    } catch (error) {
      try {
        change.undo();
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], "attribute change failed and rollback was incomplete");
      }
      throw error;
    }
    this.previous = { shape, change };
  }

  public undo(document: SvgDocument): void {
    if (this.previous === undefined) throw new Error("set command has not been executed");
    if (document.find(this.id) !== this.previous.shape) throw new RangeError(`no such shape: ${this.id}`);
    this.previous.change.undo();
    this.previous = undefined;
  }
}
