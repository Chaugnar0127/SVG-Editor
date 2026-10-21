import type {
  DetachedSubtree,
  SvgDocument,
} from "../../domain/document/SvgDocument.js";
import type { EditCommand } from "../CommandBus.js";

export class BackCommand implements EditCommand {
  private previous: DetachedSubtree | undefined;

  /** 保存需要置底的图形 ID。 */
  public constructor(private readonly id: string) {}

  /** 在当前父容器内置底，并保存原位置。 */
  public execute(document: SvgDocument): void {
    if (this.previous !== undefined) {
      throw new Error("back command is already executed");
    }

    const shape = document.require(this.id);
    this.previous = document.sendToBack(shape);
  }

  /** 恢复置底之前的位置。 */
  public undo(document: SvgDocument): void {
    const previous = this.previous;

    if (previous === undefined) {
      throw new Error("back command has not been executed");
    }

    document.moveTo(previous.shape, previous.parent, previous.index);

    this.previous = undefined;
  }
}
