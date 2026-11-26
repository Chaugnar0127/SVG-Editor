import { BoxShape } from "./BoxShape.js";
import type { TreeDecorationTarget, TreeDecorator } from "../../domain/TreeDecorator.js";

export class BoxTypeDecorator implements TreeDecorator {
  public readonly name = "box-type-label";

  public decorate(target: TreeDecorationTarget): readonly string[] {
    return target.shape instanceof BoxShape ? ["(box)"] : [];
  }
}
