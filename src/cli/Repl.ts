import { createInterface, type Interface } from "node:readline";
import { stdin, stdout } from "node:process";

export class Repl {
  private readonly prompt = "svg> ";

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
