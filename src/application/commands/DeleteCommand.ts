import type {
  ShapeLocation,
  SvgDocument,
} from "../../domain/document/SvgDocument.js";
import type { EditCommand } from "../CommandBus.js";

export class DeleteCommand implements EditCommand {
  private detached: ShapeLocation | undefined;

  /** 每次新的删除请求创建一个命令实例，保存目标 ID。 */
  public constructor(private readonly id: string) {}

  /** 删除目标并保存完整恢复记录；撤销后可以再次执行。 */
  public execute(document: SvgDocument): void {
    if (this.detached !== undefined) {
      throw new Error("delete command is already executed");
    }

    const shape = document.require(this.id);
    this.detached = document.remove(shape);
  }

  /** 恢复原对象、子树及原位置；成功后允许重做。 */
  public undo(document: SvgDocument): void {
    const detached = this.detached;

    if (detached === undefined) {
      throw new Error("delete command has not been executed");
    }

    document.restore(detached);
    this.detached = undefined;
  }
}
