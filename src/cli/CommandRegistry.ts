import type { EditorSession } from "../application/EditorSession.js";
import { expectCount, numberAt } from "../application/arguments.js";
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
      ["move", (args) => this.move(args)],
      ["scale", (args) => this.scale(args)],
      ["set", (args) => this.set(args)],
      ["group", (args) => this.group(args)],
      ["ungroup", (args) => this.ungroup(args)],
      [
        "undo",
        (args) => {
          expectCount(args, [0], "undo");
          this.session.undo();
          return { kind: "message", text: "undo complete" };
        },
      ],
      [
        "redo",
        (args) => {
          expectCount(args, [0], "redo");
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
    expectCount(args, [0, 1, 2], "init [width] [height]");

    const width =
      args.length >= 1 ? numberAt(args, 0, "width") : undefined;
    const height =
      args.length >= 2 ? numberAt(args, 1, "height") : undefined;

    this.session.init(width, height);

    const document = this.session.requireDocument();

    return {
      kind: "message",
      text: `canvas ${document.width}x${document.height} created`,
    };
  }

  private canvas(args: readonly string[]): CommandResult {
    expectCount(args, [0, 2], "canvas [<width> <height>]");

    if (args.length === 2) {
      const width = numberAt(args, 0, "width");
      const height = numberAt(args, 1, "height");

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
    }

    this.session.createShape(type, id, parameters, containerId);

    const suffix = containerId === undefined ? "" : ` in g#${containerId}`;

    return {
      kind: "message",
      text: `${type}#${id} created${suffix}`,
    };
  }

  private deleteShape(args: readonly string[]): CommandResult {
    const id = this.singleId(args, "delete <id>");

    this.session.deleteShape(id);

    return {
      kind: "message",
      text: `shape ${id} deleted`,
    };
  }

  private move(args: readonly string[]): CommandResult {
    expectCount(args, [3], "move <id> <dx> <dy>");

    const id = args[0];

    if (id === undefined) {
      throw new RangeError("usage: move <id> <dx> <dy>");
    }

    const dx = numberAt(args, 1, "dx");
    const dy = numberAt(args, 2, "dy");

    this.session.moveShape(id, dx, dy);

    return {
      kind: "message",
      text: `shape ${id} moved by (${dx},${dy})`,
    };
  }

  private addTo(args: readonly string[]): CommandResult {
    const usage = "addto <containerId> <id>";
    expectCount(args, [2], usage);

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

  private scale(args: readonly string[]): CommandResult {
    expectCount(args, [2], "scale <id> <factor>");
    const id = args[0]!;
    const factor = numberAt(args, 1, "factor");
    this.session.scaleShape(id, factor);
    const shape = this.session.requireDocument().require(id);
    return { kind: "message", text: `${shape.type}#${id} scaled by ${factor}` };
  }

  private group(args: readonly string[]): CommandResult {
    if (args.length < 2) throw new RangeError("usage: group <newGid> <id1> [id2...]");
    const id = args[0]!;
    this.session.groupShapes(id, args.slice(1));
    return { kind: "message", text: `g#${id} created with ${args.length - 1} children` };
  }

  private ungroup(args: readonly string[]): CommandResult {
    const id = this.singleId(args, "ungroup <gid>");
    this.session.ungroupShape(id);
    return { kind: "message", text: `g#${id} ungrouped` };
  }

  private set(args: readonly string[]): CommandResult {
    expectCount(args, [3], "set <id> <attr> <value>");
    const [id, attribute, value] = args as readonly [string, string, string];
    this.session.setAttribute(id, attribute, value);
    const shape = this.session.requireDocument().require(id);
    return { kind: "message", text: `${shape.type}#${id} updated: ${attribute}=${JSON.stringify(value)}` };
  }

  private front(args: readonly string[]): CommandResult {
    const id = this.singleId(args, "front <id>");
    this.session.reorderShape(id, "front");

    return {
      kind: "message",
      text: `shape ${id} brought to front`,
    };
  }

  private back(args: readonly string[]): CommandResult {
    const id = this.singleId(args, "back <id>");
    this.session.reorderShape(id, "back");

    return {
      kind: "message",
      text: `shape ${id} sent to back`,
    };
  }

  private tree(args: readonly string[]): CommandResult {
    expectCount(args, [0, 1], "tree [id]");

    const document = this.session.requireDocument();

    return {
      kind: "message",
      text: this.formatters.tree(document, args[0]),
    };
  }

  private show(args: readonly string[]): CommandResult {
    const id = this.singleId(args, "show <id>");
    const document = this.session.requireDocument();

    return {
      kind: "message",
      text: this.formatters.show(document, id),
    };
  }

  private exit(args: readonly string[]): CommandResult {
    expectCount(args, [0], "exit | quit");

    return { kind: "exit" };
  }

  /** 校验单 ID 命令，并将数组索引收窄为必定存在的字符串。 */
  private singleId(args: readonly string[], usage: string): string {
    const id = args[0];

    if (args.length !== 1 || id === undefined) {
      throw new RangeError(`usage: ${usage}`);
    }

    return id;
  }
}
