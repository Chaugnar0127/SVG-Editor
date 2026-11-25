# Phase 2 拓展：diamond 判断框

本仓库选择 Phase 2 的附加形状拓展任务，实现菱形判断框。它使用已有 `ShapeProvider` 契约接入图形注册，不需要在 `ShapeFactory`、`SvgCodec` 或编辑内核增加类型分支。

CLI 创建语法：

```text
create diamond <id> <cx> <cy> <width> <height> [fill]
```

`cx`、`cy` 是中心点，`width`、`height` 是菱形两条对角线的长度，必须为正的有限数；中心坐标可以为负数。菱形支持已有的 `move`、`scale`、`set`、撤销和重做行为。

SVG 使用标准 `<polygon>` 保存四个顶点，并加 `data-shape="diamond"` 标记，以便与其他多边形区分。例如：

```xml
<polygon id="decision" data-shape="diamond" points="40,30 80,50 40,70 0,50" fill="gold"/>
```

读入时 provider 校验该标记元素包含四个点，并且点集构成轴对齐菱形；无效几何会拒绝整次读入。样式随图形一同保存和读回。

验证覆盖领域几何及约束、CLI 创建/编辑与撤销、插件注册、SVG 往返，以及无效多边形拒绝。
