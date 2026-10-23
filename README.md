# SVG-Editor

使用 TypeScript 实现的命令行 SVG 编辑器。支持矩形、圆、椭圆、直线、文本和嵌套分组，以及编辑历史、SVG 文件读写和树形查看。

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
| 创建 | `create rect/circle/ellipse/line/text/g <id> ... [in <containerId>]` |
| 编辑 | `delete <id>`、`move <id> <dx> <dy>`、`scale <id> <factor>`、`set <id> <attr> <value>` |
| 结构 | `group <newGid> <id1> [id2...]`、`ungroup <gid>`、`addto <gid> <id>`、`front <id>`、`back <id>` |
| 查看 | `tree [id]`、`show <id>`、`help` |
| 历史与退出 | `undo`、`redo`、`exit`、`quit` |

创建参数：

```text
create rect <id> <x> <y> <w> <h> [fill]
create circle <id> <cx> <cy> <r> [fill]
create ellipse <id> <cx> <cy> <rx> <ry> [fill]
create line <id> <x1> <y1> <x2> <y2> [stroke]
create text <id> <x> <y> "content"
create g <id>
```

所有创建命令都可追加 `in <containerId>`。ID 唯一且区分大小写，带空格的参数用双引号包裹，`#` 开头的整行作为注释。尺寸、半径及缩放因子必须为正的有限数，坐标可以为负数。

`set` 支持 `fill`、`stroke`、`stroke-width`、各图形的几何属性，以及文本的 `text` 内容。组的样式保存在组上，使用 SVG 的继承规则；`move/scale` 递归修改后代几何值。`scale` 同时缩放位置和尺寸，以画布原点为基准，不改变描边宽度。

每条成功编辑占一个撤销步骤。撤销后的新编辑清空重做分支；失败不改变文档和历史。成功的 `init/read/save` 和画布尺寸修改清空并锁定历史，直到下一次编辑。查询不影响历史。

`group` 按原文档顺序收编，在最近公共父容器中建立新组；`ungroup` 将子节点放回原组的位置，按实验约定拒绝解散顶层容器。成功读入或保存后，无参数 `save` 使用最近成功的文件路径；`init` 清除该路径。

## SVG 范围

支持 SVG 命名空间中的六种内置元素、几何及公共样式属性、纯文本/CDATA、画布尺寸与 `viewBox`。缺少 ID 时自动分配 `标签名+序号` 并输出警告，生成 ID 会避开整个文件中已有的 ID。数值允许小数和科学计数法；读入长度还支持 `px`。

当前阶段不支持 `box` 插件、`path`、CSS、`transform`、嵌套 `tspan`、外部资源或 DTD。不支持的元素或属性会使整次读入失败，原文档保留。保存通过临时文件替换目标文件；编码或写入失败不会提交会话路径和历史状态。

## 验证与设计

```sh
pnpm typecheck
pnpm typecheck:test
pnpm test
pnpm build
```

测试覆盖领域不变量、混合编辑历史、CLI 输入、失败原子性、真实文件读写、实验会话和模块依赖。模块划分、设计模式、取舍、过程记录及质量验证见 [架构文档](doc/README.md)。
