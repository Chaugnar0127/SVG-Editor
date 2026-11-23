import * as vscode from "vscode";
import { parseSvgOutline, type SvgOutlineNode } from "./svgOutline.js";

export class SvgOutlineProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.DocumentSymbol[] {
    if (token.isCancellationRequested) return [];
    return parseSvgOutline(document.getText()).map((node) => toDocumentSymbol(node));
  }
}

function toDocumentSymbol(node: SvgOutlineNode): vscode.DocumentSymbol {
  const range = toVscodeRange(node.range);
  const kind = node.kind === "container" ? vscode.SymbolKind.Namespace : vscode.SymbolKind.Object;
  const symbol = new vscode.DocumentSymbol(node.label, "", kind, range, range);

  for (const child of node.children) symbol.children.push(toDocumentSymbol(child));
  return symbol;
}

function toVscodeRange(range: SvgOutlineNode["range"]): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character,
  );
}
