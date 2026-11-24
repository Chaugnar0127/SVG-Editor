# SVG-Editor

使用 TypeScript 实现的命令行 SVG 编辑器，并附带 SVG 的 VS Code 扩展。CLI 支持六种内置图形、可配置插件（`box`、`stats`、`dir` 和树标签）、撤销/重做、SVG 文件读写和树形查看。

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

Windows PowerShell 中可以使用 `pnpm.cmd`。输入 `help` 查看完整语法，`exit`、`quit` 或 EOF 结束会话。

默认启动会加载 `stats`、`dir`、`box` 和 `modified-star` 插件；六种内置图形始终可用。也可以用配置文件选择插件：

```sh
pnpm cli --config plugins.config.json
```

示例配置中的相对模块路径以配置文件所在目录为基准；包名使用 Node.js ESM 的模块解析规则。配置模式只加载列出的可选插件，`enabled: false` 的条目会跳过，`options` 会原样传给插件的 `activate`：

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
| 创建 | `create rect/circle/ellipse/line/text/g/box <id> ... [in <containerId>]` |
| 编辑 | `delete <id>`、`move <id> <dx> <dy>`、`scale <id> <factor>`、`set <id> <attr> <value>` |
| 结构 | `group <newGid> <id1> [id2...]`、`ungroup <gid>`、`addto <gid> <id>`、`front <id>`、`back <id>` |
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
create box <id> <x> <y> <w> <h> "label"
```

所有创建命令都可追加 `in <containerId>`。ID 唯一且区分大小写，带空格的参数用双引号包裹，`#` 开头的整行作为注释。尺寸、半径及缩放因子必须为正的有限数，坐标可以为负数。

`set` 支持 `fill`、`stroke`、`stroke-width`、各图形的几何属性，以及文本的 `text` 内容。组的样式保存在组上，使用 SVG 的继承规则；`move/scale` 递归修改后代几何值。`scale` 同时缩放位置和尺寸，以画布原点为基准，不改变描边宽度。

每条成功编辑占一个撤销步骤。撤销后的新编辑清空重做分支；失败不改变文档和历史。成功的 `init/read/save` 和画布尺寸修改清空并锁定历史，直到下一次编辑。查询不影响历史。

`group` 按原文档顺序收编，在最近公共父容器中建立新组；`ungroup` 将子节点放回原组的位置，按实验约定拒绝解散顶层容器。成功读入或保存后，无参数 `save` 使用最近成功的文件路径；`init` 清除该路径。

## SVG 范围

支持 SVG 命名空间中的六种内置元素、几何及公共样式属性、纯文本/CDATA、画布尺寸与 `viewBox`。缺少 ID 时自动分配 `标签名+序号` 并输出警告，生成 ID 会避开整个文件中已有的 ID。数值允许小数和科学计数法；读入长度还支持 `px`。

`box` 插件将 `box` 保存为带 `data-kind="box"` 标记的 `<g>`；未加载该插件时，读入会按普通分组显示。其他不支持范围包括 `path`、CSS、`transform`、嵌套 `tspan`、外部资源和 DTD。不支持的元素或属性会使整次读入失败，原文档保留。保存通过临时文件替换目标文件；编码或写入失败不会提交会话路径和历史状态。

`dir` 列出启动 CLI 时的当前工作目录，不随 `read` 或 `save` 改变。它显示直接子项（包括隐藏项），目录在前，文件在后，并按名称排序；符号链接等特殊项显示为 `[OTHER]`，不跟随目标。`stats` 按深度优先顺序统计叶子图形和容器。

## VS Code 扩展

扩展在 Explorer 的 SVG 文件旁显示 `[]`，并在原生 Outline 视图中提供元素层级及源码定位。构建后可在仓库根目录启动扩展开发宿主：

```sh
pnpm build:vscode
code --extensionDevelopmentPath=./vscode-extension .
```

打开 SVG 文件即可查看效果；对应的演示截图位于 [文件标记](docs/images/vscode-svg-badge.jpg) 和 [大纲视图](docs/images/vscode-svg-outline.jpg)。

## 验证与设计

```sh
pnpm typecheck
pnpm typecheck:test
pnpm typecheck:vscode
pnpm test
pnpm build
pnpm build:vscode
pnpm metrics
```

测试覆盖领域不变量、混合编辑历史、CLI 输入、失败原子性、真实文件读写、插件事务与装配、实验会话和模块依赖。模块划分、扩展点契约、架构决策、VS Code 复用评估及 Phase 1/2 对比见 [架构文档](doc/README.md)；由脚本生成的源码指标见 [metrics](docs/metrics/phase2.md)。
