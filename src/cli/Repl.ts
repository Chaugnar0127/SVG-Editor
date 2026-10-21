import { createInterface, type Interface } from "node:readline";
import { stdin, stdout } from "node:process";
import type { CommandRegistry } from "./CommandRegistry.js";
import type { Tokenizer } from "./Tokenizer.js";

export class Repl {
  private readonly prompt = "svg> ";

  public constructor(
    private readonly tokenizer: Tokenizer,
    private readonly commands: CommandRegistry,
  ) {}

  /** 创建读行接口，交互持续到退出命令或输入流结束。 */
  public start(): void {
    const terminal: Interface = createInterface({
      input: stdin,
      output: stdout,
      terminal: Boolean(stdin.isTTY && stdout.isTTY),
    });

    stdout.write("svg-editor 0.1\n");
    terminal.setPrompt(this.prompt);
    terminal.prompt();

    terminal.on("line", (line: string) => {
      this.handleLine(terminal, line);
    });
  }

  /** 分词、执行并输出结果；单次输入失败不结束交互。 */
  private handleLine(terminal: Interface, line: string): void {
    try {
      const tokens = this.tokenizer.tokenize(line);
      const result = this.commands.execute(tokens);

      if (result?.kind === "exit") {
        terminal.close();
        return;
      }

      if (result?.kind === "message") {
        stdout.write(`${result.text}\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      stdout.write(`error: ${message}\n`);
    }

    terminal.prompt();
  }
}
