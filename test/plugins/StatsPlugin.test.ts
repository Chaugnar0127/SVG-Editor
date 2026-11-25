import assert from "node:assert/strict";
import test from "node:test";
import { CommandRegistry } from "../../src/cli/CommandRegistry.js";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import statsPlugin from "../../src/plugins/stats/StatsPlugin.js";
import { createTestExtensions, createTestSession } from "../support/plugins.js";

function setup() {
  const extensions = createTestExtensions([statsPlugin]);
  const session = createTestSession(undefined, extensions);
  return { session, commands: new CommandRegistry(session, extensions) };
}

test("stats follows depth-first first occurrence order and ignores empty containers as leaves", () => {
  const { session, commands } = setup();
  session.init();
  session.createShape("g", "outer", []);
  session.createShape("rect", "first", ["0", "0", "10", "10"], "outer");
  session.createShape("g", "empty", [], "outer");
  session.createShape("circle", "second", ["1", "2", "3"]);
  session.createShape("rect", "third", ["0", "0", "10", "10"]);

  assert.deepEqual(commands.execute(["stats"]), {
    kind: "message", text: "rect: 2  circle: 1  (total 3, containers 2)",
  });
  const help = commands.execute(["help"]);
  assert.ok(help?.kind === "message");
  assert.match(help.text, /stats\s+count leaf shapes and containers/u);
});

test("stats handles an empty document and does not add an undo step", () => {
  const { session, commands } = setup();
  session.init();
  assert.deepEqual(commands.execute(["stats"]), {
    kind: "message", text: "(total 0, containers 0)",
  });
  session.createShape("rect", "one", ["0", "0", "1", "1"]);
  commands.execute(["stats"]);
  commands.execute(["undo"]);
  assert.equal(session.requireDocument().find("one"), undefined);
});

test("stats identifies empty containers by their composite capability, not their tag", () => {
  const { session, commands } = setup();
  session.init();
  class CustomContainer extends GroupShape {
    public override readonly type = "custom-container";
  }
  session.requireDocument().add(new CustomContainer("empty"));

  assert.deepEqual(commands.execute(["stats"]), {
    kind: "message", text: "(total 0, containers 1)",
  });
});

test("stats requires a document and rejects arguments", () => {
  const { commands } = setup();
  assert.throws(() => commands.execute(["stats"]), { message: "no document. use 'init' or 'read' first" });
  assert.throws(() => commands.execute(["stats", "extra"]), { message: "usage: stats" });
});
