export type DirectoryEntryKind = "directory" | "file" | "other";

export interface DirectoryEntry {
  readonly name: string;
  readonly kind: DirectoryEntryKind;
}

/** 读取失败时保留目标路径，供调用方生成稳定的 CLI 错误文本。 */
export class DirectoryReadError extends Error {
  public constructor(public readonly path: string) {
    super(`cannot read directory: ${path}`);
  }
}

/** 应用层只依赖当前工作目录读取能力，不绑定 Node 文件系统实现。 */
export interface DirectoryReader {
  readonly currentPath: string;
  list(): readonly DirectoryEntry[];
}
