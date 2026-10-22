/** 命令参数个数不符合语法时，在执行用例前拒绝输入。 */
export function expectCount(
  args: readonly string[],
  allowed: readonly number[],
  usage: string,
): void {
  if (!allowed.includes(args.length)) {
    throw new RangeError(`usage: ${usage}`);
  }
}

/** 完整参数必须表示有限数；正数等领域约束仍由模型检查。 */
export function numberAt(
  args: readonly string[],
  index: number,
  label: string,
): number {
  const raw = args[index];

  if (raw === undefined || raw.trim().length === 0) {
    throw new RangeError(`${label} must be a finite number`);
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number`);
  }

  return value;
}
