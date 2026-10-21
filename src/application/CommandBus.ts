import type { SvgDocument } from "../domain/document/SvgDocument.js";

/**
 * 一次可撤销的同步编辑。
 * 执行或撤销失败时，文档和命令自身状态必须保持不变。
 */
export interface EditCommand {
  execute(document: SvgDocument): void;
  undo(document: SvgDocument): void;
}

export class CommandBus {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  private lockedAfterIO = false;

  /** 一个总线实例管理一个文档的编辑历史。 */
  public constructor(private readonly document: SvgDocument) {}

  /** 成功执行新编辑后记录历史，清空重做分支并解除 IO 锁。 */
  public execute(command: EditCommand): void {
    command.execute(this.document);

    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.lockedAfterIO = false;
  }

  /** 撤销最近一次成功编辑；失败时保留两个历史栈。 */
  public undo(): void {
    this.assertHistoryUnlocked();

    const command = this.undoStack.at(-1);

    if (command === undefined) {
      throw new RangeError("nothing to undo");
    }

    command.undo(this.document);

    this.undoStack.pop();
    this.redoStack.push(command);
  }

  /** 重做最近一次撤销的编辑；失败时保留两个历史栈。 */
  public redo(): void {
    this.assertHistoryUnlocked();

    const command = this.redoStack.at(-1);

    if (command === undefined) {
      throw new RangeError("nothing to redo");
    }

    command.execute(this.document);

    this.redoStack.pop();
    this.undoStack.push(command);
  }

  /** 仅在文档类命令成功后调用：清空历史并禁止撤销和重做。 */
  public lockAfterIO(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.lockedAfterIO = true;
  }

  private assertHistoryUnlocked(): void {
    if (this.lockedAfterIO) {
      throw new RangeError("undo not allowed after io command");
    }
  }
}
