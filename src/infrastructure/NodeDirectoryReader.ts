import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DirectoryReadError, type DirectoryEntry, type DirectoryReader } from "../application/DirectoryReader.js";

/** Node 适配器在创建时固定工作目录，避免 SVG 文件路径影响目录命令。 */
export class NodeDirectoryReader implements DirectoryReader {
  public readonly currentPath: string;

  public constructor(directory: string = process.cwd()) {
    this.currentPath = resolve(directory);
  }

  /** 只读取直接子项；符号链接和其他特殊项保留为 other，不跟随目标。 */
  public list(): readonly DirectoryEntry[] {
    try {
      return readdirSync(this.currentPath, { withFileTypes: true })
        .filter((entry) => entry.name !== "." && entry.name !== "..")
        .map((entry) => ({
          name: entry.name,
          kind: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
        }));
    } catch {
      throw new DirectoryReadError(this.currentPath);
    }
  }
}
