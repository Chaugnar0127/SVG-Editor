import assert from "node:assert/strict";
import test from "node:test";
import { shouldDecorateSvg } from "../../vscode-extension/src/fileDecorationPolicy.js";

test("SVG decoration policy matches extension case-insensitively", () => {
  for (const path of ["/workspace/diagram.svg", "/workspace/DIAGRAM.SVG", "C:/work/diagram.SvG"]) {
    assert.equal(shouldDecorateSvg(path, false), true);
  }
  for (const path of ["/workspace/diagram.svg.txt", "/workspace/diagram.xml", "/workspace/folder.svg/"]) {
    assert.equal(shouldDecorateSvg(path, false), false);
  }
  assert.equal(shouldDecorateSvg("/workspace/folder.svg", true), false);
});
