# SVG-Editor

这是一个用 TypeScript 编写的命令行 SVG 编辑器，附带 VS Code 扩展。CLI 可以创建六种基础图形、编辑和分组、撤销和重做，以及读写 SVG 文件。插件提供菱形、带标题的矩形框、图形统计、目录列表和树形标签。

当前版本为 **0.2.0**，主程序与 VS Code 扩展使用相同版本号。`final` 标签保留 Phase 1 基线，`p2` 标签对应本次 Phase 2 交付。

## 运行

需要 Node.js 22 或更新版本，使用 pnpm 安装依赖：

```sh
pnpm install --frozen-lockfile
pnpm cli
```

编译后运行：

```sh
pnpm build
pnpm start
```

启动时显示 `svg-editor 0.2.0`，版本号读取自根目录的 `package.json`。修改源码后需重新运行 `pnpm build`，再使用 `pnpm start` 启动构建产物。

Windows PowerShell 中可以使用 `pnpm.cmd`。输入 `help` 查看命令及已加载图形的创建语法。输入 `exit`、`quit` 或 EOF 结束会话。

启动时，CLI 优先使用 `--config` 指定的文件，其次检查当前工作目录的 `plugins.config.json`。未传 `--config` 且默认配置文件不存在时，依次加载 `stats`、`dir`、`modified-star`、`box` 和 `diamond`。六种基础图形始终可用。配置为 `{"plugins":[]}` 时关闭所有可选插件，恢复 Phase 1 的帮助和图形类型范围。

将下面的配置保存到仓库根目录的 `plugins.config.json`，再从仓库根目录运行：

```sh
pnpm cli --config plugins.config.json
```

相对模块路径以配置文件所在目录为准，包名按 Node.js ESM 的规则解析。CLI 按列表顺序加载可选插件，跳过 `enabled: false` 的条目，并把 `options` 原样传给插件的 `activate`。下面的配置启用 `stats`、`dir` 和 `box`，关闭表示未保存变化的星号标签。

```json
{
  "plugins": [
    { "module": "./src/plugins/stats/StatsPlugin.ts" },
    { "module": "./src/plugins/dir/DirPlugin.ts" },
    { "module": "./src/plugins/box/BoxPlugin.ts" },
    { "module": "./src/plugins/tree/ModifiedStarPlugin.ts", "enabled": false }
  ]
}
```

该配置用于 `pnpm cli`。使用编译后的 `pnpm start` 时，应把模块路径改为对应的 `./dist/plugins/…/*.js`。配置不可读或格式错误时，CLI 报错并以内置能力启动。

## 示例

```text
init 800 600
create g scene
create rect box 100 100 160 60 #4a90d9 in scene
create text label 130 135 "开始" in scene
set label fill white
move scene 20 30
undo
redo
tree
save diagram.svg
quit
```

生成的 `diagram.svg` 可以直接用浏览器打开。完整的两节点流程图见 [命令脚本](examples/flowchart.txt) 和 [SVG 文件](examples/flowchart.svg)。在仓库根目录回放示例：

```sh
pnpm build
node dist/main.js < examples/flowchart.txt
```

PowerShell 不支持上述输入重定向语法，可执行：

```powershell
pnpm.cmd build
cmd /c "node dist/main.js < examples\flowchart.txt"
```

该脚本会重新生成 `examples/flowchart.svg`。

## 命令

| 分类 | 命令 |
|---|---|
| 文档 | `init [w] [h]`、`read <file.svg>`、`save [file.svg]`、`canvas [w h]` |
| 创建 | `create rect/circle/ellipse/line/text/g <id> ... [in <containerId>]`；加载对应插件后可用 `create box` 和 `create diamond` |
| 编辑 | `delete <id>`、`move <id> <dx> <dy>`、`scale <id> <factor>`、`set <id> <attr> <value>` |
| 结构 | `group <newGid> <id1> [id2...]`、`ungroup <gid>`、`addto <containerId> <id>`、`front <id>`、`back <id>` |
| 查看 | `tree [id]`、`show <id>`、`help` |
| 插件 | `stats`、`dir` |
| 历史与退出 | `undo`、`redo`、`exit`、`quit` |

创建参数：

```text
create rect <id> <x> <y> <w> <h> [fill]
create circle <id> <cx> <cy> <r> [fill]
create ellipse <id> <cx> <cy> <rx> <ry> [fill]
create line <id> <x1> <y1> <x2> <y2> [stroke]
create text <id> <x> <y> "content"
create g <id>
create diamond <id> <cx> <cy> <width> <height> [fill]
create box <id> <x> <y> <w> <h> "label"
```

