import type { SvgDocument } from "../domain/document/SvgDocument.js";

export interface LoadedDocument {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
}

/** 当前 CLI 按行同步执行；成功返回才提交会话路径与历史状态。 */
export interface DocumentStore {
  read(path: string): LoadedDocument;
  write(path: string, document: SvgDocument): void;
}
