# Phase 2 源码指标

本报告由 `pnpm metrics` 生成，比较 Git 引用 `final` 与 `p2`。CLI 统计范围为 `src/**/*.ts`；VS Code 扩展、测试、依赖和构建产物不计入 CLI 重构数据。

- final: `41a3aa33b376bee18e44cc11c812ab86c9f0e54f`
- p2: `a956757ab682af10dd8ed2a984896a807ee90b56`
- 行数：文件中的物理行数，排除末尾换行产生的空项。
- 圈复杂度：每个模块和函数各计 1，再计入 if/循环/case/catch/条件表达式及 `&&`、`||`、`??` 决策点；按模块汇总。该规则固定在脚本中，以便两个引用可重复比较。
- 分类：内核包括 application、cli、domain、infrastructure、presentation；装配包括 `main.ts` 与 `assembly`；插件包括 `src/plugins`。

## 汇总

| 分类 | final 文件 | p2 文件 | final 行数 | p2 行数 | 行数变化 | final 圈复杂度 | p2 圈复杂度 | 复杂度变化 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| kernel | 29 | 34 | 2357 | 2713 | 356 | 577 | 658 | 81 |
| assembly | 1 | 2 | 11 | 239 | 228 | 1 | 83 | 82 |
| plugins | 0 | 6 | 0 | 417 | 417 | 0 | 147 | 147 |

## 文件职责与行数

### final

| 文件 | 分类 | 行数 | 职责（顶层类型/函数） |
|---|---|---:|---|
| `src/application/CommandBus.ts` | kernel | 73 | EditCommand, CommandBus |
| `src/application/DocumentStore.ts` | kernel | 12 | LoadedDocument, DocumentStore |
| `src/application/EditorSession.ts` | kernel | 152 | ActiveDocument, EditorSession |
| `src/application/ShapeFactory.ts` | kernel | 118 | ShapeCreator, ShapeDefinition, ShapeFactory |
| `src/application/arguments.ts` | kernel | 31 | expectCount, numberAt |
| `src/application/commands/AddToCommand.ts` | kernel | 39 | AddToCommand |
| `src/application/commands/CreateCommand.ts` | kernel | 38 | CreateCommand |
| `src/application/commands/DeleteCommand.ts` | kernel | 34 | DeleteCommand |
| `src/application/commands/GroupCommand.ts` | kernel | 29 | GroupCommand |
| `src/application/commands/MoveCommand.ts` | kernel | 47 | AppliedMove, MoveCommand |
| `src/application/commands/ReorderCommand.ts` | kernel | 39 | OrderEdge, ReorderCommand |
| `src/application/commands/ScaleCommand.ts` | kernel | 24 | ScaleCommand |
| `src/application/commands/SetAttributeCommand.ts` | kernel | 28 | SetAttributeCommand |
| `src/application/commands/UngroupCommand.ts` | kernel | 23 | UngroupCommand |
| `src/cli/CommandRegistry.ts` | kernel | 311 | CommandResult, CommandHandler, CommandRegistry |
| `src/cli/Repl.ts` | kernel | 58 | Repl |
| `src/cli/Tokenizer.ts` | kernel | 45 | Tokenizer |
| `src/domain/document/SvgDocument.ts` | kernel | 395 | ShapeLocation, SvgDocument |
| `src/domain/shape/CircleShape.ts` | kernel | 46 | CircleGeometry, CircleShape |
| `src/domain/shape/EllipseShape.ts` | kernel | 47 | EllipseGeometry, EllipseShape |
| `src/domain/shape/GroupShape.ts` | kernel | 113 | GroupShape |
| `src/domain/shape/LineShape.ts` | kernel | 42 | LineGeometry, LineShape |
| `src/domain/shape/RectShape.ts` | kernel | 161 | RectShape |
| `src/domain/shape/Shape.ts` | kernel | 32 | ShapeAttributes, GeometryChange, Shape |
| `src/domain/shape/StyledShape.ts` | kernel | 71 | StyledShape |
| `src/domain/shape/TextShape.ts` | kernel | 42 | TextPosition, TextShape |
| `src/infrastructure/SvgCodec.ts` | kernel | 152 | svgNamespace, xmlnsNamespace, SvgCodec |
| `src/infrastructure/SvgFileStore.ts` | kernel | 44 | SvgFileStore |
| `src/main.ts` | assembly | 11 | session, tokenizer, commands |
| `src/presentation/Formatters.ts` | kernel | 111 | treeAttributeNames, Formatters |

### p2

