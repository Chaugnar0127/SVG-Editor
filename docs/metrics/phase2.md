# Phase 2 源码指标

本报告由 `pnpm metrics` 生成，比较 Git 引用 `final` 与 `p2`。CLI 统计范围为 `src/**/*.ts`；VS Code 扩展、测试、依赖和构建产物不计入 CLI 重构数据。

版本以源码目录的 Git 树哈希标识；仅修改文档或包版本号不会改变这些快照。发布前可运行 `pnpm metrics HEAD` 生成待标记为 `p2` 的源码指标，标签更新后运行 `pnpm metrics` 应得到相同报告。

- final CLI 源码树（`src`）: `90ff6767c162e9645ed3d7948af28b4deae56fe6`
- p2 CLI 源码树（`src`）: `1995f3611b27f1a45de34761f931713c931f72cf`
- final VS Code 源码树（`vscode-extension/src`）: 无
- p2 VS Code 源码树（`vscode-extension/src`）: `1c460f0f3299d7a92b7915e7cef0a187b75b41c2`
- 行数：文件中的物理行数，排除末尾换行产生的空项。
- 圈复杂度：模块计 1 加模块级决策点；函数各计 1 加函数体内决策点（不进入嵌套函数）。决策点包括 if/循环/case/catch/条件表达式及 `&&`、`||`、`??`。文件和分类总和包含模块基础分；函数分布单独列出，避免把汇总值当成单个函数的复杂度。
- 函数分布中的 `>10`、`>20`、`>50` 是严格大于对应数值的函数数量，用于定位，不作为自动判定结果。
- 分类：内核包括 application、cli、domain、infrastructure、presentation；装配包括 `main.ts` 与 `assembly`；插件包括 `src/plugins`。

## 汇总

| 分类 | final 文件 | p2 文件 | final 行数 | p2 行数 | 行数变化 | final 圈复杂度 | p2 圈复杂度 | 复杂度变化 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| kernel | 29 | 39 | 2357 | 2812 | 455 | 577 | 680 | 103 |
| assembly | 1 | 3 | 11 | 256 | 245 | 1 | 90 | 89 |
| plugins | 0 | 20 | 0 | 756 | 756 | 0 | 193 | 193 |

## 函数复杂度分布

单函数指标适合定位复杂逻辑；分类总和会随文件和函数数量增长。

| 引用 | 分类 | 函数数 | 平均复杂度 | 最大复杂度 | >10 | >20 | >50 |
|---|---|---:|---:|---:|---:|---:|---:|
| final | kernel | 266 | 2.06 | 15 | 1 | 0 | 0 |
| final | assembly | 0 | 0.00 | 0 | 0 | 0 | 0 |
| final | plugins | 0 | 0.00 | 0 | 0 | 0 | 0 |
| final | **全部** | 266 | 2.06 | 15 | 1 | 0 | 0 |
| p2 | kernel | 315 | 2.03 | 15 | 1 | 0 | 0 |
| p2 | assembly | 17 | 4.59 | 15 | 2 | 0 | 0 |
| p2 | plugins | 88 | 1.97 | 14 | 2 | 0 | 0 |
| p2 | **全部** | 420 | 2.12 | 15 | 5 | 0 | 0 |

## 文件职责与复杂度

### final

| 文件 | 分类 | 行数 | 文件复杂度总和 | 函数数 | 最大函数复杂度 | >10 | 职责（顶层类型/函数） |
|---|---|---:|---:|---:|---:|---:|---|
| `src/application/CommandBus.ts` | kernel | 73 | 10 | 6 | 2 | 0 | EditCommand, CommandBus |
| `src/application/DocumentStore.ts` | kernel | 12 | 1 | 0 | 0 | 0 | LoadedDocument, DocumentStore |
| `src/application/EditorSession.ts` | kernel | 152 | 26 | 20 | 4 | 0 | ActiveDocument, EditorSession |
| `src/application/ShapeFactory.ts` | kernel | 118 | 30 | 17 | 7 | 0 | ShapeCreator, ShapeDefinition, ShapeFactory |
| `src/application/arguments.ts` | kernel | 31 | 7 | 2 | 4 | 0 | expectCount, numberAt |
| `src/application/commands/AddToCommand.ts` | kernel | 39 | 6 | 3 | 2 | 0 | AddToCommand |
| `src/application/commands/CreateCommand.ts` | kernel | 38 | 7 | 3 | 3 | 0 | CreateCommand |
| `src/application/commands/DeleteCommand.ts` | kernel | 34 | 6 | 3 | 2 | 0 | DeleteCommand |
| `src/application/commands/GroupCommand.ts` | kernel | 29 | 7 | 3 | 3 | 0 | GroupCommand |
| `src/application/commands/MoveCommand.ts` | kernel | 47 | 7 | 3 | 3 | 0 | AppliedMove, MoveCommand |
| `src/application/commands/ReorderCommand.ts` | kernel | 39 | 7 | 3 | 3 | 0 | OrderEdge, ReorderCommand |
| `src/application/commands/ScaleCommand.ts` | kernel | 24 | 7 | 3 | 3 | 0 | ScaleCommand |
| `src/application/commands/SetAttributeCommand.ts` | kernel | 28 | 7 | 3 | 3 | 0 | SetAttributeCommand |
| `src/application/commands/UngroupCommand.ts` | kernel | 23 | 7 | 3 | 3 | 0 | UngroupCommand |
| `src/cli/CommandRegistry.ts` | kernel | 311 | 62 | 42 | 9 | 0 | CommandResult, CommandHandler, CommandRegistry |
| `src/cli/Repl.ts` | kernel | 58 | 11 | 5 | 5 | 0 | Repl |
| `src/cli/Tokenizer.ts` | kernel | 45 | 11 | 1 | 10 | 0 | Tokenizer |
| `src/domain/document/SvgDocument.ts` | kernel | 395 | 101 | 43 | 8 | 0 | ShapeLocation, SvgDocument |
| `src/domain/shape/CircleShape.ts` | kernel | 46 | 11 | 8 | 2 | 0 | CircleGeometry, CircleShape |
| `src/domain/shape/EllipseShape.ts` | kernel | 47 | 11 | 8 | 2 | 0 | EllipseGeometry, EllipseShape |
| `src/domain/shape/GroupShape.ts` | kernel | 113 | 31 | 16 | 7 | 0 | GroupShape |
| `src/domain/shape/LineShape.ts` | kernel | 42 | 10 | 7 | 2 | 0 | LineGeometry, LineShape |
| `src/domain/shape/RectShape.ts` | kernel | 161 | 42 | 13 | 10 | 0 | RectShape |
| `src/domain/shape/Shape.ts` | kernel | 32 | 1 | 0 | 0 | 0 | ShapeAttributes, GeometryChange, Shape |
| `src/domain/shape/StyledShape.ts` | kernel | 71 | 29 | 14 | 5 | 0 | StyledShape |
| `src/domain/shape/TextShape.ts` | kernel | 42 | 12 | 8 | 4 | 0 | TextPosition, TextShape |
| `src/infrastructure/SvgCodec.ts` | kernel | 152 | 69 | 15 | 15 | 1 | svgNamespace, xmlnsNamespace, SvgCodec |
| `src/infrastructure/SvgFileStore.ts` | kernel | 44 | 12 | 3 | 6 | 0 | SvgFileStore |
| `src/main.ts` | assembly | 11 | 1 | 0 | 0 | 0 | session, tokenizer, commands |
| `src/presentation/Formatters.ts` | kernel | 111 | 29 | 11 | 6 | 0 | treeAttributeNames, Formatters |

### p2

