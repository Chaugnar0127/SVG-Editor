import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ExtensionRegistry } from "../application/extensions/ExtensionRegistry.js";
import type { Plugin, PluginContributions, PluginContext, PluginInstallFailure } from "../application/extensions/PluginContracts.js";

interface PluginConfigEntry {
  readonly module: string;
  readonly enabled?: boolean;
  readonly options?: unknown;
}

interface PluginConfig {
  readonly plugins: readonly PluginConfigEntry[];
}

/** 组合根侧加载器：解析来源差异，所有插件仍经过同一注册事务。 */
export class PluginLoader {
  public constructor(private readonly registry: ExtensionRegistry) {}

  /** 代码装配入口；options 与配置装配使用相同的 activate 参数。 */
  public install(plugin: Plugin, options?: unknown): string | undefined {
    const result = this.registry.install(plugin, options);
    return result.success ? undefined : this.formatFailure(result.failure);
  }

  /** 读取并加载配置；结构错误时不加载任何条目，单个插件错误时继续后续项。 */
  public async loadConfig(configPath: string): Promise<readonly string[]> {
    let source: string;
    try {
      source = readFileSync(configPath, "utf8");
    } catch {
      return ["error: invalid plugin config"];
    }

    let config: PluginConfig;
    try {
      config = parseConfig(JSON.parse(source) as unknown);
    } catch {
      return ["error: invalid plugin config"];
    }

    const errors: string[] = [];
    const requireFromConfig = createRequire(isAbsolute(configPath) ? configPath : resolve(configPath));
    for (const entry of config.plugins) {
      if (entry.enabled === false) continue;

      let resolvedModule: string;
      try {
        resolvedModule = requireFromConfig.resolve(entry.module);
      } catch {
        errors.push(`error: plugin not found: ${entry.module}`);
        continue;
      }

      let loaded: unknown;
      try {
        loaded = await import(pathToFileURL(resolvedModule).href);
      } catch (error) {
        errors.push(`error: plugin failed to load: ${entry.module} (${errorMessage(error)})`);
        continue;
      }

      const exported = inspectDefaultExport(loaded);
      if (exported.kind === "missing") {
        errors.push(`error: plugin has no default export: ${entry.module}`);
        continue;
      }
      if (exported.kind === "invalid") {
        errors.push(`error: plugin failed to load: ${entry.module} (invalid default export)`);
        continue;
      }
      const packageMetadata = packageManifest(resolvedModule);
      if (packageMetadata.kind === "invalid") {
        errors.push(`error: plugin failed to load: ${entry.module} (invalid package manifest)`);
        continue;
      }
      const plugin: Plugin = packageMetadata.kind === "manifest"
        ? {
          manifest: packageMetadata.manifest,
          activate: (context: PluginContext, options?: unknown) => exported.plugin.activate(context, options),
        }
        : exported.plugin;
      const failure = this.install(plugin, entry.options);
      if (failure !== undefined) errors.push(failure);
    }
    return errors;
  }

  private formatFailure(failure: PluginInstallFailure): string {
    switch (failure.kind) {
      case "activation":
        return `error: plugin failed to activate: ${failure.pluginName} (${failure.reason})`;
      case "manifest":
        return `error: plugin manifest mismatch: ${failure.pluginName} (declared: ${failure.declared}, registered: ${failure.registered})`;
      case "duplicate":
        return `error: duplicate registration: ${failure.category}/${failure.name}`;
    }
  }
}

function parseConfig(value: unknown): PluginConfig {
  if (typeof value !== "object" || value === null || !Array.isArray((value as { plugins?: unknown }).plugins)) {
    throw new TypeError("plugins must be an array");
  }
  const plugins = (value as { plugins: unknown[] }).plugins.map((entry): PluginConfigEntry => {
    if (typeof entry !== "object" || entry === null) throw new TypeError("plugin entry must be an object");
    const candidate = entry as { module?: unknown; enabled?: unknown; options?: unknown };
    if (typeof candidate.module !== "string" || candidate.module.trim().length === 0) {
      throw new TypeError("plugin module must be a non-empty string");
    }
    if (candidate.enabled !== undefined && typeof candidate.enabled !== "boolean") {
      throw new TypeError("plugin enabled must be a boolean");
    }
    return {
      module: candidate.module,
      ...(candidate.enabled === undefined ? {} : { enabled: candidate.enabled }),
      ...(Object.hasOwn(candidate, "options") ? { options: candidate.options } : {}),
    };
  });
  return { plugins };
}

type DefaultExport =
  | { readonly kind: "missing" }
  | { readonly kind: "invalid" }
  | { readonly kind: "plugin"; readonly plugin: Plugin };

function inspectDefaultExport(value: unknown): DefaultExport {
  if (typeof value !== "object" || value === null || !Object.hasOwn(value, "default")) {
    return { kind: "missing" };
  }
  const plugin = (value as { default: unknown }).default;
  if (typeof plugin !== "object" || plugin === null) return { kind: "invalid" };
  const candidate = plugin as Partial<Plugin>;
  if (typeof candidate.activate !== "function" || typeof candidate.manifest?.name !== "string") {
    return { kind: "invalid" };
  }
  const contributes = candidate.manifest.contributes;
  if (contributes !== undefined && !validContributions(contributes)) return { kind: "invalid" };
  return { kind: "plugin", plugin: candidate as Plugin };
}

type PackageManifestResult =
  | { readonly kind: "none" }
  | { readonly kind: "invalid" }
  | { readonly kind: "manifest"; readonly manifest: Plugin["manifest"] };

function packageManifest(modulePath: string): PackageManifestResult {
  let directory = dirname(modulePath);
  while (true) {
    try {
      const value = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as unknown;
      if (typeof value !== "object" || value === null) return { kind: "invalid" };
      const candidate = value as { name?: unknown; main?: unknown; exports?: unknown; contributes?: unknown };
      if (typeof candidate.main !== "string" && candidate.exports === undefined) return { kind: "none" };
      if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) return { kind: "invalid" };
      const contributes = candidate.contributes ?? {};
      if (!validContributions(contributes)) return { kind: "invalid" };
      return {
        kind: "manifest",
        manifest: { name: candidate.name, contributes: contributes as PluginContributions },
      };
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") return { kind: "invalid" };
    }
    const parent = resolve(directory, "..");
    if (parent === directory) return { kind: "none" };
    directory = parent;
  }
}

function validContributions(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  for (const category of ["shapes", "commands", "decorators", "attributes"] as const) {
    const names = (value as Record<string, unknown>)[category];
    if (names !== undefined && (!Array.isArray(names) || !names.every((name) => typeof name === "string"))) {
      return false;
    }
  }
  return Object.keys(value).every((key) => ["shapes", "commands", "decorators", "attributes"].includes(key));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.replace(/[\r\n]+/gu, " ") : String(error);
}
