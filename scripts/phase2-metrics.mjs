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

function complexity(sourceFile) {
  const functions = [];
  function collect(node) {
    if (isFunctionLike(node)) functions.push(node);
    ts.forEachChild(node, collect);
  }
  collect(sourceFile);
  return 1 + decisionCount(sourceFile) + functions.reduce(
    (sum, fn) => sum + 1 + decisionCount(fn),
    0,
  );
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
    return {
      path,
      category: categoryOf(path),
      lines: lineCount,
      complexity: complexity(sourceFile),
      responsibility: declarations(sourceFile),
    };
  });
  const totals = Object.fromEntries(categories.map((category) => [category, {
    files: files.filter((file) => file.category === category).length,
    lines: files.filter((file) => file.category === category).reduce((sum, file) => sum + file.lines, 0),
    complexity: files.filter((file) => file.category === category)
      .reduce((sum, file) => sum + file.complexity, 0),
  }]));
  return { hash: git("rev-parse", ref), files, totals };
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
  return { files, lines: files.reduce((sum, file) => sum + file.lines, 0) };
}

const before = analyze("final");
const after = analyze("p2");
const beforeVscode = analyzeVscode("final");
const afterVscode = analyzeVscode("p2");
const rows = [
  "# Phase 2 源码指标",
  "",
  "本报告由 `pnpm metrics` 生成，比较 Git 引用 `final` 与 `p2`。CLI 统计范围为 `src/**/*.ts`；VS Code 扩展、测试、依赖和构建产物不计入 CLI 重构数据。",
  "",
  `- final: \`${before.hash}\``,
  `- p2: \`${after.hash}\``,
  "- 行数：文件中的物理行数，排除末尾换行产生的空项。",
  "- 圈复杂度：每个模块和函数各计 1，再计入 if/循环/case/catch/条件表达式及 `&&`、`||`、`??` 决策点；按模块汇总。该规则固定在脚本中，以便两个引用可重复比较。",
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

rows.push("", "## 文件职责与行数", "");
for (const [label, result] of [["final", before], ["p2", after]]) {
  rows.push(`### ${label}`, "", "| 文件 | 分类 | 行数 | 职责（顶层类型/函数） |", "|---|---|---:|---|");
  for (const file of result.files) {
    rows.push(`| \`${file.path}\` | ${file.category} | ${file.lines} | ${file.responsibility.replaceAll("|", "\\|")} |`);
  }
  rows.push("");
}

rows.push(
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
