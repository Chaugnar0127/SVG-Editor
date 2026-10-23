import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { GeometryChange } from "../../domain/shape/Shape.js";
import type { EditCommand } from "../CommandBus.js";

export class UngroupCommand implements EditCommand {
  private previous: GeometryChange | undefined;

  public constructor(private readonly id: string) {}

  public execute(document: SvgDocument): void {
    if (this.previous !== undefined) throw new Error("ungroup command is already executed");
    const change = document.prepareUngroup(this.id);
    change.apply();
    this.previous = change;
  }

  public undo(document: SvgDocument): void {
    if (this.previous === undefined) throw new Error("ungroup command has not been executed");
    if (document.find(this.id) !== undefined) throw new RangeError(`id already exists: ${this.id}`);
    this.previous.undo();
    this.previous = undefined;
  }
}
