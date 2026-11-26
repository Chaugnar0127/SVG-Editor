/** 读取失败时保留目标路径，供调用方生成稳定的 CLI 错误文本。 */
export class DirectoryReadError extends Error {
  public constructor(public readonly path: string) {
    super(`cannot read directory: ${path}`);
  }
}
