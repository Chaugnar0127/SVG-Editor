import { SvgDocument } from "../domain/document/SvgDocument.js";
import { CommandBus, type EditCommand } from "./CommandBus.js";
import { ShapeFactory } from "../domain/factory/ShapeFactory.js";
import { CreateCommand } from "./commands/CreateCommand.js";
import { DeleteCommand } from "./commands/DeleteCommand.js";
import { AddToCommand } from "./commands/AddToCommand.js";
import { FrontCommand } from "./commands/FrontCommand.js";
import { BackCommand } from "./commands/BackCommand.js";

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

  /** 获取当前文档，供尺寸查询和后续展示使用。 */
  public requireDocument(): SvgDocument {
    return this.requireCurrent().document;
  }

  /** 尺寸修改成功后，清空历史并锁定撤销和重做。 */
  public resizeCanvas(width: number, height: number): void {
    const current = this.requireCurrent();

    current.document.resize(width, height);
    current.commands.lockAfterIO();
  }

  /** 将一次编辑交给当前文档的总线。 */
  public execute(command: EditCommand): void {
    this.requireCurrent().commands.execute(command);
  }

  /** 撤销当前文档最近一次编辑。 */
  public undo(): void {
    this.requireCurrent().commands.undo();
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

  /** 将已有图形或整棵子树追加到目标组。 */
  public addTo(containerId: string, id: string): void {
    this.execute(new AddToCommand(containerId, id));
  }

  /** 将图形置于当前同级节点的最前绘制层。 */
  public bringToFront(id: string): void {
    this.execute(new FrontCommand(id));
  }

  /** 将图形置于当前同级节点的最后绘制层。 */
  public sendToBack(id: string): void {
    this.execute(new BackCommand(id));
  }

  /** 重做当前文档最近一次撤销的编辑。 */
  public redo(): void {
    this.requireCurrent().commands.redo();
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
