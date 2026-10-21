import type { EditorSession } from "../application/EditorSession.js";

export type CommandResult =
  | { readonly kind: "message"; readonly text: string }
  | { readonly kind: "exit" };

type CommandHandler = (args: readonly string[]) => CommandResult;

export class CommandRegistry {
  private readonly handlers: ReadonlyMap<string, CommandHandler>;

  public constructor(private readonly session: EditorSession) {
    this.handlers = new Map<string, CommandHandler>([
      ["init", (args) => this.init(args)],
      ["canvas", (args) => this.canvas(args)],
      [
        "undo",
        (args) => {
          this.expectCount(args, [0], "undo");
          this.session.undo();
          return { kind: "message", text: "undo complete" };
        },
      ],
      [
        "redo",
        (args) => {
          this.expectCount(args, [0], "redo");
          this.session.redo();
          return { kind: "message", text: "redo complete" };
        },
      ],
      ["exit", (args) => this.exit(args)],
      ["quit", (args) => this.exit(args)],
    ]);
  }

  /** 空输入不执行；其他输入按命令名分发。 */
  public execute(tokens: readonly string[]): CommandResult | undefined {
    const name = tokens[0];

    if (name === undefined) {
      return undefined;
    }

    const handler = this.handlers.get(name);

    if (handler === undefined) {
      throw new RangeError(`unknown command: ${name}`);
    }

    return handler(tokens.slice(1));
  }

  private init(args: readonly string[]): CommandResult {
    this.expectCount(args, [0, 1, 2], "init [width] [height]");

    const width =
      args.length >= 1 ? this.numberAt(args, 0, "width") : undefined;
    const height =
      args.length >= 2 ? this.numberAt(args, 1, "height") : undefined;

    this.session.init(width, height);

    const document = this.session.requireDocument();

    return {
      kind: "message",
      text: `canvas ${document.width}x${document.height} created`,
    };
  }

  private canvas(args: readonly string[]): CommandResult {
    this.expectCount(args, [0, 2], "canvas [<width> <height>]");

    if (args.length === 2) {
      const width = this.numberAt(args, 0, "width");
      const height = this.numberAt(args, 1, "height");

      this.session.resizeCanvas(width, height);
    }

    const document = this.session.requireDocument();

    return {
      kind: "message",
      text: `canvas ${document.width}x${document.height}`,
    };
  }

  private exit(args: readonly string[]): CommandResult {
    this.expectCount(args, [0], "exit | quit");

    return { kind: "exit" };
  }

  /** 参数个数不符合语法时，在调用会话之前拒绝执行。 */
  private expectCount(
    args: readonly string[],
    allowed: readonly number[],
    usage: string,
  ): void {
    if (!allowed.includes(args.length)) {
      throw new RangeError(`usage: ${usage}`);
    }
  }

  /** 将完整参数转换为有限数；正数约束继续由领域模型检查。 */
  private numberAt(
    args: readonly string[],
    index: number,
    label: string,
  ): number {
    const raw = args[index];

    if (raw === undefined || raw.trim().length === 0) {
      throw new RangeError(`${label} must be a finite number`);
    }

    const value = Number(raw);

    if (!Number.isFinite(value)) {
      throw new RangeError(`${label} must be a finite number`);
    }

    return value;
  }
}
