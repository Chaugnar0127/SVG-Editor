import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import ts from "typescript";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trimEnd();
}

const repositoryRoot = git("rev-parse", "--show-toplevel");
process.chdir(repositoryRoot);

const categories = ["kernel", "assembly", "plugins"];

function categoryOf(path) {
  if (path.startsWith("src/plugins/")) return "plugins";
  if (path === "src/main.ts" || path.startsWith("src/assembly/")) return "assembly";
  return "kernel";
}

function declarations(sourceFile) {
  const names = [];
  for (const statement of sourceFile.statements) {
    if (
      ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
      ts.isEnumDeclaration(statement) || ts.isFunctionDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    ) {
      if (statement.name !== undefined) names.push(statement.name.text);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
      }
    }
  }
  return [...new Set(names)].slice(0, 4).join(", ") || "startup composition";
}

function isFunctionLike(node) {
  return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) || ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) || ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node);
}

function isDecisionPoint(node) {
  if (
    ts.isIfStatement(node) || ts.isForStatement(node) || ts.isForInStatement(node) ||
    ts.isForOfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node) ||
    ts.isCaseClause(node) || ts.isConditionalExpression(node) || ts.isCatchClause(node)
  ) return true;
  return ts.isBinaryExpression(node) && [
    ts.SyntaxKind.AmpersandAmpersandToken,
    ts.SyntaxKind.BarBarToken,
    ts.SyntaxKind.QuestionQuestionToken,
  ].includes(node.operatorToken.kind);
}

function decisionCount(node, root = node) {
  let count = 0;
  function visit(current) {
    if (current !== root && isFunctionLike(current)) return;
    if (isDecisionPoint(current)) count++;
    ts.forEachChild(current, visit);
  }
  visit(node);
  return count;
}

function functionName(node) {
  const sourceFile = node.getSourceFile();
  if (ts.isConstructorDeclaration(node)) return "constructor";
  if (node.name !== undefined) return node.name.getText(sourceFile);

  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return `${parent.name.text} (callback)`;
  }
  if (ts.isPropertyDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return `${parent.name.text} (callback)`;
  }
  return "<anonymous callback>";
}

function functionMetrics(sourceFile, path) {
  const functions = [];
  function collect(node) {
    if (isFunctionLike(node)) {
      functions.push({
        path,
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        name: functionName(node),
        complexity: 1 + decisionCount(node),
      });
    }
    ts.forEachChild(node, collect);
  }
  collect(sourceFile);
  return functions;
}

function complexity(sourceFile, functions) {
  return 1 + decisionCount(sourceFile) + functions.reduce((sum, fn) => sum + fn.complexity, 0);
}

function functionDistribution(functions) {
  const scores = functions.map((fn) => fn.complexity);
  const total = scores.reduce((sum, score) => sum + score, 0);
  return {
    count: scores.length,
    average: scores.length === 0 ? 0 : total / scores.length,
    max: Math.max(0, ...scores),
    over10: scores.filter((score) => score > 10).length,
    over20: scores.filter((score) => score > 20).length,
    over50: scores.filter((score) => score > 50).length,
  };
}

function analyze(ref) {
  const paths = git("ls-tree", "-r", "--name-only", ref, "--", "src")
    .split(/\r?\n/u)
    .filter((path) => path.endsWith(".ts"))
    .sort();
  const files = paths.map((path) => {
    const source = git("show", `${ref}:${path}`);
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const lineCount = source === "" ? 0 : source.split(/\r?\n/u).length - (source.endsWith("\n") ? 1 : 0);
    const functions = functionMetrics(sourceFile, path);
    return {
      path,
      category: categoryOf(path),
      lines: lineCount,
      complexity: complexity(sourceFile, functions),
      functions,
      responsibility: declarations(sourceFile),
    };
  });
  const totals = Object.fromEntries(categories.map((category) => [category, {
    files: files.filter((file) => file.category === category).length,
    lines: files.filter((file) => file.category === category).reduce((sum, file) => sum + file.lines, 0),
    complexity: files.filter((file) => file.category === category)
      .reduce((sum, file) => sum + file.complexity, 0),
    ...functionDistribution(files.filter((file) => file.category === category)
      .flatMap((file) => file.functions)),
  }]));
  return { tree: git("rev-parse", `${ref}:src`), files, totals };
}

function analyzeVscode(ref) {
  const paths = git("ls-tree", "-r", "--name-only", ref, "--", "vscode-extension/src")
    .split(/\r?\n/u)
    .filter((path) => path.endsWith(".ts"))
    .sort();
  const files = paths.map((path) => {
    const source = git("show", `${ref}:${path}`);
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const lines = source === "" ? 0 : source.split(/\r?\n/u).length - (source.endsWith("\n") ? 1 : 0);
    return { path, lines, responsibility: declarations(sourceFile) };
  });
  return {
    tree: paths.length === 0 ? undefined : git("rev-parse", `${ref}:vscode-extension/src`),
    files,
    lines: files.reduce((sum, file) => sum + file.lines, 0),
  };
}