| 文件 | 分类 | 行数 | 职责（顶层类型/函数） |
|---|---|---:|---|
| `src/application/CommandBus.ts` | kernel | 73 | EditCommand, CommandBus |
| `src/application/DirectoryReader.ts` | kernel | 19 | DirectoryEntryKind, DirectoryEntry, DirectoryReadError, DirectoryReader |
| `src/application/DocumentStore.ts` | kernel | 12 | LoadedDocument, DocumentStore |
| `src/application/EditorSession.ts` | kernel | 184 | ActiveDocument, EditorSession |
| `src/application/ShapeFactory.ts` | kernel | 39 | ShapeFactory |
| `src/application/arguments.ts` | kernel | 31 | expectCount, numberAt |
| `src/application/commands/AddToCommand.ts` | kernel | 39 | AddToCommand |
| `src/application/commands/CreateCommand.ts` | kernel | 38 | CreateCommand |
| `src/application/commands/DeleteCommand.ts` | kernel | 34 | DeleteCommand |
| `src/application/commands/GroupCommand.ts` | kernel | 29 | GroupCommand |
| `src/application/commands/MoveCommand.ts` | kernel | 47 | AppliedMove, MoveCommand |
| `src/application/commands/ReorderCommand.ts` | kernel | 39 | OrderEdge, ReorderCommand |
| `src/application/commands/ScaleCommand.ts` | kernel | 24 | ScaleCommand |
| `src/application/commands/SetAttributeCommand.ts` | kernel | 45 | AttributeChangeFactory, SetAttributeCommand |
| `src/application/commands/UngroupCommand.ts` | kernel | 23 | UngroupCommand |
| `src/application/extensions/ExtensionRegistry.ts` | kernel | 146 | Category, ContributionMap, categories, DuplicateRegistrationError |
| `src/application/extensions/PluginContracts.ts` | kernel | 83 | CommandResult, SvgElementData, ShapeProvider, PluginCommandContext |
| `src/assembly/PluginLoader.ts` | assembly | 187 | PluginConfigEntry, PluginConfig, PluginLoader, parseConfig |
| `src/cli/CommandRegistry.ts` | kernel | 331 | CommandHandler, CommandRegistry |
| `src/cli/Repl.ts` | kernel | 58 | Repl |
| `src/cli/Tokenizer.ts` | kernel | 45 | Tokenizer |
| `src/domain/TreeDecorator.ts` | kernel | 17 | TreeDecorationTarget, TreeDecorator |
| `src/domain/document/SvgDocument.ts` | kernel | 414 | ShapeLocation, SvgDocument |
| `src/domain/shape/CircleShape.ts` | kernel | 46 | CircleGeometry, CircleShape |
| `src/domain/shape/EllipseShape.ts` | kernel | 47 | EllipseGeometry, EllipseShape |
| `src/domain/shape/GroupShape.ts` | kernel | 119 | GroupShape |
| `src/domain/shape/LineShape.ts` | kernel | 42 | LineGeometry, LineShape |
| `src/domain/shape/RectShape.ts` | kernel | 161 | RectShape |
| `src/domain/shape/Shape.ts` | kernel | 49 | ShapeAttributes, GeometryChange, Shape, ContainerShape |
| `src/domain/shape/StyledShape.ts` | kernel | 71 | StyledShape |
| `src/domain/shape/TextShape.ts` | kernel | 42 | TextPosition, TextShape |
| `src/infrastructure/NodeDirectoryReader.ts` | kernel | 26 | NodeDirectoryReader |
| `src/infrastructure/SvgCodec.ts` | kernel | 156 | svgNamespace, xmlnsNamespace, SvgCodec |
| `src/infrastructure/SvgFileStore.ts` | kernel | 44 | SvgFileStore |
| `src/main.ts` | assembly | 52 | extensions, loader, baseFailure, startupArguments |
| `src/plugins/box/BoxPlugin.ts` | plugins | 108 | BoxShapeProvider, BoxAttributeHandler, BoxTypeDecorator, BoxPlugin |
| `src/plugins/box/BoxShape.ts` | plugins | 42 | BoxShape |
| `src/plugins/dir/DirPlugin.ts` | plugins | 47 | DirCommand, DirPlugin, dirPlugin |
| `src/plugins/shapes/BuiltinShapesPlugin.ts` | plugins | 125 | ShapeType, BuiltinShapeProvider, BuiltinShapesPlugin, numericAttribute |
| `src/plugins/stats/StatsPlugin.ts` | plugins | 46 | StatsCommand, StatsPlugin, statsPlugin |
| `src/plugins/tree/ModifiedStarPlugin.ts` | plugins | 49 | ModifiedStarDecorator, ModifiedStarPlugin, modifiedStarPlugin |
| `src/presentation/Formatters.ts` | kernel | 140 | treeAttributeNames, Formatters |

## VS Code 扩展（单独统计）

以下扩展源码指标与 CLI 重构增量分开统计；只包含 Git 引用中的 `vscode-extension/src/**/*.ts`。

| 引用 | 文件数 | 行数 | 文件与职责 |
|---|---:|---:|---|
| final | 0 | 0 | — |
| p2 | 5 | 198 | `vscode-extension/src/FileDecorationProvider.ts` (29 行：SvgFileDecorationProvider)<br>`vscode-extension/src/SvgOutlineProvider.ts` (30 行：SvgOutlineProvider, toDocumentSymbol, toVscodeRange)<br>`vscode-extension/src/extension.ts` (20 行：activate)<br>`vscode-extension/src/fileDecorationPolicy.ts` (3 行：shouldDecorateSvg)<br>`vscode-extension/src/svgOutline.ts` (116 行：SourcePosition, SourceRange, SvgOutlineNode, parseSvgOutline) |
