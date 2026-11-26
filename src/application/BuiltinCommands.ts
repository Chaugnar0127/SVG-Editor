/** 内置命令的公共名称契约，同时供 CLI 分发与插件冲突校验使用。 */
export const builtinCommandNames = [
  "init", "canvas", "read", "save", "help", "create", "delete", "addto",
  "front", "back", "tree", "show", "move", "scale", "set", "group", "ungroup",
  "undo", "redo", "exit", "quit",
] as const;

export type BuiltinCommandName = typeof builtinCommandNames[number];
