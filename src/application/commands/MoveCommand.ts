import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { GeometryChange, Shape } from "../../domain/shape/Shape.js";
import type { EditCommand } from "../CommandBus.js";

interface AppliedMove {
  readonly shape: Shape;
  readonly change: GeometryChange;
}

export class MoveCommand implements EditCommand {
  private previous: AppliedMove | undefined;

  public constructor(
    private readonly id: string,
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  /** 准备成功后执行，并保存对应原对象的撤销记录。 */
  public execute(document: SvgDocument): void {
    if (this.previous !== undefined) {
      throw new Error("move command is already executed");
    }

    const shape = document.require(this.id);
    const change = shape.prepareMove(this.dx, this.dy);

    change.apply();
    this.previous = { shape, change };
  }

  /** 恢复原坐标，成功后允许重做。 */
  public undo(document: SvgDocument): void {
    const previous = this.previous;

    if (previous === undefined) {
      throw new Error("move command has not been executed");
    }

    if (document.find(this.id) !== previous.shape) {
      throw new RangeError(`no such shape: ${this.id}`);
    }

    previous.change.undo();
    this.previous = undefined;
  }
}
