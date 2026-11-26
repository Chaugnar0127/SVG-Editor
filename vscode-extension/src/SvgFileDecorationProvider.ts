import * as vscode from "vscode";
import { shouldDecorateSvg } from "./fileDecorationPolicy.js";

export class SvgFileDecorationProvider implements vscode.FileDecorationProvider, vscode.Disposable {
  private readonly changes = new vscode.EventEmitter<vscode.Uri[]>();

  public readonly onDidChangeFileDecorations = this.changes.event;

  public async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
    if (!uri.path.toLowerCase().endsWith(".svg")) return undefined;

    try {
      const entry = await vscode.workspace.fs.stat(uri);
      const isDirectory = (entry.type & vscode.FileType.Directory) !== 0;
      if (!shouldDecorateSvg(uri.path, isDirectory)) return undefined;
      return { badge: "[]", tooltip: "SVG file" };
    } catch {
      return undefined;
    }
  }

  public refresh(uris: readonly vscode.Uri[]): void {
    if (uris.length > 0) this.changes.fire([...uris]);
  }

  public dispose(): void {
    this.changes.dispose();
  }
}
