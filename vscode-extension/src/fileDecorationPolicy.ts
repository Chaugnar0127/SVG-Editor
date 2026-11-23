export function shouldDecorateSvg(path: string, isDirectory: boolean): boolean {
  return !isDirectory && path.toLowerCase().endsWith(".svg");
}
