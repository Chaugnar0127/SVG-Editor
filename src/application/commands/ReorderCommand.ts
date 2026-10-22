import type {
  ShapeLocation,
  SvgDocument,
} from "../../domain/document/SvgDocument.js";
import type { EditCommand } from "../CommandBus.js";

export type OrderEdge = "front" | "back";

/** 同级排序是一种操作，方向是参数；两种方向共用恢复位置和生命周期。 */
export class ReorderCommand implements EditCommand {
  private previous: ShapeLocation | undefined;

  public constructor(
    private readonly id: string,
    private readonly edge: OrderEdge,
  ) {}

  public execute(document: SvgDocument): void {
    if (this.previous !== undefined) {
      throw new Error(`${this.edge} command is already executed`);
    }

    const shape = document.require(this.id);
    this.previous = this.edge === "front"
      ? document.bringToFront(shape)
      : document.sendToBack(shape);
  }

  public undo(document: SvgDocument): void {
    const previous = this.previous;

    if (previous === undefined) {
      throw new Error(`${this.edge} command has not been executed`);
    }

    document.moveTo(previous.shape, previous.parent, previous.index);
    this.previous = undefined;
  }
}
