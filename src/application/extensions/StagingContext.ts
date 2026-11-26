import type { AttributeHandler, PluginCommand, PluginContributions, PluginContext, ShapeProvider, TreeDecorator } from "./PluginContracts.js";
import { DuplicateRegistrationError } from "./DuplicateRegistrationError.js";

export class StagingContext implements PluginContext {
  public readonly shapes = new Map<string, ShapeProvider>();
  public readonly commands = new Map<string, PluginCommand>();
  public readonly decorators = new Map<string, TreeDecorator>();
  public readonly attributes = new Map<string, AttributeHandler>();

  public registerShapeProvider(provider: ShapeProvider): void {
    this.register("shapes", this.shapes, provider.name, provider);
  }

  public registerCommand(command: PluginCommand): void {
    this.register("commands", this.commands, command.name, command);
  }

  public registerTreeDecorator(decorator: TreeDecorator): void {
    this.register("decorators", this.decorators, decorator.name, decorator);
  }

  public registerAttributeHandler(handler: AttributeHandler): void {
    this.register("attributes", this.attributes, handler.name, handler);
  }

  private register<T>(category: keyof PluginContributions, target: Map<string, T>, name: string, value: T): void {
    if (name.trim().length === 0 || target.has(name)) {
      throw new DuplicateRegistrationError(category, name);
    }
    target.set(name, value);
  }
}