// Before moving the release tag, pass HEAD to measure the pending p2 sources.
const afterRef = process.argv[2] ?? "p2";
const before = analyze("final");
const after = analyze(afterRef);
const beforeVscode = analyzeVscode("final");
const afterVscode = analyzeVscode(afterRef);
const rows = [
  "# Phase 2 源码指标",
  "",
  "本报告由 `pnpm metrics` 生成，比较 Git 引用 `final` 与 `p2`。CLI 统计范围为 `src/**/*.ts`；VS Code 扩展、测试、依赖和构建产物不计入 CLI 重构数据。",
  "",
  "版本以源码目录的 Git 树哈希标识；仅修改文档或包版本号不会改变这些快照。可运行 `pnpm metrics HEAD` 生成当前提交的源码指标，再用 `pnpm metrics` 核验 p2 指向的源码是否生成相同报告。",
  "",
  `- final CLI 源码树（\`src\`）: \`${before.tree}\``,
  `- p2 CLI 源码树（\`src\`）: \`${after.tree}\``,
  `- final VS Code 源码树（\`vscode-extension/src\`）: ${beforeVscode.tree === undefined ? "无" : `\`${beforeVscode.tree}\``}`,
  `- p2 VS Code 源码树（\`vscode-extension/src\`）: ${afterVscode.tree === undefined ? "无" : `\`${afterVscode.tree}\``}`,
  "- 行数：文件中的物理行数，排除末尾换行产生的空项。",
  "- 圈复杂度：模块计 1 加模块级决策点；函数各计 1 加函数体内决策点（不进入嵌套函数）。决策点包括 if/循环/case/catch/条件表达式及 `&&`、`||`、`??`。文件和分类总和包含模块基础分；函数分布单独列出，避免把汇总值当成单个函数的复杂度。",
  "- 函数分布中的 `>10`、`>20`、`>50` 是严格大于对应数值的函数数量，用于定位，不作为自动判定结果。",
  "- 分类：内核包括 application、cli、domain、infrastructure、presentation；装配包括 `main.ts` 与 `assembly`；插件包括 `src/plugins`。",
  "",
  "## 汇总",
  "",
  "| 分类 | final 文件 | p2 文件 | final 行数 | p2 行数 | 行数变化 | final 圈复杂度 | p2 圈复杂度 | 复杂度变化 |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
];

for (const category of categories) {
  const old = before.totals[category];
  const current = after.totals[category];
  rows.push(`| ${category} | ${old.files} | ${current.files} | ${old.lines} | ${current.lines} | ${current.lines - old.lines} | ${old.complexity} | ${current.complexity} | ${current.complexity - old.complexity} |`);
}

rows.push(
  "",
  "## 函数复杂度分布",
  "",
  "单函数指标适合定位复杂逻辑；分类总和会随文件和函数数量增长。",
  "",
  "| 引用 | 分类 | 函数数 | 平均复杂度 | 最大复杂度 | >10 | >20 | >50 |",
  "|---|---|---:|---:|---:|---:|---:|---:|",
);
for (const [label, result] of [["final", before], ["p2", after]]) {
  const allFunctions = result.files.flatMap((file) => file.functions);
  for (const category of categories) {
    const stats = result.totals[category];
    rows.push(`| ${label} | ${category} | ${stats.count} | ${stats.average.toFixed(2)} | ${stats.max} | ${stats.over10} | ${stats.over20} | ${stats.over50} |`);
  }
  const stats = functionDistribution(allFunctions);
  rows.push(`| ${label} | **全部** | ${stats.count} | ${stats.average.toFixed(2)} | ${stats.max} | ${stats.over10} | ${stats.over20} | ${stats.over50} |`);
}

rows.push(
  "",
  "## 文件职责与复杂度",
  "",
);
for (const [label, result] of [["final", before], ["p2", after]]) {
  rows.push(`### ${label}`, "", "| 文件 | 分类 | 行数 | 文件复杂度总和 | 函数数 | 最大函数复杂度 | >10 | 职责（顶层类型/函数） |", "|---|---|---:|---:|---:|---:|---:|---|");
  for (const file of result.files) {
    const stats = functionDistribution(file.functions);
    rows.push(`| \`${file.path}\` | ${file.category} | ${file.lines} | ${file.complexity} | ${stats.count} | ${stats.max} | ${stats.over10} | ${file.responsibility.replaceAll("|", "\\|")} |`);
  }
  rows.push("");
}

rows.push(
  "## 函数明细（按复杂度降序）",
  "",
  "| 引用 | 文件 | 函数 | 起始行 | 圈复杂度 |",
  "|---|---|---|---:|---:|",
);
for (const [label, result] of [["final", before], ["p2", after]]) {
  const functions = result.files.flatMap((file) => file.functions)
    .sort((left, right) => right.complexity - left.complexity
      || left.path.localeCompare(right.path)
      || left.line - right.line);
  for (const fn of functions) {
    rows.push(`| ${label} | \`${fn.path}\` | \`${fn.name.replaceAll("`", "\\`")}\` | ${fn.line} | ${fn.complexity} |`);
  }
}

rows.push(
  "",
  "## VS Code 扩展（单独统计）",
  "",
  "以下扩展源码指标与 CLI 重构增量分开统计；只包含 Git 引用中的 `vscode-extension/src/**/*.ts`。",
  "",
  "| 引用 | 文件数 | 行数 | 文件与职责 |",
  "|---|---:|---:|---|",
);
for (const [label, result] of [["final", beforeVscode], ["p2", afterVscode]]) {
  const files = result.files.map((file) => `\`${file.path}\` (${file.lines} 行：${file.responsibility.replaceAll("|", "\\|")})`).join("<br>") || "—";
  rows.push(`| ${label} | ${result.files.length} | ${result.lines} | ${files} |`);
}

const outputPath = join(repositoryRoot, "docs", "metrics", "phase2.md");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${rows.join("\n")}\n`, "utf8");
process.stdout.write(`Wrote ${outputPath}\n`);
