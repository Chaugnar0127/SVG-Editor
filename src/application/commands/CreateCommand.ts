import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { Shape } from "../../domain/shape/Shape.js";
import type { EditCommand } from "../CommandBus.js";

export class CreateCommand implements EditCommand {
  private executed = false;

  /** 保存待加入的原图形；省略容器 ID 时加入文档顶层。 */
  public constructor(
    private readonly shape: Shape,
    private readonly containerId?: string,
  ) {}

  /** 创建成功后标记为已执行，失败时保留原状态。 */
  public execute(document: SvgDocument): void {
    if (this.executed) {
      throw new Error("create command is already executed");
    }

    const parent =
      this.containerId === undefined
        ? null
        : document.requireContainer(this.containerId);

    document.add(this.shape, parent);
    this.executed = true;
  }

  /** 移除本命令加入的原对象，成功后允许重做。 */
  public undo(document: SvgDocument): void {
    if (!this.executed) {
      throw new Error("create command has not been executed");
    }

    document.remove(this.shape);
    this.executed = false;
  }
}
