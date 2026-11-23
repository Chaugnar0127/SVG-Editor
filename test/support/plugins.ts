import { ExtensionRegistry } from "../../src/application/extensions/ExtensionRegistry.js";
import type { Plugin } from "../../src/application/extensions/PluginContracts.js";
import type { DocumentStore } from "../../src/application/DocumentStore.js";
import { EditorSession } from "../../src/application/EditorSession.js";
import { ShapeFactory } from "../../src/application/ShapeFactory.js";
import { SvgCodec } from "../../src/infrastructure/SvgCodec.js";
import { SvgFileStore } from "../../src/infrastructure/SvgFileStore.js";
import builtinShapesPlugin from "../../src/plugins/shapes/BuiltinShapesPlugin.js";

/** 测试装配显式安装 Phase 1 图形插件，再追加当前场景需要的插件。 */
export function createTestExtensions(plugins: readonly Plugin[] = []): ExtensionRegistry {
  const extensions = new ExtensionRegistry();
  for (const plugin of [builtinShapesPlugin, ...plugins]) {
    const result = extensions.install(plugin);
    if (!result.success) throw new Error(`test plugin failed to install: ${plugin.manifest.name}`);
  }
  return extensions;
}

export function createTestSession(store?: DocumentStore, extensions = createTestExtensions()): EditorSession {
  return new EditorSession(store, extensions);
}

export function createTestCodec(extensions = createTestExtensions()): SvgCodec {
  return new SvgCodec(new ShapeFactory(extensions));
}

export function createTestFileStore(extensions = createTestExtensions()): SvgFileStore {
  return new SvgFileStore(createTestCodec(extensions));
}
