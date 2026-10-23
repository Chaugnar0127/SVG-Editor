import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { GeometryChange } from "../../domain/shape/Shape.js";
import { GroupShape } from "../../domain/shape/GroupShape.js";
import type { EditCommand } from "../CommandBus.js";

export class GroupCommand implements EditCommand {
  private readonly group: GroupShape;
  private readonly ids: readonly string[];
  private previous: GeometryChange | undefined;

  public constructor(id: string, ids: readonly string[]) {
    this.group = new GroupShape(id);
    this.ids = [...ids];
  }

  public execute(document: SvgDocument): void {
    if (this.previous !== undefined) throw new Error("group command is already executed");
    const change = document.prepareGroup(this.group, this.ids);
    change.apply();
    this.previous = change;
  }

  public undo(document: SvgDocument): void {
    if (this.previous === undefined) throw new Error("group command has not been executed");
    if (document.find(this.group.id) !== this.group) throw new RangeError(`no such container: ${this.group.id}`);
    this.previous.undo();
    this.previous = undefined;
  }
}