| 文件 | 分类 | 行数 | 文件复杂度总和 | 函数数 | 最大函数复杂度 | >10 | 职责（顶层类型/函数） |
|---|---|---:|---:|---:|---:|---:|---|
| `src/application/BuiltinCommands.ts` | kernel | 8 | 1 | 0 | 0 | 0 | builtinCommandNames, BuiltinCommandName |
| `src/application/CommandBus.ts` | kernel | 73 | 10 | 6 | 2 | 0 | EditCommand, CommandBus |
| `src/application/DirectoryReadError.ts` | kernel | 6 | 2 | 1 | 1 | 0 | DirectoryReadError |
| `src/application/DirectoryReader.ts` | kernel | 12 | 1 | 0 | 0 | 0 | DirectoryEntryKind, DirectoryEntry, DirectoryReader |
| `src/application/DocumentStore.ts` | kernel | 12 | 1 | 0 | 0 | 0 | LoadedDocument, DocumentStore |
| `src/application/EditorSession.ts` | kernel | 189 | 36 | 27 | 4 | 0 | ActiveDocument, EditorSession |
| `src/application/ShapeFactory.ts` | kernel | 39 | 17 | 8 | 4 | 0 | ShapeFactory |
| `src/application/arguments.ts` | kernel | 31 | 7 | 2 | 4 | 0 | expectCount, numberAt |
| `src/application/commands/AddToCommand.ts` | kernel | 39 | 6 | 3 | 2 | 0 | AddToCommand |
| `src/application/commands/CreateCommand.ts` | kernel | 38 | 7 | 3 | 3 | 0 | CreateCommand |
| `src/application/commands/DeleteCommand.ts` | kernel | 34 | 6 | 3 | 2 | 0 | DeleteCommand |
| `src/application/commands/GroupCommand.ts` | kernel | 29 | 7 | 3 | 3 | 0 | GroupCommand |
| `src/application/commands/MoveCommand.ts` | kernel | 47 | 7 | 3 | 3 | 0 | AppliedMove, MoveCommand |
| `src/application/commands/ReorderCommand.ts` | kernel | 39 | 7 | 3 | 3 | 0 | OrderEdge, ReorderCommand |
| `src/application/commands/ScaleCommand.ts` | kernel | 24 | 7 | 3 | 3 | 0 | ScaleCommand |
| `src/application/commands/SetAttributeCommand.ts` | kernel | 45 | 10 | 4 | 4 | 0 | AttributeChangeFactory, SetAttributeCommand |
| `src/application/commands/UngroupCommand.ts` | kernel | 23 | 7 | 3 | 3 | 0 | UngroupCommand |
| `src/application/extensions/DuplicateRegistrationError.ts` | kernel | 7 | 2 | 1 | 1 | 0 | DuplicateRegistrationError |
| `src/application/extensions/ExtensionRegistry.ts` | kernel | 115 | 35 | 14 | 6 | 0 | Category, ContributionMap, categories, ExtensionRegistry |
| `src/application/extensions/PluginContracts.ts` | kernel | 85 | 1 | 0 | 0 | 0 | CommandResult, SvgElementData, ShapeProvider, PluginCommandContext |
| `src/application/extensions/StagingContext.ts` | kernel | 32 | 8 | 5 | 3 | 0 | StagingContext |
| `src/assembly/CliHost.ts` | assembly | 18 | 2 | 1 | 1 | 0 | createCliHost |
| `src/assembly/PluginLoader.ts` | assembly | 199 | 76 | 14 | 15 | 2 | PluginConfigEntry, PluginConfig, PluginLoader, resolvePluginModule |
| `src/cli/CommandRegistry.ts` | kernel | 323 | 70 | 47 | 10 | 0 | CommandHandler, CommandRegistry |
| `src/cli/Repl.ts` | kernel | 58 | 11 | 5 | 5 | 0 | Repl |
| `src/cli/Tokenizer.ts` | kernel | 45 | 11 | 1 | 10 | 0 | Tokenizer |
| `src/domain/TreeDecorator.ts` | kernel | 17 | 1 | 0 | 0 | 0 | TreeDecorationTarget, TreeDecorator |
| `src/domain/document/SvgDocument.ts` | kernel | 414 | 109 | 44 | 8 | 0 | ShapeLocation, SvgDocument |
| `src/domain/shape/CircleShape.ts` | kernel | 46 | 11 | 8 | 2 | 0 | CircleGeometry, CircleShape |
| `src/domain/shape/DiamondShape.ts` | kernel | 77 | 16 | 11 | 3 | 0 | DiamondGeometry, DiamondShape |
| `src/domain/shape/EllipseShape.ts` | kernel | 47 | 11 | 8 | 2 | 0 | EllipseGeometry, EllipseShape |
| `src/domain/shape/GroupShape.ts` | kernel | 119 | 33 | 18 | 7 | 0 | GroupShape |
| `src/domain/shape/LineShape.ts` | kernel | 50 | 11 | 8 | 2 | 0 | LineGeometry, LineShape |
| `src/domain/shape/RectShape.ts` | kernel | 161 | 42 | 13 | 10 | 0 | RectShape |
| `src/domain/shape/Shape.ts` | kernel | 61 | 5 | 1 | 4 | 0 | ShapeAttributes, ShapeSummary, GeometryChange, Shape |
| `src/domain/shape/StyledShape.ts` | kernel | 75 | 30 | 15 | 5 | 0 | StyledShape |
| `src/domain/shape/TextShape.ts` | kernel | 49 | 13 | 9 | 4 | 0 | TextPosition, TextShape |
| `src/infrastructure/NodeDirectoryReader.ts` | kernel | 27 | 9 | 4 | 3 | 0 | NodeDirectoryReader |
| `src/infrastructure/SvgCodec.ts` | kernel | 156 | 69 | 15 | 15 | 1 | svgNamespace, xmlnsNamespace, SvgCodec |
| `src/infrastructure/SvgFileStore.ts` | kernel | 44 | 12 | 3 | 6 | 0 | SvgFileStore |
| `src/main.ts` | assembly | 39 | 12 | 2 | 1 | 0 | extensions, loader, baseFailure, startupArguments |
| `src/plugins/box/BoxAttributeHandler.ts` | plugins | 18 | 7 | 2 | 3 | 0 | BoxAttributeHandler |
| `src/plugins/box/BoxPlugin.ts` | plugins | 25 | 2 | 1 | 1 | 0 | BoxPlugin, boxPlugin |
| `src/plugins/box/BoxShape.ts` | plugins | 46 | 18 | 6 | 9 | 0 | BoxShape |
| `src/plugins/box/BoxShapeProvider.ts` | plugins | 63 | 19 | 7 | 9 | 0 | BoxShapeProvider |
| `src/plugins/box/BoxTypeDecorator.ts` | plugins | 10 | 3 | 1 | 2 | 0 | BoxTypeDecorator |
| `src/plugins/dir/DirCommand.ts` | plugins | 35 | 11 | 3 | 5 | 0 | DirCommand |
| `src/plugins/dir/DirPlugin.ts` | plugins | 14 | 2 | 1 | 1 | 0 | DirPlugin, dirPlugin |
| `src/plugins/shapes/BuiltinShapeProvider.ts` | plugins | 79 | 28 | 13 | 12 | 1 | BuiltinShapeProvider |
| `src/plugins/shapes/BuiltinShapesPlugin.ts` | plugins | 33 | 3 | 1 | 2 | 0 | BuiltinShapesPlugin, builtinShapesPlugin |
| `src/plugins/shapes/CircleShapeProvider.ts` | plugins | 35 | 5 | 3 | 2 | 0 | CircleShapeProvider |
| `src/plugins/shapes/DiamondShapeProvider.ts` | plugins | 107 | 36 | 18 | 14 | 1 | DiamondShapeProvider |
| `src/plugins/shapes/EllipseShapeProvider.ts` | plugins | 37 | 5 | 3 | 2 | 0 | EllipseShapeProvider |
| `src/plugins/shapes/GroupShapeProvider.ts` | plugins | 23 | 4 | 3 | 1 | 0 | GroupShapeProvider |
| `src/plugins/shapes/LineShapeProvider.ts` | plugins | 37 | 5 | 3 | 2 | 0 | LineShapeProvider |
| `src/plugins/shapes/RectShapeProvider.ts` | plugins | 37 | 5 | 3 | 2 | 0 | RectShapeProvider |
| `src/plugins/shapes/TextShapeProvider.ts` | plugins | 32 | 5 | 4 | 1 | 0 | TextShapeProvider |
| `src/plugins/stats/StatsCommand.ts` | plugins | 35 | 9 | 3 | 4 | 0 | StatsCommand |
| `src/plugins/stats/StatsPlugin.ts` | plugins | 14 | 2 | 1 | 1 | 0 | StatsPlugin, statsPlugin |
| `src/plugins/tree/ModifiedStarDecorator.ts` | plugins | 62 | 22 | 11 | 4 | 0 | ModifiedStarDecorator |
| `src/plugins/tree/ModifiedStarPlugin.ts` | plugins | 14 | 2 | 1 | 1 | 0 | ModifiedStarPlugin, modifiedStarPlugin |
| `src/presentation/Formatters.ts` | kernel | 116 | 31 | 13 | 5 | 0 | treeAttributeNames, Formatters |

## 函数明细（按复杂度降序）

