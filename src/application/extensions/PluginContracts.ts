import type { DirectoryReader } from "../DirectoryReader.js";
import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { GeometryChange, Shape } from "../../domain/shape/Shape.js";
import type { TreeDecorator } from "../../domain/TreeDecorator.js";
export type { TreeDecorationTarget, TreeDecorator } from "../../domain/TreeDecorator.js";

export type CommandResult =
  | { readonly kind: "message"; readonly text: string }
  | { readonly kind: "exit" };

export interface SvgElementData {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly text: string;
}

/** 负责一种模型类型的创建及 XML 中立读写，不接触 DOM 实现。 */
export interface ShapeProvider {
  readonly name: string;
  /** create 命令的完整参数语法，由帮助输出和参数校验共同使用。 */
  readonly usage: string;
  readonly elementName: string;
  readonly readMarker?: { readonly attribute: string; readonly value: string };
  create(id: string, parameters: readonly string[]): Shape;
  canRead(element: SvgElementData): boolean;
  read(element: SvgElementData, id: string, children: readonly Shape[]): Shape;
  canWrite(shape: Shape): boolean;
  write(shape: Shape): SvgElementData;
}

export interface PluginCommandContext {
  getDocument(): SvgDocument | undefined;
  readonly directoryReader?: DirectoryReader;
}

export interface PluginCommand {
  readonly name: string;
  readonly usage: string;
  readonly help: string;
  execute(args: readonly string[], context: PluginCommandContext): CommandResult;
}

export interface AttributeHandler {
  readonly name: string;
  handles(shape: Shape, attribute: string): boolean;
  prepare(shape: Shape, attribute: string, value: string): GeometryChange;
}

export interface PluginContributions {
  readonly shapes?: readonly string[];
  readonly commands?: readonly string[];
  readonly decorators?: readonly string[];
  readonly attributes?: readonly string[];
}

export interface PluginManifest {
  readonly name: string;
  readonly contributes?: PluginContributions;
}

export interface PluginContext {
  registerShapeProvider(provider: ShapeProvider): void;
  registerCommand(command: PluginCommand): void;
  registerTreeDecorator(decorator: TreeDecorator): void;
  registerAttributeHandler(handler: AttributeHandler): void;
}

export interface Plugin {
  readonly manifest: PluginManifest;
  activate(context: PluginContext, options?: unknown): void;
}

export type PluginInstallFailure =
  | { readonly kind: "activation"; readonly pluginName: string; readonly reason: string }
  | {
      readonly kind: "manifest";
      readonly pluginName: string;
      readonly declared: string;
      readonly registered: string;
    }
  | { readonly kind: "duplicate"; readonly category: keyof PluginContributions; readonly name: string };

export type PluginInstallResult =
  | { readonly success: true }
  | { readonly success: false; readonly failure: PluginInstallFailure };