所有创建命令都可追加 `in <containerId>`。ID 唯一且区分大小写，带空格的参数用双引号包裹，`#` 开头的整行作为注释。尺寸、半径及缩放因子必须为正的有限数，坐标可以为负数。菱形的 `cx`、`cy` 是中心坐标，`width` 和 `height` 是水平、竖直对角线的长度。

`set` 支持 `fill`、`stroke`、`stroke-width`、各图形的几何属性，以及文本的 `text` 内容。普通组的样式按 SVG 规则继承。`set <boxId> fill <color>` 修改框内矩形的填充色，`set <boxId> label "新标题"` 修改框内文字。`move` 修改容器后代的坐标；`scale` 同时缩放后代的坐标和尺寸，以画布原点为基准，描边宽度保持不变。

box 的 `<id>-rect` 和 `<id>-label` 是必要部件，不能直接编辑或移出。可对 box 整体执行操作，也可以在其中添加和编辑其他图形。

每条成功编辑可撤销一次。撤销后执行新的编辑会清空重做记录。编辑失败会保留文档和历史。`init`、`read`、`save` 和修改画布尺寸成功后，会清空历史并暂停撤销和重做，直到下一条编辑成功。查询不影响历史。

`group` 在待分组图形最近的共同父容器中建立新组，并按文档里的顺序移入图形。`ungroup` 将子节点提升到原组的位置，顶层容器和 box 不可解散。无参数的 `save` 使用上次成功读入或保存的路径。`init` 会清除该路径。

启用 `modified-star` 后，`tree` 用 `*` 标出与最近一次成功 `init/read/save` 时内容不同的节点及祖先。新建节点立即标星，保存或撤销回保存时的内容后，星号消失。box 插件另在框的树行末尾添加 `(box)`。

## SVG 范围

支持 SVG 命名空间中的 `rect`、`circle`、`ellipse`、`line`、`text` 和 `g`，启用 diamond 后还支持其使用的 `<polygon data-shape="diamond">`。可读写几何和公共样式属性、纯文本或 CDATA、画布尺寸和 `viewBox`。

缺少 ID 时按“标签名加序号”分配新 ID 并输出警告，新 ID 会避开整个文件中已有的 ID。数值支持小数和科学计数法，读入长度还支持 `px`。菱形的存储格式见 [diamond 说明](doc/README.md#diamond-判断框)。

`box` 插件把框保存为 `<g data-kind="box">`。关闭插件后，可以把该元素及其子节点读为普通组。读入 `path`、不符合菱形顶点约束的 `polygon`、CSS、`transform`、嵌套 `tspan`、外部资源和 DTD 时会报错并保留原文档。保存时先写临时文件，再替换目标文件。编码或写入失败时，编辑器保留原有路径和历史。

`dir` 列出启动 CLI 时的当前工作目录，不随 `read` 或 `save` 改变。它显示直接子项（包括隐藏项），目录在前，文件在后，并按名称排序；符号链接等特殊项显示为 `[OTHER]`，不跟随目标。`stats` 按深度优先顺序统计叶子图形和容器。

## VS Code 扩展

扩展在 Explorer 的 SVG 文件旁显示 `[]`，并在原生 Outline 视图中提供元素层级及源码定位。在仓库根目录构建并启动新的扩展开发宿主：

```sh
pnpm build:vscode
code --new-window "--extensionDevelopmentPath=$PWD/vscode-extension" "$PWD"
```

开发宿主启动后，可在命令面板运行 `Developer: Show Running Extensions` 确认扩展已加载。在 Explorer 中展开 `examples`，可以在 `flowchart.svg` 旁查看 `[]`。用 `Text Editor` 打开该文件，在 Outline 中展开元素并点击节点，就能跳到对应源码。

运行效果见 [文件标记](docs/images/vscode-svg-badge.png) 和 [大纲定位](docs/images/vscode-svg-outline.png)。

## 验证与设计

```sh
pnpm typecheck
pnpm typecheck:test
pnpm typecheck:vscode
pnpm test
pnpm build
pnpm build:vscode
pnpm metrics
node scripts/verify-diamond-evidence.mjs
```

测试覆盖图形校验、撤销和重做、CLI 输入、命令失败后的状态、真实文件读写、插件加载、实验会话和模块依赖。设计和验收说明见 [架构文档](doc/README.md)。源码指标比较 `final` 与 `p2` 标签，并记录源码目录的 Git 树哈希，见 [指标报告](docs/metrics/phase2.md)。