| 引用 | 文件 | 函数 | 起始行 | 圈复杂度 |
|---|---|---|---:|---:|
| final | `src/infrastructure/SvgCodec.ts` | `decode` | 15 | 15 |
| final | `src/cli/Tokenizer.ts` | `tokenize` | 2 | 10 |
| final | `src/domain/shape/RectShape.ts` | `constructor` | 10 | 10 |
| final | `src/cli/CommandRegistry.ts` | `create` | 108 | 9 |
| final | `src/domain/shape/RectShape.ts` | `prepareScale` | 74 | 9 |
| final | `src/infrastructure/SvgCodec.ts` | `readShape (callback)` | 44 | 9 |
| final | `src/infrastructure/SvgCodec.ts` | `assertDocumentNodes` | 125 | 9 |
| final | `src/domain/document/SvgDocument.ts` | `moveTo` | 180 | 8 |
| final | `src/domain/shape/RectShape.ts` | `prepareSet` | 120 | 8 |
| final | `src/application/ShapeFactory.ts` | `fromAttributes` | 45 | 7 |
| final | `src/domain/document/SvgDocument.ts` | `add` | 120 | 7 |
| final | `src/domain/document/SvgDocument.ts` | `visit (callback)` | 252 | 7 |
| final | `src/domain/shape/GroupShape.ts` | `add` | 26 | 7 |
| final | `src/infrastructure/SvgFileStore.ts` | `write` | 21 | 6 |
| final | `src/presentation/Formatters.ts` | `describe` | 56 | 6 |
| final | `src/cli/Repl.ts` | `handleLine` | 37 | 5 |
| final | `src/domain/document/SvgDocument.ts` | `constructor` | 18 | 5 |
| final | `src/domain/document/SvgDocument.ts` | `prepareGroup` | 245 | 5 |
| final | `src/domain/document/SvgDocument.ts` | `search (callback)` | 332 | 5 |
| final | `src/domain/document/SvgDocument.ts` | `validateDimensions` | 386 | 5 |
| final | `src/domain/shape/RectShape.ts` | `prepareMove` | 100 | 5 |
| final | `src/domain/shape/StyledShape.ts` | `prepareSet` | 25 | 5 |
| final | `src/infrastructure/SvgCodec.ts` | `append (callback)` | 75 | 5 |
| final | `src/infrastructure/SvgCodec.ts` | `directText` | 116 | 5 |
| final | `src/application/arguments.ts` | `numberAt` | 13 | 4 |
| final | `src/application/EditorSession.ts` | `save` | 53 | 4 |
| final | `src/domain/document/SvgDocument.ts` | `search (callback)` | 66 | 4 |
| final | `src/domain/shape/TextShape.ts` | `prepareSet` | 30 | 4 |
| final | `src/infrastructure/SvgCodec.ts` | `reserveIds (callback)` | 34 | 4 |
| final | `src/infrastructure/SvgCodec.ts` | `attributes` | 95 | 4 |
| final | `src/infrastructure/SvgCodec.ts` | `elements` | 107 | 4 |
| final | `src/infrastructure/SvgFileStore.ts` | `read` | 11 | 4 |
| final | `src/presentation/Formatters.ts` | `tree` | 11 | 4 |
| final | `src/presentation/Formatters.ts` | `appendChildren` | 39 | 4 |
| final | `src/presentation/Formatters.ts` | `formatValue` | 101 | 4 |
| final | `src/application/commands/CreateCommand.ts` | `execute` | 15 | 3 |
| final | `src/application/commands/GroupCommand.ts` | `undo` | 23 | 3 |
| final | `src/application/commands/MoveCommand.ts` | `undo` | 33 | 3 |
| final | `src/application/commands/ReorderCommand.ts` | `execute` | 18 | 3 |
| final | `src/application/commands/ScaleCommand.ts` | `undo` | 18 | 3 |
| final | `src/application/commands/SetAttributeCommand.ts` | `undo` | 22 | 3 |
| final | `src/application/commands/UngroupCommand.ts` | `undo` | 17 | 3 |
| final | `src/application/ShapeFactory.ts` | `create` | 28 | 3 |
| final | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 48 | 3 |
| final | `src/cli/CommandRegistry.ts` | `execute` | 56 | 3 |
| final | `src/cli/CommandRegistry.ts` | `init` | 72 | 3 |
| final | `src/cli/CommandRegistry.ts` | `addTo` | 206 | 3 |
| final | `src/cli/CommandRegistry.ts` | `singleId` | 302 | 3 |
| final | `src/domain/document/SvgDocument.ts` | `requireContainer` | 102 | 3 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 289 | 3 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 308 | 3 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 316 | 3 |
| final | `src/domain/document/SvgDocument.ts` | `visit (callback)` | 366 | 3 |
| final | `src/domain/shape/GroupShape.ts` | `prepareMove` | 69 | 3 |
| final | `src/domain/shape/GroupShape.ts` | `prepareScale` | 80 | 3 |
| final | `src/domain/shape/StyledShape.ts` | `constructor` | 8 | 3 |
| final | `src/domain/shape/StyledShape.ts` | `number` | 46 | 3 |
| final | `src/domain/shape/StyledShape.ts` | `positive` | 60 | 3 |
| final | `src/domain/shape/StyledShape.ts` | `factor` | 66 | 3 |
| final | `src/infrastructure/SvgCodec.ts` | `encode` | 69 | 3 |
| final | `src/infrastructure/SvgCodec.ts` | `length` | 139 | 3 |
| final | `src/presentation/Formatters.ts` | `<anonymous callback>` | 94 | 3 |
| final | `src/application/arguments.ts` | `expectCount` | 2 | 2 |
| final | `src/application/CommandBus.ts` | `undo` | 30 | 2 |
| final | `src/application/CommandBus.ts` | `redo` | 46 | 2 |
| final | `src/application/CommandBus.ts` | `assertHistoryUnlocked` | 68 | 2 |
| final | `src/application/commands/AddToCommand.ts` | `execute` | 17 | 2 |
| final | `src/application/commands/AddToCommand.ts` | `undo` | 29 | 2 |
| final | `src/application/commands/CreateCommand.ts` | `undo` | 30 | 2 |
| final | `src/application/commands/DeleteCommand.ts` | `execute` | 14 | 2 |
| final | `src/application/commands/DeleteCommand.ts` | `undo` | 24 | 2 |
| final | `src/application/commands/GroupCommand.ts` | `execute` | 16 | 2 |
| final | `src/application/commands/MoveCommand.ts` | `execute` | 20 | 2 |
| final | `src/application/commands/ReorderCommand.ts` | `undo` | 29 | 2 |
| final | `src/application/commands/ScaleCommand.ts` | `execute` | 10 | 2 |
| final | `src/application/commands/SetAttributeCommand.ts` | `execute` | 14 | 2 |
| final | `src/application/commands/UngroupCommand.ts` | `execute` | 10 | 2 |
| final | `src/application/EditorSession.ts` | `requireCurrent` | 138 | 2 |
| final | `src/application/EditorSession.ts` | `requireStore` | 148 | 2 |
| final | `src/application/ShapeFactory.ts` | `definition` | 59 | 2 |
| final | `src/application/ShapeFactory.ts` | `svgNumber` | 65 | 2 |
| final | `src/cli/CommandRegistry.ts` | `canvas` | 90 | 2 |
| final | `src/cli/CommandRegistry.ts` | `move` | 186 | 2 |
| final | `src/cli/CommandRegistry.ts` | `group` | 233 | 2 |
| final | `src/cli/Repl.ts` | `start` | 15 | 2 |
| final | `src/domain/document/SvgDocument.ts` | `require` | 86 | 2 |
| final | `src/domain/document/SvgDocument.ts` | `remove` | 155 | 2 |
| final | `src/domain/document/SvgDocument.ts` | `containsParent (callback)` | 194 | 2 |
| final | `src/domain/document/SvgDocument.ts` | `ancestry (callback)` | 264 | 2 |
| final | `src/domain/document/SvgDocument.ts` | `branchIndex (callback)` | 274 | 2 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 282 | 2 |
| final | `src/domain/document/SvgDocument.ts` | `prepareUngroup` | 299 | 2 |
| final | `src/domain/document/SvgDocument.ts` | `locate` | 331 | 2 |
| final | `src/domain/document/SvgDocument.ts` | `validateNewSubtree` | 363 | 2 |
| final | `src/domain/shape/CircleShape.ts` | `constructor` | 10 | 2 |
| final | `src/domain/shape/CircleShape.ts` | `prepareSet` | 32 | 2 |
| final | `src/domain/shape/EllipseShape.ts` | `constructor` | 10 | 2 |
| final | `src/domain/shape/EllipseShape.ts` | `prepareSet` | 32 | 2 |
| final | `src/domain/shape/GroupShape.ts` | `remove` | 56 | 2 |
| final | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 92 | 2 |
| final | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 97 | 2 |
| final | `src/domain/shape/GroupShape.ts` | `containsShape` | 106 | 2 |
| final | `src/domain/shape/LineShape.ts` | `constructor` | 10 | 2 |
| final | `src/domain/shape/LineShape.ts` | `prepareSet` | 33 | 2 |
| final | `src/domain/shape/StyledShape.ts` | `<anonymous callback>` | 36 | 2 |
| final | `src/domain/shape/StyledShape.ts` | `finite` | 54 | 2 |
| final | `src/infrastructure/SvgCodec.ts` | `parseViewBox` | 133 | 2 |
| final | `src/infrastructure/SvgCodec.ts` | `assertXmlText` | 147 | 2 |
| final | `src/presentation/Formatters.ts` | `show` | 28 | 2 |
| final | `src/application/CommandBus.ts` | `constructor` | 18 | 1 |
| final | `src/application/CommandBus.ts` | `execute` | 21 | 1 |
| final | `src/application/CommandBus.ts` | `lockAfterIO` | 62 | 1 |
| final | `src/application/commands/AddToCommand.ts` | `constructor` | 11 | 1 |
| final | `src/application/commands/CreateCommand.ts` | `constructor` | 9 | 1 |
| final | `src/application/commands/DeleteCommand.ts` | `constructor` | 11 | 1 |
| final | `src/application/commands/GroupCommand.ts` | `constructor` | 11 | 1 |
| final | `src/application/commands/MoveCommand.ts` | `constructor` | 13 | 1 |
| final | `src/application/commands/ReorderCommand.ts` | `constructor` | 13 | 1 |
| final | `src/application/commands/ScaleCommand.ts` | `constructor` | 8 | 1 |
| final | `src/application/commands/SetAttributeCommand.ts` | `constructor` | 8 | 1 |
| final | `src/application/commands/UngroupCommand.ts` | `constructor` | 8 | 1 |
| final | `src/application/EditorSession.ts` | `constructor` | 26 | 1 |
| final | `src/application/EditorSession.ts` | `init` | 29 | 1 |
| final | `src/application/EditorSession.ts` | `requireDocument` | 39 | 1 |
| final | `src/application/EditorSession.ts` | `read` | 44 | 1 |
| final | `src/application/EditorSession.ts` | `resizeCanvas` | 66 | 1 |
| final | `src/application/EditorSession.ts` | `createShape` | 74 | 1 |
| final | `src/application/EditorSession.ts` | `deleteShape` | 87 | 1 |
| final | `src/application/EditorSession.ts` | `moveShape` | 92 | 1 |
| final | `src/application/EditorSession.ts` | `scaleShape` | 96 | 1 |
| final | `src/application/EditorSession.ts` | `setAttribute` | 100 | 1 |
| final | `src/application/EditorSession.ts` | `groupShapes` | 104 | 1 |
| final | `src/application/EditorSession.ts` | `ungroupShape` | 108 | 1 |
| final | `src/application/EditorSession.ts` | `addTo` | 113 | 1 |
| final | `src/application/EditorSession.ts` | `reorderShape` | 118 | 1 |
| final | `src/application/EditorSession.ts` | `undo` | 123 | 1 |
| final | `src/application/EditorSession.ts` | `redo` | 128 | 1 |
| final | `src/application/EditorSession.ts` | `execute` | 133 | 1 |
| final | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 19 | 1 |
| final | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 20 | 1 |
| final | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 21 | 1 |
| final | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 22 | 1 |
| final | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 23 | 1 |
| final | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 24 | 1 |
| final | `src/application/ShapeFactory.ts` | `createRect` | 73 | 1 |
| final | `src/application/ShapeFactory.ts` | `createGroup` | 90 | 1 |
| final | `src/application/ShapeFactory.ts` | `createCircle` | 96 | 1 |
| final | `src/application/ShapeFactory.ts` | `createEllipse` | 102 | 1 |
| final | `src/application/ShapeFactory.ts` | `createLine` | 108 | 1 |
| final | `src/application/ShapeFactory.ts` | `createText` | 114 | 1 |
| final | `src/cli/CommandRegistry.ts` | `constructor` | 15 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 17 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 18 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 19 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 20 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 21 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 22 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 23 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 24 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 25 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 26 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 27 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 28 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 29 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 30 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 31 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 32 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 33 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 36 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 44 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 50 | 1 |
| final | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 51 | 1 |
| final | `src/cli/CommandRegistry.ts` | `read` | 140 | 1 |
| final | `src/cli/CommandRegistry.ts` | `save` | 148 | 1 |
| final | `src/cli/CommandRegistry.ts` | `help` | 154 | 1 |
| final | `src/cli/CommandRegistry.ts` | `deleteShape` | 175 | 1 |
| final | `src/cli/CommandRegistry.ts` | `scale` | 224 | 1 |
| final | `src/cli/CommandRegistry.ts` | `ungroup` | 240 | 1 |
| final | `src/cli/CommandRegistry.ts` | `set` | 246 | 1 |
| final | `src/cli/CommandRegistry.ts` | `front` | 254 | 1 |
| final | `src/cli/CommandRegistry.ts` | `back` | 264 | 1 |
| final | `src/cli/CommandRegistry.ts` | `tree` | 274 | 1 |
| final | `src/cli/CommandRegistry.ts` | `show` | 285 | 1 |
| final | `src/cli/CommandRegistry.ts` | `exit` | 295 | 1 |
| final | `src/cli/Repl.ts` | `constructor` | 9 | 1 |
| final | `src/cli/Repl.ts` | `onLine (callback)` | 22 | 1 |
| final | `src/cli/Repl.ts` | `<anonymous callback>` | 28 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `width` | 31 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `height` | 36 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `viewBox` | 40 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `elementCount` | 44 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `count (callback)` | 45 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 45 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `resize` | 50 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `topLevel` | 59 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `find` | 64 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `parentOf` | 97 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `restore` | 171 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `bringToFront` | 225 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `sendToBack` | 235 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 250 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 272 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 273 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 273 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 279 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 304 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 305 | 1 |
| final | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 306 | 1 |
| final | `src/domain/shape/CircleShape.ts` | `attributes` | 17 | 1 |
| final | `src/domain/shape/CircleShape.ts` | `prepareMove` | 21 | 1 |
| final | `src/domain/shape/CircleShape.ts` | `prepareScale` | 26 | 1 |
| final | `src/domain/shape/CircleShape.ts` | `prepare` | 37 | 1 |
| final | `src/domain/shape/CircleShape.ts` | `<anonymous callback>` | 39 | 1 |
| final | `src/domain/shape/CircleShape.ts` | `validate` | 42 | 1 |
| final | `src/domain/shape/EllipseShape.ts` | `attributes` | 17 | 1 |
| final | `src/domain/shape/EllipseShape.ts` | `prepareMove` | 21 | 1 |
| final | `src/domain/shape/EllipseShape.ts` | `prepareScale` | 26 | 1 |
| final | `src/domain/shape/EllipseShape.ts` | `prepare` | 37 | 1 |
| final | `src/domain/shape/EllipseShape.ts` | `<anonymous callback>` | 39 | 1 |
| final | `src/domain/shape/EllipseShape.ts` | `validate` | 42 | 1 |
| final | `src/domain/shape/GroupShape.ts` | `constructor` | 9 | 1 |
| final | `src/domain/shape/GroupShape.ts` | `attributes` | 12 | 1 |
| final | `src/domain/shape/GroupShape.ts` | `children` | 17 | 1 |
| final | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 45 | 1 |
| final | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 57 | 1 |
| final | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 75 | 1 |
| final | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 86 | 1 |
| final | `src/domain/shape/GroupShape.ts` | `combineChanges` | 90 | 1 |
| final | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 111 | 1 |
| final | `src/domain/shape/LineShape.ts` | `attributes` | 17 | 1 |
| final | `src/domain/shape/LineShape.ts` | `prepareMove` | 21 | 1 |
| final | `src/domain/shape/LineShape.ts` | `prepareScale` | 27 | 1 |
| final | `src/domain/shape/LineShape.ts` | `prepare` | 38 | 1 |
| final | `src/domain/shape/LineShape.ts` | `<anonymous callback>` | 40 | 1 |
| final | `src/domain/shape/RectShape.ts` | `position` | 41 | 1 |
| final | `src/domain/shape/RectShape.ts` | `width` | 46 | 1 |
| final | `src/domain/shape/RectShape.ts` | `height` | 51 | 1 |
| final | `src/domain/shape/RectShape.ts` | `fill` | 56 | 1 |
| final | `src/domain/shape/RectShape.ts` | `attributes` | 61 | 1 |
| final | `src/domain/shape/RectShape.ts` | `children` | 116 | 1 |
| final | `src/domain/shape/RectShape.ts` | `geometryChange` | 135 | 1 |
| final | `src/domain/shape/RectShape.ts` | `<anonymous callback>` | 147 | 1 |
| final | `src/domain/shape/RectShape.ts` | `<anonymous callback>` | 153 | 1 |
| final | `src/domain/shape/StyledShape.ts` | `attributes` | 14 | 1 |
| final | `src/domain/shape/StyledShape.ts` | `children` | 18 | 1 |
| final | `src/domain/shape/StyledShape.ts` | `prepareMove` | 22 | 1 |
| final | `src/domain/shape/StyledShape.ts` | `prepareScale` | 23 | 1 |
| final | `src/domain/shape/StyledShape.ts` | `change` | 42 | 1 |
| final | `src/domain/shape/StyledShape.ts` | `<anonymous callback>` | 43 | 1 |
| final | `src/domain/shape/StyledShape.ts` | `<anonymous callback>` | 43 | 1 |
| final | `src/domain/shape/TextShape.ts` | `constructor` | 10 | 1 |
| final | `src/domain/shape/TextShape.ts` | `attributes` | 16 | 1 |
| final | `src/domain/shape/TextShape.ts` | `prepareMove` | 20 | 1 |
| final | `src/domain/shape/TextShape.ts` | `prepareScale` | 25 | 1 |
| final | `src/domain/shape/TextShape.ts` | `<anonymous callback>` | 32 | 1 |
| final | `src/domain/shape/TextShape.ts` | `prepare` | 38 | 1 |
| final | `src/domain/shape/TextShape.ts` | `<anonymous callback>` | 40 | 1 |
| final | `src/infrastructure/SvgCodec.ts` | `constructor` | 13 | 1 |
| final | `src/infrastructure/SvgCodec.ts` | `<anonymous callback>` | 17 | 1 |
| final | `src/infrastructure/SvgCodec.ts` | `<anonymous callback>` | 136 | 1 |
| final | `src/infrastructure/SvgFileStore.ts` | `constructor` | 9 | 1 |
| final | `src/presentation/Formatters.ts` | `<anonymous callback>` | 35 | 1 |
| final | `src/presentation/Formatters.ts` | `<anonymous callback>` | 69 | 1 |
| final | `src/presentation/Formatters.ts` | `label` | 83 | 1 |
| final | `src/presentation/Formatters.ts` | `attributePairs` | 87 | 1 |
| final | `src/presentation/Formatters.ts` | `<anonymous callback>` | 93 | 1 |
| p2 | `src/assembly/PluginLoader.ts` | `packageManifest` | 162 | 15 |
| p2 | `src/infrastructure/SvgCodec.ts` | `decode` | 14 | 15 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `geometryFromPoints` | 70 | 14 |
| p2 | `src/assembly/PluginLoader.ts` | `loadConfig` | 28 | 12 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `read` | 19 | 12 |
| p2 | `src/assembly/PluginLoader.ts` | `inspectDefaultExport` | 142 | 10 |
| p2 | `src/cli/CommandRegistry.ts` | `create` | 110 | 10 |
| p2 | `src/cli/Tokenizer.ts` | `tokenize` | 2 | 10 |
| p2 | `src/domain/shape/RectShape.ts` | `constructor` | 10 | 10 |
| p2 | `src/assembly/PluginLoader.ts` | `<anonymous callback>` | 119 | 9 |
| p2 | `src/domain/shape/RectShape.ts` | `prepareScale` | 74 | 9 |
| p2 | `src/infrastructure/SvgCodec.ts` | `append (callback)` | 73 | 9 |
| p2 | `src/infrastructure/SvgCodec.ts` | `assertDocumentNodes` | 129 | 9 |
| p2 | `src/plugins/box/BoxShape.ts` | `constructor` | 11 | 9 |
| p2 | `src/plugins/box/BoxShapeProvider.ts` | `read` | 34 | 9 |
| p2 | `src/domain/document/SvgDocument.ts` | `moveTo` | 193 | 8 |
| p2 | `src/domain/document/SvgDocument.ts` | `prepareGroup` | 258 | 8 |
| p2 | `src/domain/shape/RectShape.ts` | `prepareSet` | 120 | 8 |
| p2 | `src/assembly/PluginLoader.ts` | `validContributions` | 186 | 7 |
| p2 | `src/domain/document/SvgDocument.ts` | `add` | 130 | 7 |
| p2 | `src/domain/document/SvgDocument.ts` | `visit (callback)` | 265 | 7 |
| p2 | `src/domain/shape/GroupShape.ts` | `add` | 27 | 7 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `findCommittedDuplicate` | 83 | 6 |
| p2 | `src/assembly/PluginLoader.ts` | `resolvePluginModule` | 101 | 6 |
| p2 | `src/infrastructure/SvgFileStore.ts` | `write` | 21 | 6 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `install` | 28 | 5 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `findManifestMismatch` | 67 | 5 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `mapFor` | 95 | 5 |
| p2 | `src/cli/Repl.ts` | `handleLine` | 37 | 5 |
| p2 | `src/domain/document/SvgDocument.ts` | `constructor` | 18 | 5 |
| p2 | `src/domain/document/SvgDocument.ts` | `search (callback)` | 351 | 5 |
| p2 | `src/domain/document/SvgDocument.ts` | `validateDimensions` | 405 | 5 |
| p2 | `src/domain/shape/RectShape.ts` | `prepareMove` | 100 | 5 |
| p2 | `src/domain/shape/StyledShape.ts` | `prepareSet` | 29 | 5 |
| p2 | `src/infrastructure/SvgCodec.ts` | `readShape (callback)` | 43 | 5 |
| p2 | `src/infrastructure/SvgCodec.ts` | `directText` | 120 | 5 |
| p2 | `src/plugins/dir/DirCommand.ts` | `execute` | 10 | 5 |
| p2 | `src/presentation/Formatters.ts` | `tree` | 12 | 5 |
| p2 | `src/application/arguments.ts` | `numberAt` | 13 | 4 |
| p2 | `src/application/commands/SetAttributeCommand.ts` | `execute` | 22 | 4 |
| p2 | `src/application/EditorSession.ts` | `save` | 71 | 4 |
| p2 | `src/application/ShapeFactory.ts` | `create` | 10 | 4 |
| p2 | `src/application/ShapeFactory.ts` | `fromElement` | 20 | 4 |
| p2 | `src/assembly/PluginLoader.ts` | `formatFailure` | 89 | 4 |
| p2 | `src/assembly/PluginLoader.ts` | `parseConfig` | 115 | 4 |
| p2 | `src/cli/CommandRegistry.ts` | `execute` | 58 | 4 |
| p2 | `src/domain/document/SvgDocument.ts` | `search (callback)` | 66 | 4 |
| p2 | `src/domain/shape/Shape.ts` | `isContainerShape` | 55 | 4 |
| p2 | `src/domain/shape/TextShape.ts` | `prepareSet` | 37 | 4 |
| p2 | `src/infrastructure/SvgCodec.ts` | `reserveIds (callback)` | 33 | 4 |
| p2 | `src/infrastructure/SvgCodec.ts` | `attributes` | 99 | 4 |
| p2 | `src/infrastructure/SvgCodec.ts` | `elements` | 111 | 4 |
| p2 | `src/infrastructure/SvgFileStore.ts` | `read` | 11 | 4 |
| p2 | `src/plugins/dir/DirCommand.ts` | `<anonymous callback>` | 24 | 4 |
| p2 | `src/plugins/stats/StatsCommand.ts` | `visit (callback)` | 18 | 4 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `prepareShape` | 40 | 4 |
| p2 | `src/presentation/Formatters.ts` | `appendChildren` | 43 | 4 |
| p2 | `src/presentation/Formatters.ts` | `describe` | 74 | 4 |
| p2 | `src/presentation/Formatters.ts` | `formatValue` | 106 | 4 |
| p2 | `src/application/commands/CreateCommand.ts` | `execute` | 15 | 3 |
| p2 | `src/application/commands/GroupCommand.ts` | `undo` | 23 | 3 |
| p2 | `src/application/commands/MoveCommand.ts` | `undo` | 33 | 3 |
| p2 | `src/application/commands/ReorderCommand.ts` | `execute` | 18 | 3 |
| p2 | `src/application/commands/ScaleCommand.ts` | `undo` | 18 | 3 |
| p2 | `src/application/commands/SetAttributeCommand.ts` | `undo` | 39 | 3 |
| p2 | `src/application/commands/UngroupCommand.ts` | `undo` | 17 | 3 |
| p2 | `src/application/EditorSession.ts` | `prepareAttributeChange` | 179 | 3 |
| p2 | `src/application/extensions/StagingContext.ts` | `register` | 26 | 3 |
| p2 | `src/cli/CommandRegistry.ts` | `init` | 74 | 3 |
| p2 | `src/cli/CommandRegistry.ts` | `addTo` | 210 | 3 |
| p2 | `src/cli/CommandRegistry.ts` | `singleId` | 307 | 3 |
| p2 | `src/domain/document/SvgDocument.ts` | `requireModifiable` | 97 | 3 |
| p2 | `src/domain/document/SvgDocument.ts` | `requireContainer` | 112 | 3 |
| p2 | `src/domain/document/SvgDocument.ts` | `remove` | 165 | 3 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 307 | 3 |
| p2 | `src/domain/document/SvgDocument.ts` | `prepareUngroup` | 317 | 3 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 327 | 3 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 335 | 3 |
| p2 | `src/domain/document/SvgDocument.ts` | `visit (callback)` | 385 | 3 |
| p2 | `src/domain/shape/DiamondShape.ts` | `validate` | 64 | 3 |
| p2 | `src/domain/shape/GroupShape.ts` | `prepareMove` | 75 | 3 |
| p2 | `src/domain/shape/GroupShape.ts` | `prepareScale` | 86 | 3 |
| p2 | `src/domain/shape/StyledShape.ts` | `constructor` | 8 | 3 |
| p2 | `src/domain/shape/StyledShape.ts` | `number` | 50 | 3 |
| p2 | `src/domain/shape/StyledShape.ts` | `positive` | 64 | 3 |
| p2 | `src/domain/shape/StyledShape.ts` | `factor` | 70 | 3 |
| p2 | `src/infrastructure/NodeDirectoryReader.ts` | `<anonymous callback>` | 19 | 3 |
| p2 | `src/infrastructure/SvgCodec.ts` | `encode` | 67 | 3 |
| p2 | `src/infrastructure/SvgCodec.ts` | `length` | 143 | 3 |
| p2 | `src/plugins/box/BoxAttributeHandler.ts` | `handles` | 8 | 3 |
| p2 | `src/plugins/box/BoxAttributeHandler.ts` | `prepare` | 12 | 3 |
| p2 | `src/plugins/box/BoxShape.ts` | `canModifyChild` | 37 | 3 |
| p2 | `src/plugins/box/BoxShapeProvider.ts` | `write` | 57 | 3 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `parametersFromElement` | 53 | 3 |
| p2 | `src/plugins/stats/StatsCommand.ts` | `execute` | 10 | 3 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `prepare` | 16 | 3 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `<anonymous callback>` | 51 | 3 |
| p2 | `src/presentation/Formatters.ts` | `<anonymous callback>` | 99 | 3 |
| p2 | `src/application/arguments.ts` | `expectCount` | 2 | 2 |
| p2 | `src/application/CommandBus.ts` | `undo` | 30 | 2 |
| p2 | `src/application/CommandBus.ts` | `redo` | 46 | 2 |
| p2 | `src/application/CommandBus.ts` | `assertHistoryUnlocked` | 68 | 2 |
| p2 | `src/application/commands/AddToCommand.ts` | `execute` | 17 | 2 |
| p2 | `src/application/commands/AddToCommand.ts` | `undo` | 29 | 2 |
| p2 | `src/application/commands/CreateCommand.ts` | `undo` | 30 | 2 |
| p2 | `src/application/commands/DeleteCommand.ts` | `execute` | 14 | 2 |
| p2 | `src/application/commands/DeleteCommand.ts` | `undo` | 24 | 2 |
| p2 | `src/application/commands/GroupCommand.ts` | `execute` | 16 | 2 |
| p2 | `src/application/commands/MoveCommand.ts` | `execute` | 20 | 2 |
| p2 | `src/application/commands/ReorderCommand.ts` | `undo` | 29 | 2 |
| p2 | `src/application/commands/ScaleCommand.ts` | `execute` | 10 | 2 |
| p2 | `src/application/commands/UngroupCommand.ts` | `execute` | 10 | 2 |
| p2 | `src/application/EditorSession.ts` | `requireCurrent` | 158 | 2 |
| p2 | `src/application/EditorSession.ts` | `requireStore` | 168 | 2 |
| p2 | `src/application/EditorSession.ts` | `markDecoratorsSaved` | 174 | 2 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `commit` | 104 | 2 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `sameNames` | 109 | 2 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `errorMessage` | 113 | 2 |
| p2 | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 22 | 2 |
| p2 | `src/application/ShapeFactory.ts` | `toElement` | 34 | 2 |
| p2 | `src/assembly/PluginLoader.ts` | `install` | 22 | 2 |
| p2 | `src/assembly/PluginLoader.ts` | `errorMessage` | 197 | 2 |
| p2 | `src/cli/CommandRegistry.ts` | `canvas` | 92 | 2 |
| p2 | `src/cli/CommandRegistry.ts` | `move` | 190 | 2 |
| p2 | `src/cli/CommandRegistry.ts` | `group` | 238 | 2 |
| p2 | `src/cli/CommandRegistry.ts` | `pluginContext` | 317 | 2 |
| p2 | `src/cli/Repl.ts` | `start` | 15 | 2 |
| p2 | `src/domain/document/SvgDocument.ts` | `require` | 86 | 2 |
| p2 | `src/domain/document/SvgDocument.ts` | `containsParent (callback)` | 207 | 2 |
| p2 | `src/domain/document/SvgDocument.ts` | `ancestry (callback)` | 282 | 2 |
| p2 | `src/domain/document/SvgDocument.ts` | `branchIndex (callback)` | 292 | 2 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 300 | 2 |
| p2 | `src/domain/document/SvgDocument.ts` | `locate` | 350 | 2 |
| p2 | `src/domain/document/SvgDocument.ts` | `validateNewSubtree` | 382 | 2 |
| p2 | `src/domain/shape/CircleShape.ts` | `constructor` | 10 | 2 |
| p2 | `src/domain/shape/CircleShape.ts` | `prepareSet` | 32 | 2 |
| p2 | `src/domain/shape/DiamondShape.ts` | `constructor` | 16 | 2 |
| p2 | `src/domain/shape/DiamondShape.ts` | `prepareSet` | 54 | 2 |
| p2 | `src/domain/shape/EllipseShape.ts` | `constructor` | 10 | 2 |
| p2 | `src/domain/shape/EllipseShape.ts` | `prepareSet` | 32 | 2 |
| p2 | `src/domain/shape/GroupShape.ts` | `remove` | 57 | 2 |
| p2 | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 98 | 2 |
| p2 | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 103 | 2 |
| p2 | `src/domain/shape/GroupShape.ts` | `containsShape` | 112 | 2 |
| p2 | `src/domain/shape/LineShape.ts` | `constructor` | 10 | 2 |
| p2 | `src/domain/shape/LineShape.ts` | `prepareSet` | 41 | 2 |
| p2 | `src/domain/shape/StyledShape.ts` | `<anonymous callback>` | 40 | 2 |
| p2 | `src/domain/shape/StyledShape.ts` | `finite` | 58 | 2 |
| p2 | `src/infrastructure/NodeDirectoryReader.ts` | `list` | 15 | 2 |
| p2 | `src/infrastructure/NodeDirectoryReader.ts` | `<anonymous callback>` | 18 | 2 |
| p2 | `src/infrastructure/SvgCodec.ts` | `parseViewBox` | 137 | 2 |
| p2 | `src/infrastructure/SvgCodec.ts` | `assertXmlText` | 151 | 2 |
| p2 | `src/plugins/box/BoxShape.ts` | `remove` | 42 | 2 |
| p2 | `src/plugins/box/BoxShapeProvider.ts` | `canRead` | 29 | 2 |
| p2 | `src/plugins/box/BoxTypeDecorator.ts` | `decorate` | 7 | 2 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `numberOrZero` | 64 | 2 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `requiredNumber` | 68 | 2 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `numericAttribute` | 72 | 2 |
| p2 | `src/plugins/shapes/BuiltinShapesPlugin.ts` | `activate` | 17 | 2 |
| p2 | `src/plugins/shapes/CircleShapeProvider.ts` | `parametersFromElement` | 22 | 2 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `write` | 32 | 2 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `closeTo (callback)` | 96 | 2 |
| p2 | `src/plugins/shapes/EllipseShapeProvider.ts` | `parametersFromElement` | 23 | 2 |
| p2 | `src/plugins/shapes/LineShapeProvider.ts` | `parametersFromElement` | 23 | 2 |
| p2 | `src/plugins/shapes/RectShapeProvider.ts` | `parametersFromElement` | 23 | 2 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `decorate` | 11 | 2 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `onSaved` | 29 | 2 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `capture` | 35 | 2 |
| p2 | `src/presentation/Formatters.ts` | `show` | 32 | 2 |
| p2 | `src/presentation/Formatters.ts` | `decoration` | 61 | 2 |
| p2 | `src/application/CommandBus.ts` | `constructor` | 18 | 1 |
| p2 | `src/application/CommandBus.ts` | `execute` | 21 | 1 |
| p2 | `src/application/CommandBus.ts` | `lockAfterIO` | 62 | 1 |
| p2 | `src/application/commands/AddToCommand.ts` | `constructor` | 11 | 1 |
| p2 | `src/application/commands/CreateCommand.ts` | `constructor` | 9 | 1 |
| p2 | `src/application/commands/DeleteCommand.ts` | `constructor` | 11 | 1 |
| p2 | `src/application/commands/GroupCommand.ts` | `constructor` | 11 | 1 |
| p2 | `src/application/commands/MoveCommand.ts` | `constructor` | 13 | 1 |
| p2 | `src/application/commands/ReorderCommand.ts` | `constructor` | 13 | 1 |
| p2 | `src/application/commands/ScaleCommand.ts` | `constructor` | 8 | 1 |
| p2 | `src/application/commands/SetAttributeCommand.ts` | `constructor` | 14 | 1 |
| p2 | `src/application/commands/SetAttributeCommand.ts` | `<anonymous callback>` | 18 | 1 |
| p2 | `src/application/commands/UngroupCommand.ts` | `constructor` | 8 | 1 |
| p2 | `src/application/DirectoryReadError.ts` | `constructor` | 3 | 1 |
| p2 | `src/application/EditorSession.ts` | `constructor` | 28 | 1 |
| p2 | `src/application/EditorSession.ts` | `init` | 35 | 1 |
| p2 | `src/application/EditorSession.ts` | `requireDocument` | 46 | 1 |
| p2 | `src/application/EditorSession.ts` | `getDocument` | 51 | 1 |
| p2 | `src/application/EditorSession.ts` | `shapeCreationUsages` | 56 | 1 |
| p2 | `src/application/EditorSession.ts` | `<anonymous callback>` | 57 | 1 |
| p2 | `src/application/EditorSession.ts` | `read` | 61 | 1 |
| p2 | `src/application/EditorSession.ts` | `resizeCanvas` | 85 | 1 |
| p2 | `src/application/EditorSession.ts` | `createShape` | 93 | 1 |
| p2 | `src/application/EditorSession.ts` | `deleteShape` | 106 | 1 |
| p2 | `src/application/EditorSession.ts` | `moveShape` | 111 | 1 |
| p2 | `src/application/EditorSession.ts` | `scaleShape` | 115 | 1 |
| p2 | `src/application/EditorSession.ts` | `setAttribute` | 119 | 1 |
| p2 | `src/application/EditorSession.ts` | `<anonymous callback>` | 121 | 1 |
| p2 | `src/application/EditorSession.ts` | `groupShapes` | 124 | 1 |
| p2 | `src/application/EditorSession.ts` | `ungroupShape` | 128 | 1 |
| p2 | `src/application/EditorSession.ts` | `addTo` | 133 | 1 |
| p2 | `src/application/EditorSession.ts` | `reorderShape` | 138 | 1 |
| p2 | `src/application/EditorSession.ts` | `undo` | 143 | 1 |
| p2 | `src/application/EditorSession.ts` | `redo` | 148 | 1 |
| p2 | `src/application/EditorSession.ts` | `execute` | 153 | 1 |
| p2 | `src/application/EditorSession.ts` | `<anonymous callback>` | 180 | 1 |
| p2 | `src/application/extensions/DuplicateRegistrationError.ts` | `constructor` | 4 | 1 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `shapeProvider` | 60 | 1 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `shapeProviders` | 61 | 1 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `command` | 62 | 1 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `commandsList` | 63 | 1 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `treeDecorators` | 64 | 1 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `attributeHandlers` | 65 | 1 |
| p2 | `src/application/extensions/ExtensionRegistry.ts` | `<anonymous callback>` | 110 | 1 |
| p2 | `src/application/extensions/StagingContext.ts` | `registerShapeProvider` | 10 | 1 |
| p2 | `src/application/extensions/StagingContext.ts` | `registerCommand` | 14 | 1 |
| p2 | `src/application/extensions/StagingContext.ts` | `registerTreeDecorator` | 18 | 1 |
| p2 | `src/application/extensions/StagingContext.ts` | `registerAttributeHandler` | 22 | 1 |
| p2 | `src/application/ShapeFactory.ts` | `constructor` | 7 | 1 |
| p2 | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 21 | 1 |
| p2 | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 24 | 1 |
| p2 | `src/application/ShapeFactory.ts` | `<anonymous callback>` | 35 | 1 |
| p2 | `src/assembly/CliHost.ts` | `createCliHost` | 12 | 1 |
| p2 | `src/assembly/PluginLoader.ts` | `constructor` | 19 | 1 |
| p2 | `src/assembly/PluginLoader.ts` | `<anonymous callback>` | 80 | 1 |
| p2 | `src/assembly/PluginLoader.ts` | `<anonymous callback>` | 190 | 1 |
| p2 | `src/assembly/PluginLoader.ts` | `<anonymous callback>` | 194 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `constructor` | 18 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 24 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 25 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 26 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 27 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 28 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 29 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 30 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 31 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 32 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 33 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 34 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 35 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 36 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 37 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 38 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 39 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 40 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 41 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 46 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 51 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 52 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 54 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `read` | 145 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `save` | 153 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `help` | 159 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 174 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 175 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `deleteShape` | 179 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `scale` | 229 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `ungroup` | 245 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `set` | 251 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `front` | 259 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `back` | 269 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `tree` | 279 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `show` | 290 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `exit` | 300 | 1 |
| p2 | `src/cli/CommandRegistry.ts` | `<anonymous callback>` | 319 | 1 |
| p2 | `src/cli/Repl.ts` | `constructor` | 9 | 1 |
| p2 | `src/cli/Repl.ts` | `onLine (callback)` | 22 | 1 |
| p2 | `src/cli/Repl.ts` | `<anonymous callback>` | 28 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `width` | 31 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `height` | 36 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `viewBox` | 40 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `elementCount` | 44 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `count (callback)` | 45 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 45 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `resize` | 50 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `topLevel` | 59 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `find` | 64 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `parentOf` | 107 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `restore` | 184 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `bringToFront` | 238 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `sendToBack` | 248 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 263 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 290 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 291 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 291 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 297 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 323 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 324 | 1 |
| p2 | `src/domain/document/SvgDocument.ts` | `<anonymous callback>` | 325 | 1 |
| p2 | `src/domain/shape/CircleShape.ts` | `attributes` | 17 | 1 |
| p2 | `src/domain/shape/CircleShape.ts` | `prepareMove` | 21 | 1 |
| p2 | `src/domain/shape/CircleShape.ts` | `prepareScale` | 26 | 1 |
| p2 | `src/domain/shape/CircleShape.ts` | `prepare` | 37 | 1 |
| p2 | `src/domain/shape/CircleShape.ts` | `<anonymous callback>` | 39 | 1 |
| p2 | `src/domain/shape/CircleShape.ts` | `validate` | 42 | 1 |
| p2 | `src/domain/shape/DiamondShape.ts` | `center` | 23 | 1 |
| p2 | `src/domain/shape/DiamondShape.ts` | `width` | 27 | 1 |
| p2 | `src/domain/shape/DiamondShape.ts` | `height` | 31 | 1 |
| p2 | `src/domain/shape/DiamondShape.ts` | `attributes` | 35 | 1 |
| p2 | `src/domain/shape/DiamondShape.ts` | `prepareMove` | 39 | 1 |
| p2 | `src/domain/shape/DiamondShape.ts` | `prepareScale` | 48 | 1 |
| p2 | `src/domain/shape/DiamondShape.ts` | `prepare` | 59 | 1 |
| p2 | `src/domain/shape/DiamondShape.ts` | `<anonymous callback>` | 61 | 1 |
| p2 | `src/domain/shape/EllipseShape.ts` | `attributes` | 17 | 1 |
| p2 | `src/domain/shape/EllipseShape.ts` | `prepareMove` | 21 | 1 |
| p2 | `src/domain/shape/EllipseShape.ts` | `prepareScale` | 26 | 1 |
| p2 | `src/domain/shape/EllipseShape.ts` | `prepare` | 37 | 1 |
| p2 | `src/domain/shape/EllipseShape.ts` | `<anonymous callback>` | 39 | 1 |
| p2 | `src/domain/shape/EllipseShape.ts` | `validate` | 42 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `constructor` | 10 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `attributes` | 13 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `children` | 18 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 46 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 58 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `canModifyChild` | 70 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 71 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 81 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 92 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `combineChanges` | 96 | 1 |
| p2 | `src/domain/shape/GroupShape.ts` | `<anonymous callback>` | 117 | 1 |
| p2 | `src/domain/shape/LineShape.ts` | `attributes` | 17 | 1 |
| p2 | `src/domain/shape/LineShape.ts` | `treeSummary` | 21 | 1 |
| p2 | `src/domain/shape/LineShape.ts` | `prepareMove` | 29 | 1 |
| p2 | `src/domain/shape/LineShape.ts` | `prepareScale` | 35 | 1 |
| p2 | `src/domain/shape/LineShape.ts` | `prepare` | 46 | 1 |
| p2 | `src/domain/shape/LineShape.ts` | `<anonymous callback>` | 48 | 1 |
| p2 | `src/domain/shape/RectShape.ts` | `position` | 41 | 1 |
| p2 | `src/domain/shape/RectShape.ts` | `width` | 46 | 1 |
| p2 | `src/domain/shape/RectShape.ts` | `height` | 51 | 1 |
| p2 | `src/domain/shape/RectShape.ts` | `fill` | 56 | 1 |
| p2 | `src/domain/shape/RectShape.ts` | `attributes` | 61 | 1 |
| p2 | `src/domain/shape/RectShape.ts` | `children` | 116 | 1 |
| p2 | `src/domain/shape/RectShape.ts` | `geometryChange` | 135 | 1 |
| p2 | `src/domain/shape/RectShape.ts` | `<anonymous callback>` | 147 | 1 |
| p2 | `src/domain/shape/RectShape.ts` | `<anonymous callback>` | 153 | 1 |
| p2 | `src/domain/shape/StyledShape.ts` | `attributes` | 14 | 1 |
| p2 | `src/domain/shape/StyledShape.ts` | `children` | 18 | 1 |
| p2 | `src/domain/shape/StyledShape.ts` | `treeSummary` | 22 | 1 |
| p2 | `src/domain/shape/StyledShape.ts` | `prepareMove` | 26 | 1 |
| p2 | `src/domain/shape/StyledShape.ts` | `prepareScale` | 27 | 1 |
| p2 | `src/domain/shape/StyledShape.ts` | `change` | 46 | 1 |
| p2 | `src/domain/shape/StyledShape.ts` | `<anonymous callback>` | 47 | 1 |
| p2 | `src/domain/shape/StyledShape.ts` | `<anonymous callback>` | 47 | 1 |
| p2 | `src/domain/shape/TextShape.ts` | `constructor` | 10 | 1 |
| p2 | `src/domain/shape/TextShape.ts` | `attributes` | 16 | 1 |
| p2 | `src/domain/shape/TextShape.ts` | `treeSummary` | 20 | 1 |
| p2 | `src/domain/shape/TextShape.ts` | `prepareMove` | 27 | 1 |
| p2 | `src/domain/shape/TextShape.ts` | `prepareScale` | 32 | 1 |
| p2 | `src/domain/shape/TextShape.ts` | `<anonymous callback>` | 39 | 1 |
| p2 | `src/domain/shape/TextShape.ts` | `prepare` | 45 | 1 |
| p2 | `src/domain/shape/TextShape.ts` | `<anonymous callback>` | 47 | 1 |
| p2 | `src/infrastructure/NodeDirectoryReader.ts` | `constructor` | 10 | 1 |
| p2 | `src/infrastructure/SvgCodec.ts` | `constructor` | 12 | 1 |
| p2 | `src/infrastructure/SvgCodec.ts` | `<anonymous callback>` | 16 | 1 |
| p2 | `src/infrastructure/SvgCodec.ts` | `<anonymous callback>` | 140 | 1 |
| p2 | `src/infrastructure/SvgFileStore.ts` | `constructor` | 9 | 1 |
| p2 | `src/main.ts` | `<anonymous callback>` | 34 | 1 |
| p2 | `src/main.ts` | `<anonymous callback>` | 35 | 1 |
| p2 | `src/plugins/box/BoxPlugin.ts` | `activate` | 17 | 1 |
| p2 | `src/plugins/box/BoxShape.ts` | `rectangle` | 31 | 1 |
| p2 | `src/plugins/box/BoxShape.ts` | `label` | 32 | 1 |
| p2 | `src/plugins/box/BoxShape.ts` | `treeLabel` | 34 | 1 |
| p2 | `src/plugins/box/BoxShapeProvider.ts` | `create` | 15 | 1 |
| p2 | `src/plugins/box/BoxShapeProvider.ts` | `<anonymous callback>` | 37 | 1 |
| p2 | `src/plugins/box/BoxShapeProvider.ts` | `<anonymous callback>` | 38 | 1 |
| p2 | `src/plugins/box/BoxShapeProvider.ts` | `canWrite` | 55 | 1 |
| p2 | `src/plugins/dir/DirCommand.ts` | `<anonymous callback>` | 32 | 1 |
| p2 | `src/plugins/dir/DirPlugin.ts` | `activate` | 8 | 1 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `elementName` | 9 | 1 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `create` | 13 | 1 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `canRead` | 15 | 1 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `canWrite` | 42 | 1 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `write` | 46 | 1 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `parametersFromElement` | 50 | 1 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `consumedAttributes` | 52 | 1 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `ignoresAttribute` | 56 | 1 |
| p2 | `src/plugins/shapes/BuiltinShapeProvider.ts` | `acceptsText` | 60 | 1 |
| p2 | `src/plugins/shapes/CircleShapeProvider.ts` | `create` | 11 | 1 |
| p2 | `src/plugins/shapes/CircleShapeProvider.ts` | `consumedAttributes` | 32 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `elementName` | 12 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `create` | 16 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `canWrite` | 28 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `<anonymous callback>` | 39 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `<anonymous callback>` | 40 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `consumedAttributes` | 60 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `points` | 64 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `<anonymous callback>` | 72 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `<anonymous callback>` | 78 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `<anonymous callback>` | 82 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `<anonymous callback>` | 83 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `<anonymous callback>` | 98 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `<anonymous callback>` | 99 | 1 |
| p2 | `src/plugins/shapes/DiamondShapeProvider.ts` | `<anonymous callback>` | 100 | 1 |
| p2 | `src/plugins/shapes/EllipseShapeProvider.ts` | `create` | 11 | 1 |
| p2 | `src/plugins/shapes/EllipseShapeProvider.ts` | `consumedAttributes` | 34 | 1 |
| p2 | `src/plugins/shapes/GroupShapeProvider.ts` | `create` | 11 | 1 |
| p2 | `src/plugins/shapes/GroupShapeProvider.ts` | `parametersFromElement` | 16 | 1 |
| p2 | `src/plugins/shapes/GroupShapeProvider.ts` | `ignoresAttribute` | 20 | 1 |
| p2 | `src/plugins/shapes/LineShapeProvider.ts` | `create` | 11 | 1 |
| p2 | `src/plugins/shapes/LineShapeProvider.ts` | `consumedAttributes` | 34 | 1 |
| p2 | `src/plugins/shapes/RectShapeProvider.ts` | `create` | 11 | 1 |
| p2 | `src/plugins/shapes/RectShapeProvider.ts` | `consumedAttributes` | 34 | 1 |
| p2 | `src/plugins/shapes/TextShapeProvider.ts` | `create` | 11 | 1 |
| p2 | `src/plugins/shapes/TextShapeProvider.ts` | `parametersFromElement` | 21 | 1 |
| p2 | `src/plugins/shapes/TextShapeProvider.ts` | `consumedAttributes` | 25 | 1 |
| p2 | `src/plugins/shapes/TextShapeProvider.ts` | `acceptsText` | 29 | 1 |
| p2 | `src/plugins/stats/StatsCommand.ts` | `<anonymous callback>` | 32 | 1 |
| p2 | `src/plugins/stats/StatsPlugin.ts` | `activate` | 8 | 1 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `<anonymous callback>` | 18 | 1 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `shapeSignature` | 47 | 1 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `<anonymous callback>` | 52 | 1 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `documentSignature` | 56 | 1 |
| p2 | `src/plugins/tree/ModifiedStarDecorator.ts` | `<anonymous callback>` | 59 | 1 |
| p2 | `src/plugins/tree/ModifiedStarPlugin.ts` | `activate` | 8 | 1 |
| p2 | `src/presentation/Formatters.ts` | `<anonymous callback>` | 39 | 1 |
| p2 | `src/presentation/Formatters.ts` | `<anonymous callback>` | 62 | 1 |
| p2 | `src/presentation/Formatters.ts` | `shapeTarget` | 66 | 1 |
| p2 | `src/presentation/Formatters.ts` | `label` | 88 | 1 |
| p2 | `src/presentation/Formatters.ts` | `attributePairs` | 92 | 1 |
| p2 | `src/presentation/Formatters.ts` | `<anonymous callback>` | 98 | 1 |

## VS Code 扩展（单独统计）

以下扩展源码指标与 CLI 重构增量分开统计；只包含 Git 引用中的 `vscode-extension/src/**/*.ts`。

| 引用 | 文件数 | 行数 | 文件与职责 |
|---|---:|---:|---|
| final | 0 | 0 | — |
| p2 | 6 | 255 | `vscode-extension/src/SvgFileDecorationProvider.ts` (29 行：SvgFileDecorationProvider)<br>`vscode-extension/src/SvgOutlineProvider.ts` (30 行：SvgOutlineProvider, toDocumentSymbol, toVscodeRange)<br>`vscode-extension/src/SvgSourceRanges.ts` (71 行：ElementOffsets, SvgSourceRanges)<br>`vscode-extension/src/extension.ts` (20 行：activate)<br>`vscode-extension/src/fileDecorationPolicy.ts` (3 行：shouldDecorateSvg)<br>`vscode-extension/src/svgOutline.ts` (102 行：SourcePosition, SourceRange, SvgOutlineNode, parseSvgOutline) |
