import * as vscode from "vscode";
import { SvgFileDecorationProvider } from "./SvgFileDecorationProvider.js";
import { SvgOutlineProvider } from "./SvgOutlineProvider.js";

export function activate(context: vscode.ExtensionContext): void {
  const decorations = new SvgFileDecorationProvider();
  context.subscriptions.push(
    decorations,
    vscode.window.registerFileDecorationProvider(decorations),
    vscode.languages.registerDocumentSymbolProvider(
      { pattern: "**/*.svg" },
      new SvgOutlineProvider(),
    ),
    vscode.workspace.onDidCreateFiles((event) => decorations.refresh(event.files)),
    vscode.workspace.onDidDeleteFiles((event) => decorations.refresh(event.files)),
    vscode.workspace.onDidRenameFiles((event) => {
      decorations.refresh(event.files.flatMap(({ oldUri, newUri }) => [oldUri, newUri]));
    }),
  );
}
