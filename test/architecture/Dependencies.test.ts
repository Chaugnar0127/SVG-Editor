import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("module imports follow the documented dependency direction", () => {
  const root = fileURLToPath(new URL("../../src", import.meta.url));
  const allowed: Record<string, readonly string[]> = {
    domain: ["domain"], application: ["application", "domain"],
    presentation: ["presentation", "domain"], cli: ["cli", "application", "presentation"],
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
          assert.ok(layer === "infrastructure" || layer === "cli", `${file} must not import external runtime ${dependency}`);
        }
      }
    }
  };
  check(root);
});
