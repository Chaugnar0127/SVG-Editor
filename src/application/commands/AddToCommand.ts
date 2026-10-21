import type {
  DetachedSubtree,
  SvgDocument,
} from "../../domain/document/SvgDocument.js";
import type { EditCommand } from "../CommandBus.js";

export class AddToCommand implements EditCommand {
  private previous: DetachedSubtree | undefined;

  /** 参数顺序对应 addto <containerId> <id>。 */
  public constructor(
    private readonly containerId: string,
    private readonly id: string,
  ) {}

  /** 将已有图形追加到目标组，并保存原位置。 */
  public execute(document: SvgDocument): void {
    if (this.previous !== undefined) {
      throw new Error("addto command is already executed");
    }

    const parent = document.requireContainer(this.containerId);
    const shape = document.require(this.id);

    this.previous = document.moveTo(shape, parent);
  }

  /** 将原图形迁回原父容器和原下标。 */
  public undo(document: SvgDocument): void {
    const previous = this.previous;

    if (previous === undefined) {
      throw new Error("addto command has not been executed");
    }

    document.moveTo(previous.shape, previous.parent, previous.index);
    this.previous = undefined;
  }
}
