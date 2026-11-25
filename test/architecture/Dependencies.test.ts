import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

test("module imports follow the documented dependency direction", () => {
  const root = fileURLToPath(new URL("../../src", import.meta.url));
  const allowed: Record<string, readonly string[]> = {
    domain: ["domain"], application: ["application", "domain"],
    presentation: ["presentation", "domain"], cli: ["cli", "application", "presentation"],
    plugins: ["plugins", "application", "domain"],
    assembly: ["assembly", "application", "domain", "cli", "infrastructure"],
    infrastructure: ["infrastructure", "application", "domain"],
  };
  const check = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) { check(file); continue; }
      if (!entry.name.endsWith(".ts")) continue;
      const layer = relative(root, file).split(/[\\/]/u)[0]!;
      if (layer === "main.ts") continue;
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/gu)) {
        const dependency = match[1]!;
        if (dependency.startsWith(".")) {
          const target = relative(root, resolve(dirname(file), dependency)).split(/[\\/]/u)[0]!;
          assert.ok(allowed[layer]?.includes(target), `${file} must not depend on ${dependency}`);
        } else {
          assert.ok(layer === "infrastructure" || layer === "cli" || layer === "assembly", `${file} must not import external runtime ${dependency}`);
        }
      }
    }
  };
  check(root);
});

test("shape type and tag names are not used for conditional dispatch outside their registries", () => {
  const root = fileURLToPath(new URL("../../src", import.meta.url));
  const allowedNameDispatch = new Set(["application/ShapeFactory.ts", "cli/CommandRegistry.ts"]);
  const violations: string[] = [];

  const isTagExpression = (expression: ts.Expression): boolean => {
    if (ts.isParenthesizedExpression(expression)) return isTagExpression(expression.expression);
    if (ts.isPropertyAccessExpression(expression)) {
      return expression.name.text === "type" || expression.name.text === "tag";
    }
    return ts.isIdentifier(expression) && (expression.text === "type" || expression.text === "tag");
  };

  const check = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) { check(file); continue; }
      if (!entry.name.endsWith(".ts")) continue;

      const relativePath = relative(root, file).replaceAll("\\", "/");
      if (allowedNameDispatch.has(relativePath)) continue;
      const source = readFileSync(file, "utf8");
      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const inspect = (node: ts.Node): void => {
        if (ts.isSwitchStatement(node) && isTagExpression(node.expression)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          violations.push(`${relativePath}:${line} switches on a type/tag name`);
        }
        if (ts.isBinaryExpression(node) && [
          ts.SyntaxKind.EqualsEqualsToken,
          ts.SyntaxKind.EqualsEqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsToken,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ].includes(node.operatorToken.kind) && (isTagExpression(node.left) || isTagExpression(node.right))) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          violations.push(`${relativePath}:${line} compares a type/tag name`);
        }
        ts.forEachChild(node, inspect);
      };
      inspect(sourceFile);
    }
  };

  check(root);
  assert.deepEqual(violations, []);
});
