import type { DirectoryEntry } from "../../application/DirectoryReader.js";
import type { Plugin, PluginCommand, PluginCommandContext } from "../../application/extensions/PluginContracts.js";

class DirCommand implements PluginCommand {
  public readonly name = "dir";
  public readonly usage = "dir";
  public readonly help = "list the current working directory";

  /** 命令不需要 SVG 文档；目录读取失败会转成一行错误文本并保留 REPL。 */
  public execute(args: readonly string[], context: PluginCommandContext) {
    if (args.length !== 0) throw new RangeError("usage: dir");
    const reader = context.directoryReader;
    if (reader === undefined) throw new Error("directory reader is not configured");

    let entries: readonly DirectoryEntry[];
    try {
      entries = reader.list();
    } catch {
      return { kind: "message" as const, text: `error: cannot read directory: ${reader.currentPath}` };
    }

    if (entries.length === 0) return { kind: "message" as const, text: "(empty directory)" };
    const rank = { directory: 0, file: 1, other: 2 } as const;
    const sorted = [...entries].sort((left, right) => {
      const kindOrder = rank[left.kind] - rank[right.kind];
      if (kindOrder !== 0) return kindOrder;
      return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
    });
    const marker = { directory: "[DIR]", file: "[FILE]", other: "[OTHER]" } as const;
    return {
      kind: "message" as const,
      text: sorted.map((entry) => `${marker[entry.kind]}  ${entry.name}`).join("\n"),
    };
  }
}

export class DirPlugin implements Plugin {
  public readonly manifest = { name: "dir", contributes: { commands: ["dir"] } };

  /** 通过扩展上下文注册命令，具体文件系统由宿主注入。 */
  public activate(context: Parameters<Plugin["activate"]>[0]): void {
    context.registerCommand(new DirCommand());
  }
}

const dirPlugin = new DirPlugin();
export default dirPlugin;
