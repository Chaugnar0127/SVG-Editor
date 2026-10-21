import { createInterface, type Interface } from "node:readline";
import { stdin, stdout } from "node:process";

export class Repl {
  private readonly prompt = "svg> ";

  /** 创建终端读行接口并监听输入，交互持续到退出命令或输入流结束。 */
  public start(): void {
    const terminal: Interface = createInterface({
      input: stdin,
      output: stdout,
      terminal: true,
    });

    stdout.write("svg-editor 0.1\n");
    terminal.setPrompt(this.prompt);
    terminal.prompt();

    terminal.on("line", (line: string) => {
      this.handleLine(terminal, line);
    });
  }

  /**
   * 处理一行输入：退出时关闭读行接口，忽略空行和注释行。
   * 其他输入当前统一提示尚未实现，处理完后显示下一次提示符。
   */
  private handleLine(terminal: Interface, line: string): void {
    const input = line.trim();

    if (input === "exit" || input === "quit") {
      terminal.close();
      return;
    }

    if (input.length > 0 && !input.startsWith("#")) {
      stdout.write(`error: command not implemented: ${input}\n`);
    }

    terminal.prompt();
  }
}
