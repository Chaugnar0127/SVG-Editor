export type DirectoryEntryKind = "directory" | "file" | "other";

export interface DirectoryEntry {
  readonly name: string;
  readonly kind: DirectoryEntryKind;
}

/** 应用层只依赖列目录能力，不绑定 Node 文件系统实现。 */
export interface DirectoryReader {
  list(path: string): readonly DirectoryEntry[];
}
