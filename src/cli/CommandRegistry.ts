import type { EditorSession } from "../application/EditorSession.js";
import { Formatters } from "../presentation/Formatters.js";

export type CommandResult =
  | { readonly kind: "message"; readonly text: string }
  | { readonly kind: "exit" };

type CommandHandler = (args: readonly string[]) => CommandResult;

export class CommandRegistry {
  private readonly formatters = new Formatters();
  private readonly handlers: ReadonlyMap<string, CommandHandler>;

  public constructor(private readonly session: EditorSession) {
    this.handlers = new Map<string, CommandHandler>([
      ["init", (args) => this.init(args)],
      ["canvas", (args) => this.canvas(args)],
      ["create", (args) => this.create(args)],
      ["delete", (args) => this.deleteShape(args)],
      ["addto", (args) => this.addTo(args)],
      ["front", (args) => this.front(args)],
      ["back", (args) => this.back(args)],
      ["tree", (args) => this.tree(args)],
      ["show", (args) => this.show(args)],
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

  private create(args: readonly string[]): CommandResult {
    const usage = "create <type> <id> [params...] [in <containerId>]";
    const [type, id] = args;

    if (type === undefined || id === undefined) {
      throw new RangeError(`usage: ${usage}`);
    }

    let parameters = args.slice(2);
    let containerId: string | undefined;

    if (parameters.length >= 2 && parameters.at(-2) === "in") {
      const target = parameters.at(-1);

      if (target === undefined || target.length === 0 || /\s/u.test(target)) {
        throw new RangeError(`usage: ${usage}`);
      }

      containerId = target;
      parameters = parameters.slice(0, -2);
    } else if (parameters.at(-1) === "in") {
      throw new RangeError(`usage: ${usage}`);
    }

    this.session.createShape(type, id, parameters, containerId);

    const suffix = containerId === undefined ? "" : ` in g#${containerId}`;

    return {
      kind: "message",
      text: `${type}#${id} created${suffix}`,
    };
  }

  private deleteShape(args: readonly string[]): CommandResult {
    this.expectCount(args, [1], "delete <id>");

    const id = args[0];

    if (id === undefined) {
      throw new RangeError("usage: delete <id>");
    }

    this.session.deleteShape(id);

    return {
      kind: "message",
      text: `shape ${id} deleted`,
    };
  }

  private addTo(args: readonly string[]): CommandResult {
    const usage = "addto <containerId> <id>";
    this.expectCount(args, [2], usage);

    const [containerId, id] = args;

    if (containerId === undefined || id === undefined) {
      throw new RangeError(`usage: ${usage}`);
    }

    this.session.addTo(containerId, id);

    return {
      kind: "message",
      text: `shape ${id} moved into g#${containerId}`,
    };
  }

  private front(args: readonly string[]): CommandResult {
    const usage = "front <id>";
    this.expectCount(args, [1], usage);

    const id = args[0];

    if (id === undefined) {
      throw new RangeError(`usage: ${usage}`);
    }

    this.session.bringToFront(id);

    return {
      kind: "message",
      text: `shape ${id} brought to front`,
    };
  }

  private back(args: readonly string[]): CommandResult {
    const usage = "back <id>";
    this.expectCount(args, [1], usage);

    const id = args[0];

    if (id === undefined) {
      throw new RangeError(`usage: ${usage}`);
    }

    this.session.sendToBack(id);

    return {
      kind: "message",
      text: `shape ${id} sent to back`,
    };
  }

  private tree(args: readonly string[]): CommandResult {
    this.expectCount(args, [0, 1], "tree [id]");

    const document = this.session.requireDocument();

    return {
      kind: "message",
      text: this.formatters.tree(document, args[0]),
    };
  }

  private show(args: readonly string[]): CommandResult {
    this.expectCount(args, [1], "show <id>");

    const id = args[0];

    if (id === undefined) {
      throw new RangeError("usage: show <id>");
    }

    const document = this.session.requireDocument();

    return {
      kind: "message",
      text: this.formatters.show(document, id),
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
