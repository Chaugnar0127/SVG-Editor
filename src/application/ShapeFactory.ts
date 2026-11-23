import type { Shape } from "../domain/shape/Shape.js";
import { ExtensionRegistry } from "./extensions/ExtensionRegistry.js";
import type { ShapeProvider, SvgElementData } from "./extensions/PluginContracts.js";

/** 工厂只分派到已注册的提供者，不持有任何具体图形实现。 */
export class ShapeFactory {
  public constructor(private readonly extensions: ExtensionRegistry = new ExtensionRegistry()) {}

  /** 由注册的图形提供者解析参数；ID 的文档级唯一性由 SvgDocument 校验。 */
  public create(type: string, id: string, parameters: readonly string[]): Shape {
    const provider = this.extensions.shapeProvider(type);
    if (provider === undefined) throw new RangeError(`unknown shape type: ${type} (is the plugin loaded?)`);
    if (id.length === 0 || /\s/u.test(id)) {
      throw new RangeError("shape id must be non-empty and contain no whitespace");
    }
    return provider.create(id, parameters);
  }

  /** 具有专属序列化标记的提供者优先；未识别的标记可回退到通用容器。 */
  public fromElement(element: SvgElementData, id: string, children: readonly Shape[]): Shape {
    const readable = this.extensions.shapeProviders().filter((provider) => provider.canRead(element));
    const marked = readable.filter((provider) => provider.readMarker !== undefined
      && element.attributes[provider.readMarker.attribute] === provider.readMarker.value);
    const candidates = marked.length > 0 ? marked : readable.filter((provider) => provider.readMarker === undefined);
    if (candidates.length > 1) throw new RangeError(`ambiguous shape provider for <${element.name}>`);
    const provider: ShapeProvider | undefined = candidates[0];
    if (provider === undefined) {
      throw new RangeError(`unknown shape type: ${element.name} (is the plugin loaded?)`);
    }
    return provider.read(element, id, children);
  }

  /** 自定义图形提供者负责 XML 表示；内置图形由 codec 按模型属性序列化。 */
  public toElement(shape: Shape): SvgElementData | undefined {
    const providers = this.extensions.shapeProviders().filter((provider) => provider.canWrite(shape));
    if (providers.length > 1) throw new RangeError(`ambiguous shape writer for ${shape.type}#${shape.id}`);
    return providers[0]?.write(shape);
  }
}
