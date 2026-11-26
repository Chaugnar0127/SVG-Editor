import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/plugins/", import.meta.url));
const outputRoot = fileURLToPath(new URL("../dist/plugins/", import.meta.url));

function copyManifests(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) copyManifests(source);
    else if (entry.name === "package.json") {
      const manifest = JSON.parse(readFileSync(source, "utf8"));
      if (typeof manifest.main === "string") manifest.main = manifest.main.replace(/\.ts$/u, ".js");
      const output = join(outputRoot, relative(sourceRoot, source));
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }
}

copyManifests(sourceRoot);
