import { SvgDocument } from "../domain/document/SvgDocument.js";
import { ShapeFactory } from "./ShapeFactory.js";
import { CommandBus, type EditCommand } from "./CommandBus.js";
import { CreateCommand } from "./commands/CreateCommand.js";
import { DeleteCommand } from "./commands/DeleteCommand.js";
import { AddToCommand } from "./commands/AddToCommand.js";
import { ReorderCommand, type OrderEdge } from "./commands/ReorderCommand.js";
import { MoveCommand } from "./commands/MoveCommand.js";

/** 当前文档与只管理该文档的命令总线。 */
interface ActiveDocument {
  readonly document: SvgDocument;
  readonly commands: CommandBus;
}

export class EditorSession {
  private readonly shapeFactory = new ShapeFactory();
  private current: ActiveDocument | undefined;

  /** 新文档创建成功后，再整体替换当前文档及其历史。 */
  public init(width: number = 800, height: number = 600): void {
    const document = new SvgDocument(width, height);
    const commands = new CommandBus(document);

    commands.lockAfterIO();

    this.current = { document, commands };
  }

  /** 获取当前文档，供尺寸查询和展示使用；编辑通过会话用例提交。 */
  public requireDocument(): SvgDocument {
    return this.requireCurrent().document;
  }

  /** 尺寸修改成功后，清空历史并锁定撤销和重做。 */
  public resizeCanvas(width: number, height: number): void {
    const current = this.requireCurrent();

    current.document.resize(width, height);
    current.commands.lockAfterIO();
  }

  /** 构造新图形，再通过当前文档的命令总线执行创建。 */
  public createShape(
    type: string,
    id: string,
    parameters: readonly string[],
    containerId?: string,
  ): void {
    const current = this.requireCurrent();
    const shape = this.shapeFactory.create(type, id, parameters);

    current.commands.execute(new CreateCommand(shape, containerId));
  }

  /** 删除图形或整棵子树，沿用现有的撤销记录。 */
  public deleteShape(id: string): void {
    this.execute(new DeleteCommand(id));
  }

  /** 将叶子或整组平移作为一个可撤销步骤执行。 */
  public moveShape(id: string, dx: number, dy: number): void {
    this.execute(new MoveCommand(id, dx, dy));
  }

  /** 将已有图形或整棵子树追加到目标组。 */
  public addTo(containerId: string, id: string): void {
    this.execute(new AddToCommand(containerId, id));
  }

  /** 在当前父容器内置顶或置底。 */
  public reorderShape(id: string, edge: OrderEdge): void {
    this.execute(new ReorderCommand(id, edge));
  }

  /** 撤销当前文档最近一次编辑。 */
  public undo(): void {
    this.requireCurrent().commands.undo();
  }

  /** 重做当前文档最近一次撤销的编辑。 */
  public redo(): void {
    this.requireCurrent().commands.redo();
  }

  /** 会话对外只提供具体用例，内部统一提交到当前文档的总线。 */
  private execute(command: EditCommand): void {
    this.requireCurrent().commands.execute(command);
  }

  /** 集中处理尚未初始化文档的情况。 */
  private requireCurrent(): ActiveDocument {
    const current = this.current;

    if (current === undefined) {
      throw new RangeError("no document. use 'init' or 'read' first");
    }

    return current;
  }
}
