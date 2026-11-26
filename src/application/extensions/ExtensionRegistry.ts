import { StagingContext } from "./StagingContext.js";
import { builtinCommandNames } from "../BuiltinCommands.js";
import { DuplicateRegistrationError } from "./DuplicateRegistrationError.js";
import type {
  AttributeHandler,
  Plugin,
  PluginCommand,
  PluginContributions,
  PluginInstallFailure,
  PluginInstallResult,
  ShapeProvider,
  TreeDecorator,
} from "./PluginContracts.js";

type Category = keyof PluginContributions;
type ContributionMap<T> = Map<string, T>;

const categories: readonly Category[] = ["shapes", "commands", "decorators", "attributes"];

export class ExtensionRegistry {
  private readonly shapes = new Map<string, ShapeProvider>();
  private readonly commands = new Map<string, PluginCommand>();
  private readonly decorators = new Map<string, TreeDecorator>();
  private readonly attributes = new Map<string, AttributeHandler>();
  private readonly reservedCommands: ReadonlySet<string> = new Set(builtinCommandNames);

  /** 插件先在私有暂存区激活；所有校验通过后才一次性发布注册结果。 */
  public install(plugin: Plugin, options?: unknown): PluginInstallResult {
    const pluginName = plugin.manifest.name;
    const staged = new StagingContext();

    try {
      plugin.activate(staged, options);
    } catch (error) {
      if (error instanceof DuplicateRegistrationError) {
        return {
          success: false,
          failure: { kind: "duplicate", category: error.category, name: error.registrationName },
        };
      }
      return {
        success: false,
        failure: { kind: "activation", pluginName, reason: errorMessage(error) },
      };
    }

    const mismatch = this.findManifestMismatch(plugin, staged);
    if (mismatch !== undefined) return { success: false, failure: mismatch };

    const duplicate = this.findCommittedDuplicate(staged);
    if (duplicate !== undefined) return { success: false, failure: duplicate };

    this.commit(this.shapes, staged.shapes);
    this.commit(this.commands, staged.commands);
    this.commit(this.decorators, staged.decorators);
    this.commit(this.attributes, staged.attributes);
    return { success: true };
  }

  public shapeProvider(name: string): ShapeProvider | undefined { return this.shapes.get(name); }
  public shapeProviders(): readonly ShapeProvider[] { return [...this.shapes.values()]; }
  public command(name: string): PluginCommand | undefined { return this.commands.get(name); }
  public commandsList(): readonly PluginCommand[] { return [...this.commands.values()]; }
  public treeDecorators(): readonly TreeDecorator[] { return [...this.decorators.values()]; }
  public attributeHandlers(): readonly AttributeHandler[] { return [...this.attributes.values()]; }

  private findManifestMismatch(plugin: Plugin, staged: StagingContext): PluginInstallFailure | undefined {
    const declared = plugin.manifest.contributes ?? {};
    for (const category of categories) {
      const expected = [...(declared[category] ?? [])].sort();
      const actual = [...staged[category].keys()].sort();
      if (sameNames(expected, actual)) continue;
      return {
        kind: "manifest",
        pluginName: plugin.manifest.name,
        declared: `${category}=[${expected.join(", ")}]`,
        registered: `${category}=[${actual.join(", ")}]`,
      };
    }
    return undefined;
  }

  private findCommittedDuplicate(staged: StagingContext): PluginInstallFailure | undefined {
    for (const category of categories) {
      const current = this.mapFor(category);
      for (const name of staged[category].keys()) {
        if (current.has(name) || (category === "commands" && this.reservedCommands.has(name))) {
          return { kind: "duplicate", category, name };
        }
      }
    }
    return undefined;
  }

  private mapFor(category: Category): ContributionMap<unknown> {
    switch (category) {
      case "shapes": return this.shapes;
      case "commands": return this.commands;
      case "decorators": return this.decorators;
      case "attributes": return this.attributes;
    }
  }

  private commit<T>(target: ContributionMap<T>, staged: ContributionMap<T>): void {
    for (const [name, value] of staged) target.set(name, value);
  }
}

function sameNames(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.replace(/[\r\n]+/gu, " ") : String(error);
}
