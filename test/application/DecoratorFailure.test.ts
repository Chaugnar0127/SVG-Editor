import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../../src/application/EditorSession.js";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import { SvgDocument } from "../../src/domain/document/SvgDocument.js";
import { createTestExtensions } from "../support/plugins.js";

test("failed saved notifications warn without failing committed document operations", () => {
  for (const operation of ["init", "read", "save"] as const) {
    const extensions = createTestExtensions();
    const writes: string[] = [];
    const session = new EditorSession({
      read: () => ({ document: new SvgDocument(320, 240), warnings: [] }),
      write: (path) => { writes.push(path); },
    }, extensions);
    const commands = new CommandRegistry(session, extensions);
    session.init();
    session.createShape("rect", "old", ["0", "0", "10", "10"]);
    let healthyNotifications = 0;
    extensions.install({
      manifest: { name: "notifications", contributes: { decorators: ["broken", "healthy"] } },
      activate(context) {
        context.registerTreeDecorator({
          name: "broken", onSaved: () => { throw new Error("callback\nfailed"); },
          decorate: () => { throw new Error("stale decorator must not run"); },
        });
        context.registerTreeDecorator({
          name: "healthy", onSaved: () => { healthyNotifications++; }, decorate: () => [],
        });
      },
    });
    const args = operation === "init" ? ["init", "100", "100"] : [operation, "target.svg"];
    const result = commands.execute(args);
    assert.ok(result?.kind === "message");
    assert.match(result.text, /warning: tree decorator broken disabled: callback failed/u);
    assert.equal(healthyNotifications, 1);
    assert.throws(() => session.undo(), { message: "undo not allowed after io command" });
    assert.doesNotThrow(() => commands.execute(["tree"]));
    if (operation === "save") {
      assert.ok(session.requireDocument().find("old"));
      commands.execute(["save"]);
      assert.deepEqual(writes, ["target.svg", "target.svg"]);
    } else {
      assert.equal(session.requireDocument().find("old"), undefined);
      assert.equal(session.requireDocument().width, operation === "init" ? 100 : 320);
    }
    const next = commands.execute(["init"]);
    assert.ok(next?.kind === "message");
    assert.doesNotMatch(next.text, /warning:/u);
  }
});
