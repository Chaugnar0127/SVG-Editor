import assert from "node:assert/strict";
import test from "node:test";
import { SvgDocument } from "../../src/domain/document/SvgDocument.js";
import { GroupShape } from "../../src/domain/shape/GroupShape.js";
import { RectShape } from "../../src/domain/shape/RectShape.js";

test("document uses default dimensions and accepts positive fractional dimensions", () => {
  const defaultDocument = new SvgDocument();
  assert.equal(defaultDocument.width, 800);
  assert.equal(defaultDocument.height, 600);

  const customDocument = new SvgDocument(320.5, 240.25);
  assert.equal(customDocument.width, 320.5);
  assert.equal(customDocument.height, 240.25);
});

test("document rejects invalid dimensions during construction", () => {
  const invalidDimensions = [
    0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
  ];

  for (const value of invalidDimensions) {
    assert.throws(() => new SvgDocument(value, 600), RangeError);
    assert.throws(() => new SvgDocument(800, value), RangeError);
  }
});

test("resize updates both dimensions and accepts fractional values", () => {
  const document = new SvgDocument();

  document.resize(1024.5, 768.25);

  assert.equal(document.width, 1024.5);
  assert.equal(document.height, 768.25);
});

test("failed resize preserves both dimensions and allows a later valid resize", () => {
  const document = new SvgDocument(400, 300);
  const invalidDimensions = [
    0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
  ];

  for (const value of invalidDimensions) {
    assert.throws(() => document.resize(value, 900), RangeError);
    assert.equal(document.width, 400);
    assert.equal(document.height, 300);

    assert.throws(() => document.resize(1200, value), RangeError);
    assert.equal(document.width, 400);
    assert.equal(document.height, 300);
  }

  document.resize(640, 480);
  assert.equal(document.width, 640);
  assert.equal(document.height, 480);
});

test("document preserves root order and object identity while isolating the returned array", () => {
  const document = new SvgDocument();
  assert.deepEqual(document.topLevel(), []);
  const rect = new RectShape("rect", 10, 20, 30, 40);
  const group = new GroupShape("group");
  const nested = new RectShape("nested", 0, 0, 10, 10);
  group.add(nested);
  document.add(rect);
  document.add(group);

  const roots = document.topLevel();
  assert.strictEqual(roots[0], rect);
  assert.strictEqual(roots[1], group);
  assert.strictEqual(group.children()[0], nested);

  // A JavaScript caller can attempt to mutate the array despite readonly typing.
  Reflect.set(roots, "length", 0);
  assert.deepEqual(document.topLevel(), [rect, group]);

  const snapshot = document.topLevel();
  const later = new RectShape("later", 0, 0, 10, 10);
  document.add(later);
  assert.deepEqual(snapshot, [rect, group]);
  assert.deepEqual(document.topLevel(), [rect, group, later]);
});

test("document rejects reusing a root or its ID without replacing the original", () => {
  const document = new SvgDocument();
  const original = new RectShape("rect", 10, 20, 30, 40);
  const duplicate = new RectShape("rect", 50, 60, 70, 80);
  document.add(original);

  for (const candidate of [original, duplicate]) {
    assert.throws(() => document.add(candidate), RangeError);
    assert.equal(document.topLevel().length, 1);
    assert.strictEqual(document.topLevel()[0], original);
    assert.deepEqual(original.position, { x: 10, y: 20 });
  }
});

test("document inserts roots at the start, middle, and end while preserving object identity", () => {
  const document = new SvgDocument();
  const first = new RectShape("first", 0, 0, 10, 10);
  const middle = new RectShape("middle", 0, 0, 10, 10);
  const last = new RectShape("last", 0, 0, 10, 10);
  const group = new GroupShape("group");
  const nested = new RectShape("nested", 10, 20, 30, 40);
  const appended = new RectShape("appended", 0, 0, 10, 10);
  group.add(nested);

  document.add(middle, 0);
  document.add(first, 0);
  document.add(last, 2);
  document.add(group, 1);
  document.add(appended);

  const expected = [first, group, middle, last, appended];
  const roots = document.topLevel();
  assert.equal(roots.length, expected.length);
  for (const [index, shape] of expected.entries()) {
    assert.strictEqual(roots[index], shape);
    assert.strictEqual(document.find(shape.id), shape);
  }
  assert.strictEqual(group.children()[0], nested);
  assert.strictEqual(document.find("nested"), nested);
});

test("document rejects invalid insertion indices without changing roots and permits a valid retry", () => {
  const document = new SvgDocument();
  const candidate = new RectShape("candidate", 10, 20, 30, 40);
  const first = new RectShape("first", 0, 0, 10, 10);
  const last = new RectShape("last", 0, 0, 10, 10);

  for (const populated of [false, true]) {
    if (populated) {
      document.add(first);
      document.add(last);
    }
    const before = document.topLevel();
    const invalidIndices = [
      -1, 0.5, before.length + 1,
      Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
    ];

    for (const index of invalidIndices) {
      assert.throws(() => document.add(candidate, index), RangeError);
      assert.deepEqual(document.topLevel(), before);
      assert.equal(document.find("candidate"), undefined);
      assert.deepEqual(candidate.position, { x: 10, y: 20 });
    }
  }

  document.add(candidate, 1);
  assert.deepEqual(document.topLevel(), [first, candidate, last]);
  assert.strictEqual(document.find("candidate"), candidate);
});

test("indexed insertion rejects duplicate roots and descendant IDs before changing document order", () => {
  const document = new SvgDocument();
  const existing = new GroupShape("existing");
  const shared = new RectShape("shared", 10, 20, 30, 40);
  const last = new RectShape("last", 0, 0, 10, 10);
  existing.add(shared);
  document.add(existing);
  document.add(last);

  const duplicate = new RectShape("existing", 0, 0, 10, 10);
  const candidate = new GroupShape("candidate");
  const valid = new RectShape("valid", 0, 0, 10, 10);
  const conflict = new RectShape("shared", 0, 0, 10, 10);
  candidate.add(valid);
  candidate.add(conflict);

  for (const index of [0, 1, 2]) {
    for (const shape of [existing, duplicate, candidate]) {
      assert.throws(() => document.add(shape, index), RangeError);
      assert.deepEqual(document.topLevel(), [existing, last]);
      assert.strictEqual(document.find("existing"), existing);
      assert.strictEqual(document.find("shared"), shared);
      assert.equal(document.find("candidate"), undefined);
      assert.equal(document.find("valid"), undefined);
      assert.deepEqual(existing.children(), [shared]);
      assert.deepEqual(candidate.children(), [valid, conflict]);
    }
  }

  candidate.remove("shared");
  document.add(candidate, 1);
  assert.deepEqual(document.topLevel(), [existing, candidate, last]);
  assert.strictEqual(document.find("valid"), valid);
});

test("document checks root IDs against descendant IDs in both directions", () => {
  const document = new SvgDocument();
  const scene = new GroupShape("scene");
  const nested = new GroupShape("nested");
  const rect = new RectShape("rect", 0, 0, 10, 10);
  nested.add(rect);
  scene.add(nested);
  document.add(scene);

  assert.throws(
    () => document.add(new RectShape("rect", 0, 0, 20, 20)),
    RangeError,
  );

  const candidate = new GroupShape("candidate");
  candidate.add(new RectShape("scene", 0, 0, 10, 10));
  assert.throws(() => document.add(candidate), RangeError);
  assert.deepEqual(document.topLevel(), [scene]);
  assert.deepEqual(scene.children(), [nested]);
  assert.deepEqual(nested.children(), [rect]);
});

test("a descendant conflict rejects the entire subtree and a corrected retry succeeds", () => {
  const document = new SvgDocument();
  const existing = new GroupShape("existing");
  const original = new RectShape("shared", 10, 20, 30, 40);
  existing.add(original);
  document.add(existing);

  const candidate = new GroupShape("candidate");
  const valid = new RectShape("valid", 0, 0, 10, 10);
  const conflict = new RectShape("shared", 0, 0, 10, 10);
  candidate.add(valid);
  candidate.add(conflict);

  assert.throws(() => document.add(candidate), RangeError);
  assert.deepEqual(document.topLevel(), [existing]);
  assert.deepEqual(existing.children(), [original]);
  assert.deepEqual(candidate.children(), [valid, conflict]);

  candidate.remove("shared");
  document.add(candidate);
  assert.deepEqual(document.topLevel(), [existing, candidate]);
  assert.deepEqual(candidate.children(), [valid]);
});

test("document rejects duplicate IDs within separate branches of a new subtree", () => {
  const document = new SvgDocument();
  const candidate = new GroupShape("candidate");
  const left = new GroupShape("left");
  const right = new GroupShape("right");
  const first = new RectShape("duplicate", 0, 0, 10, 10);
  const second = new RectShape("duplicate", 20, 30, 40, 50);
  left.add(first);
  right.add(second);
  candidate.add(left);
  candidate.add(right);

  assert.throws(() => document.add(candidate), RangeError);
  assert.deepEqual(document.topLevel(), []);
  assert.deepEqual(candidate.children(), [left, right]);
  assert.strictEqual(left.children()[0], first);
  assert.strictEqual(right.children()[0], second);
});

test("document treats IDs as case-sensitive across roots and descendants", () => {
  const document = new SvgDocument();
  const lower = new RectShape("rect", 0, 0, 10, 10);
  const group = new GroupShape("group");
  const upper = new RectShape("RECT", 0, 0, 10, 10);
  group.add(upper);

  document.add(lower);
  document.add(group);

  assert.deepEqual(document.topLevel(), [lower, group]);
  assert.strictEqual(group.children()[0], upper);
});

test("find returns undefined for an empty document and a missing ID", () => {
  const document = new SvgDocument();
  assert.equal(document.find("missing"), undefined);

  const group = new GroupShape("group");
  const rect = new RectShape("rect", 0, 0, 10, 10);
  group.add(rect);
  document.add(group);

  assert.equal(document.find("missing"), undefined);
  assert.deepEqual(document.topLevel(), [group]);
  assert.deepEqual(group.children(), [rect]);
});

test("find returns the original root, nested group, and deeply nested leaf", () => {
  const document = new SvgDocument();
  const outer = new GroupShape("outer");
  const inner = new GroupShape("inner");
  const rect = new RectShape("rect", 10, 20, 30, 40);
  inner.add(rect);
  outer.add(inner);
  document.add(outer);

  assert.strictEqual(document.find("outer"), outer);
  assert.strictEqual(document.find("inner"), inner);
  const found = document.find("rect");
  assert.strictEqual(found, rect);
  assert.ok(found);
  found.move(3, 4);
  assert.deepEqual(rect.position, { x: 13, y: 24 });
});

test("find continues through later siblings and roots when earlier branches do not match", () => {
  const document = new SvgDocument();
  const empty = new GroupShape("empty");
  const branch = new GroupShape("branch");
  const first = new RectShape("first", 0, 0, 10, 10);
  const second = new RectShape("second", 0, 0, 10, 10);
  const last = new RectShape("last", 0, 0, 10, 10);
  branch.add(first);
  branch.add(second);
  document.add(empty);
  document.add(branch);
  document.add(last);

  assert.strictEqual(document.find("second"), second);
  assert.strictEqual(document.find("last"), last);
  assert.deepEqual(document.topLevel(), [empty, branch, last]);
  assert.deepEqual(branch.children(), [first, second]);
});

test("find matches IDs case-sensitively across roots and descendants", () => {
  const document = new SvgDocument();
  const lower = new RectShape("rect", 0, 0, 10, 10);
  const group = new GroupShape("group");
  const upper = new RectShape("RECT", 0, 0, 10, 10);
  group.add(upper);
  document.add(lower);
  document.add(group);

  assert.strictEqual(document.find("rect"), lower);
  assert.strictEqual(document.find("RECT"), upper);
  assert.equal(document.find("Rect"), undefined);
});

test("require returns original roots and descendants that can be edited directly", () => {
  const document = new SvgDocument();
  const outer = new GroupShape("outer");
  const inner = new GroupShape("inner");
  const rect = new RectShape("rect", 10, 20, 30, 40);
  inner.add(rect);
  outer.add(inner);
  document.add(outer);

  assert.strictEqual(document.require("outer"), outer);
  assert.strictEqual(document.require("inner"), inner);
  const target = document.require("rect");
  assert.strictEqual(target, rect);

  target.move(3, 4);

  assert.deepEqual(rect.position, { x: 13, y: 24 });
  assert.deepEqual(document.topLevel(), [outer]);
  assert.deepEqual(outer.children(), [inner]);
  assert.deepEqual(inner.children(), [rect]);
});

test("require reports missing IDs without changing the document and permits a later valid lookup", () => {
  const document = new SvgDocument(400, 300);
  assert.throws(() => document.require("missing"), {
    name: "RangeError",
    message: "no such shape: missing",
  });
  assert.deepEqual(document.topLevel(), []);

  const group = new GroupShape("group");
  const rect = new RectShape("rect", 10, 20, 30, 40);
  group.add(rect);
  document.add(group);

  for (const id of ["missing", "RECT"]) {
    assert.throws(() => document.require(id), {
      name: "RangeError",
      message: `no such shape: ${id}`,
    });
    assert.equal(document.width, 400);
    assert.equal(document.height, 300);
    assert.deepEqual(document.topLevel(), [group]);
    assert.deepEqual(group.children(), [rect]);
    assert.deepEqual(rect.position, { x: 10, y: 20 });
    assert.equal(rect.width, 30);
    assert.equal(rect.height, 40);
  }

  assert.strictEqual(document.require("rect"), rect);
});

test("remove records each root position and permits reinsertion in the original order", () => {
  const first = new RectShape("first", 0, 0, 10, 10);
  const middle = new RectShape("middle", 10, 20, 30, 40);
  const last = new RectShape("last", 0, 0, 10, 10);
  const roots = [first, middle, last];

  for (const [index, target] of roots.entries()) {
    const document = new SvgDocument();
    for (const root of roots) {
      document.add(root);
    }

    const detached = document.remove(target);

    assert.strictEqual(detached.shape, target);
    assert.equal(detached.parent, null);
    assert.equal(detached.index, index);
    const remaining = roots.filter((root) => root !== target);
    assert.deepEqual(document.topLevel(), remaining);
    assert.equal(document.find(target.id), undefined);
    for (const root of remaining) {
      assert.strictEqual(document.find(root.id), root);
    }

    assert.throws(() => document.remove(target), {
      name: "RangeError",
      message: `no such shape: ${target.id}`,
    });
    assert.deepEqual(document.topLevel(), remaining);

    document.add(detached.shape, detached.index);
    for (const [restoredIndex, root] of roots.entries()) {
      assert.strictEqual(document.topLevel()[restoredIndex], root);
    }
  }
});

test("remove finds a deep leaf after earlier branches and detaches it from its direct parent", () => {
  const document = new SvgDocument();
  const emptyRoot = new GroupShape("empty-root");
  const outer = new GroupShape("outer");
  const emptyBranch = new GroupShape("empty-branch");
  const inner = new GroupShape("inner");
  const first = new RectShape("first", 0, 0, 10, 10);
  const target = new RectShape("target", 10, 20, 30, 40);
  const last = new RectShape("last", 0, 0, 10, 10);
  inner.add(first);
  inner.add(target);
  inner.add(last);
  outer.add(emptyBranch);
  outer.add(inner);
  document.add(emptyRoot);
  document.add(outer);

  const detached = document.remove(target);

  assert.strictEqual(detached.shape, target);
  assert.strictEqual(detached.parent, inner);
  assert.equal(detached.index, 1);
  assert.deepEqual(document.topLevel(), [emptyRoot, outer]);
  assert.deepEqual(outer.children(), [emptyBranch, inner]);
  assert.deepEqual(inner.children(), [first, last]);
  assert.equal(document.find("target"), undefined);
  assert.strictEqual(document.find("first"), first);
  assert.strictEqual(document.find("last"), last);

  assert.throws(() => document.remove(target), RangeError);
  assert.deepEqual(inner.children(), [first, last]);
  outer.move(3, 4);
  assert.deepEqual(first.position, { x: 3, y: 4 });
  assert.deepEqual(last.position, { x: 3, y: 4 });
  assert.deepEqual(target.position, { x: 10, y: 20 });

  assert.ok(detached.parent);
  detached.parent.add(detached.shape, detached.index);
  assert.deepEqual(inner.children(), [first, target, last]);
  assert.strictEqual(document.find("target"), target);
});

test("removing a group at either level preserves its subtree and frees every descendant ID", () => {
  for (const nested of [false, true]) {
    const document = new SvgDocument();
    const parent = nested ? new GroupShape("parent") : null;
    const first = new RectShape("first", 0, 0, 10, 10);
    const target = new GroupShape("target");
    const childGroup = new GroupShape("child-group");
    const leaf = new RectShape("leaf", 10, 20, 30, 40);
    const last = new RectShape("last", 0, 0, 10, 10);
    childGroup.add(leaf);
    target.add(childGroup);

    if (parent === null) {
      document.add(first);
      document.add(target);
      document.add(last);
    } else {
      parent.add(first);
      parent.add(target);
      parent.add(last);
      document.add(parent);
    }

    const detached = document.remove(target);

    assert.strictEqual(detached.shape, target);
    assert.strictEqual(detached.parent, parent);
    assert.equal(detached.index, 1);
    assert.strictEqual(target.children()[0], childGroup);
    assert.strictEqual(childGroup.children()[0], leaf);
    assert.deepEqual(leaf.position, { x: 10, y: 20 });
    assert.equal(leaf.width, 30);
    assert.equal(leaf.height, 40);
    assert.deepEqual(parent === null ? document.topLevel() : parent.children(), [first, last]);
    if (parent !== null) {
      assert.deepEqual(document.topLevel(), [parent]);
    }

    for (const node of [target, childGroup, leaf]) {
      assert.equal(document.find(node.id), undefined);
      assert.throws(() => document.remove(node), RangeError);
    }

    for (const id of ["target", "child-group", "leaf"]) {
      const replacement = new RectShape(id, 0, 0, 10, 10);
      document.add(replacement);
      assert.strictEqual(document.find(id), replacement);
    }
    assert.strictEqual(target.children()[0], childGroup);
    assert.strictEqual(childGroup.children()[0], leaf);
  }
});

test("remove rejects absent objects and same-ID impostors without changing document state", () => {
  const document = new SvgDocument(400, 300);
  const absent = new RectShape("absent", 0, 0, 10, 10);
  assert.throws(() => document.remove(absent), {
    name: "RangeError",
    message: "no such shape: absent",
  });
  assert.deepEqual(document.topLevel(), []);

  const group = new GroupShape("group");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  const sibling = new RectShape("sibling", 0, 0, 10, 10);
  group.add(leaf);
  document.add(group);
  document.add(sibling);
  const sameIdGroup = new GroupShape("group");
  sameIdGroup.add(new RectShape("leaf", 10, 20, 30, 40));
  const sameIdLeaf = new RectShape("leaf", 10, 20, 30, 40);

  for (const candidate of [absent, sameIdGroup, sameIdLeaf]) {
    assert.throws(() => document.remove(candidate), {
      name: "RangeError",
      message: `no such shape: ${candidate.id}`,
    });
    assert.equal(document.width, 400);
    assert.equal(document.height, 300);
    assert.deepEqual(document.topLevel(), [group, sibling]);
    assert.deepEqual(group.children(), [leaf]);
    assert.strictEqual(document.find("group"), group);
    assert.strictEqual(document.find("leaf"), leaf);
    assert.deepEqual(leaf.position, { x: 10, y: 20 });
    assert.equal(leaf.width, 30);
    assert.equal(leaf.height, 40);
  }

  assert.strictEqual(document.remove(leaf).shape, leaf);
  assert.deepEqual(group.children(), []);
  assert.deepEqual(document.topLevel(), [group, sibling]);
});

test("restore returns a whole subtree to each original root or nested position", () => {
  for (const nested of [false, true]) {
    for (const index of [0, 1, 2]) {
      const document = new SvgDocument();
      const parent = nested ? new GroupShape("parent") : null;
      const target = new GroupShape("target");
      const inner = new GroupShape("inner");
      const leaf = new RectShape("leaf", 10, 20, 30, 40);
      inner.add(leaf);
      target.add(inner);
      const siblings = [
        new RectShape("first", 0, 0, 10, 10),
        new RectShape("last", 0, 0, 10, 10),
      ];
      if (parent !== null) {
        document.add(parent);
      }
      for (const sibling of siblings) {
        if (parent === null) {
          document.add(sibling);
        } else {
          parent.add(sibling);
        }
      }
      if (parent === null) {
        document.add(target, index);
      } else {
        parent.add(target, index);
      }
      const originalOrder = parent === null ? document.topLevel() : parent.children();

      // Repeated delete/restore cycles must keep the same objects and order.
      for (let cycle = 0; cycle < 2; cycle += 1) {
        const detached = document.remove(target);
        assert.equal(document.find("leaf"), undefined);
        document.restore(detached);

        const restored = parent === null ? document.topLevel() : parent.children();
        for (const [position, shape] of originalOrder.entries()) {
          assert.strictEqual(restored[position], shape);
        }
        assert.equal(restored.length, originalOrder.length);
        assert.strictEqual(document.require("target"), target);
        assert.strictEqual(document.require("inner"), inner);
        assert.strictEqual(document.require("leaf"), leaf);
        assert.deepEqual(leaf.position, { x: 10, y: 20 });
        assert.equal(leaf.width, 30);
        assert.equal(leaf.height, 40);

        assert.throws(() => document.restore(detached), RangeError);
        assert.deepEqual(parent === null ? document.topLevel() : parent.children(), originalOrder);
      }
    }
  }
});

test("restore rejects a missing or replaced parent and succeeds once the original parent returns", () => {
  const document = new SvgDocument();
  const parent = new GroupShape("parent");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  parent.add(leaf);
  document.add(parent);
  const detachedLeaf = document.remove(leaf);
  const detachedParent = document.remove(parent);

  assert.throws(() => document.restore(detachedLeaf), {
    name: "RangeError",
    message: "no such container: parent",
  });
  assert.deepEqual(document.topLevel(), []);
  assert.deepEqual(parent.children(), []);

  const replacement = new GroupShape("parent");
  document.add(replacement);
  assert.throws(() => document.restore(detachedLeaf), {
    name: "RangeError",
    message: "no such container: parent",
  });
  assert.strictEqual(document.require("parent"), replacement);
  assert.deepEqual(replacement.children(), []);
  assert.deepEqual(parent.children(), []);
  assert.equal(document.find("leaf"), undefined);

  document.remove(replacement);
  document.restore(detachedParent);
  document.restore(detachedLeaf);
  assert.strictEqual(document.require("parent"), parent);
  assert.strictEqual(parent.children()[0], leaf);
});

test("restore rejects root and descendant ID conflicts in other branches without partial insertion", () => {
  for (const nested of [false, true]) {
    for (const conflictingId of ["target", "leaf"]) {
      const document = new SvgDocument();
      const parent = nested ? new GroupShape("parent") : null;
      const target = new GroupShape("target");
      const leaf = new RectShape("leaf", 10, 20, 30, 40);
      target.add(leaf);
      if (parent === null) {
        document.add(target);
      } else {
        parent.add(target);
        document.add(parent);
      }
      const detached = document.remove(target);
      const other = new GroupShape("other");
      const conflict = new RectShape(conflictingId, 0, 0, 10, 10);
      other.add(conflict);
      document.add(other);
      const rootsBefore = document.topLevel();

      assert.throws(() => document.restore(detached), {
        name: "RangeError",
        message: `id already exists: ${conflictingId}`,
      });
      assert.deepEqual(document.topLevel(), rootsBefore);
      assert.deepEqual(parent?.children() ?? [], []);
      assert.strictEqual(other.children()[0], conflict);
      assert.strictEqual(document.require(conflictingId), conflict);
      assert.strictEqual(target.children()[0], leaf);

      document.remove(conflict);
      document.restore(detached);
      assert.strictEqual(document.require("target"), target);
      assert.strictEqual(document.require("leaf"), leaf);
    }
  }
});

test("restore rejects invalid positions and a stale original index without changing either tree", () => {
  for (const nested of [false, true]) {
    const document = new SvgDocument();
    const parent = nested ? new GroupShape("parent") : null;
    const first = new RectShape("first", 0, 0, 10, 10);
    const target = new RectShape("target", 10, 20, 30, 40);
    if (parent === null) {
      document.add(first);
      document.add(target);
    } else {
      parent.add(first);
      parent.add(target);
      document.add(parent);
    }
    const detachedTarget = document.remove(target);
    const detachedFirst = document.remove(first);
    const rootsBefore = document.topLevel();

    for (const index of [-1, 0.5, 1, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(() => document.restore({ ...detachedTarget, index }), RangeError);
      assert.deepEqual(document.topLevel(), rootsBefore);
      assert.deepEqual(parent?.children() ?? [], []);
      assert.equal(document.find("target"), undefined);
      assert.deepEqual(target.position, { x: 10, y: 20 });
    }

    // Undo in reverse order makes the original index valid again.
    document.restore(detachedFirst);
    document.restore(detachedTarget);
    assert.deepEqual(parent === null ? document.topLevel() : parent.children(), [first, target]);
  }
});

test("restore revalidates IDs inside a detached subtree before attaching any of it", () => {
  const document = new SvgDocument();
  const target = new GroupShape("target");
  const left = new GroupShape("left");
  const right = new GroupShape("right");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  left.add(leaf);
  target.add(left);
  target.add(right);
  document.add(target);
  const detached = document.remove(target);
  const duplicate = new RectShape("leaf", 0, 0, 10, 10);
  right.add(duplicate);

  assert.throws(() => document.restore(detached), {
    name: "RangeError",
    message: "id already exists: leaf",
  });
  assert.deepEqual(document.topLevel(), []);
  assert.deepEqual(target.children(), [left, right]);
  assert.strictEqual(left.children()[0], leaf);
  assert.strictEqual(right.children()[0], duplicate);

  right.remove("leaf");
  document.restore(detached);
  assert.strictEqual(document.require("target"), target);
  assert.strictEqual(document.require("leaf"), leaf);
});

test("moveTo transfers a whole subtree between groups and its returned location supports undo and redo", () => {
  const document = new SvgDocument(400, 300);
  const source = new GroupShape("source");
  const destination = new GroupShape("destination");
  const first = new RectShape("first", 0, 0, 10, 10);
  const target = new GroupShape("target");
  const inner = new GroupShape("inner");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  const last = new RectShape("last", 0, 0, 10, 10);
  const existing = new RectShape("existing", 0, 0, 10, 10);
  inner.add(leaf);
  target.add(inner);
  source.add(first);
  source.add(target);
  source.add(last);
  destination.add(existing);
  document.add(source);
  document.add(destination);

  const original = document.moveTo(target, destination);

  assert.strictEqual(original.shape, target);
  assert.strictEqual(original.parent, source);
  assert.equal(original.index, 1);
  assert.deepEqual(source.children(), [first, last]);
  assert.deepEqual(destination.children(), [existing, target]);
  assert.deepEqual(document.topLevel(), [source, destination]);
  for (const shape of [target, inner, leaf]) {
    assert.strictEqual(document.require(shape.id), shape);
  }
  assert.deepEqual(leaf.position, { x: 10, y: 20 });
  assert.equal(leaf.width, 30);
  assert.equal(leaf.height, 40);
  assert.equal(document.width, 400);
  assert.equal(document.height, 300);

  const redo = document.moveTo(original.shape, original.parent, original.index);
  assert.deepEqual(source.children(), [first, target, last]);
  assert.deepEqual(destination.children(), [existing]);
  assert.strictEqual(redo.parent, destination);
  assert.equal(redo.index, 1);

  document.moveTo(redo.shape, redo.parent, redo.index);
  source.move(100, 100);
  assert.deepEqual(leaf.position, { x: 10, y: 20 });
  destination.move(3, 4);
  assert.deepEqual(leaf.position, { x: 13, y: 24 });
});

test("moveTo inserts at every destination position between the root and a nested group", () => {
  for (const toGroup of [false, true]) {
    for (const index of [0, 1, 2, undefined]) {
      const document = new SvgDocument();
      const outer = new GroupShape("outer");
      const inner = new GroupShape("inner");
      const target = new RectShape("target", 10, 20, 30, 40);
      const sibling = new RectShape("sibling", 0, 0, 10, 10);
      outer.add(inner);
      document.add(outer);
      const destination = toGroup ? inner : null;
      let expected: Array<GroupShape | RectShape>;
      if (toGroup) {
        const other = new RectShape("other", 0, 0, 10, 10);
        inner.add(sibling);
        inner.add(other);
        document.add(target);
        expected = [sibling, other];
      } else {
        inner.add(target);
        document.add(sibling);
        expected = [outer, sibling];
      }

      const original = document.moveTo(target, destination, index);
      expected.splice(index ?? expected.length, 0, target);

      assert.deepEqual(destination === null ? document.topLevel() : destination.children(), expected);
      assert.strictEqual(original.parent, toGroup ? null : inner);
      assert.equal(original.index, toGroup ? 1 : 0);
      assert.strictEqual(document.require("target"), target);
      assert.deepEqual(outer.children(), [inner]);
      if (toGroup) {
        assert.deepEqual(document.topLevel(), [outer]);
      } else {
        assert.deepEqual(inner.children(), []);
      }
      assert.deepEqual(target.position, { x: 10, y: 20 });
    }
  }
});

test("moveTo interprets same-parent indices after removal and keeps the original order on undo", () => {
  for (const nested of [false, true]) {
    for (const sourceIndex of [0, 1, 2]) {
      for (const targetIndex of [0, 1, 2, undefined]) {
        const document = new SvgDocument();
        const parent = nested ? new GroupShape("parent") : null;
        const shapes = [
          new RectShape("a", 0, 0, 10, 10),
          new RectShape("b", 0, 0, 10, 10),
          new RectShape("c", 0, 0, 10, 10),
        ];
        if (parent !== null) {
          document.add(parent);
        }
        for (const shape of shapes) {
          if (parent === null) {
            document.add(shape);
          } else {
            parent.add(shape);
          }
        }
        const target = shapes[sourceIndex];
        assert.ok(target);
        const expected = shapes.filter((shape) => shape !== target);
        expected.splice(targetIndex ?? expected.length, 0, target);

        const original = document.moveTo(target, parent, targetIndex);

        assert.equal(original.index, sourceIndex);
        assert.strictEqual(original.parent, parent);
        assert.deepEqual(parent === null ? document.topLevel() : parent.children(), expected);

        document.moveTo(original.shape, original.parent, original.index);
        assert.deepEqual(parent === null ? document.topLevel() : parent.children(), shapes);
      }
    }
  }
});

test("moveTo handles a sole child and appends it to an empty destination", () => {
  const document = new SvgDocument();
  const target = new RectShape("target", 10, 20, 30, 40);
  document.add(target);
  assert.equal(document.moveTo(target, null).index, 0);
  assert.deepEqual(document.topLevel(), [target]);

  const group = new GroupShape("group");
  document.add(group);
  document.moveTo(target, group);
  assert.deepEqual(document.topLevel(), [group]);
  assert.strictEqual(group.children()[0], target);
  document.moveTo(target, group);
  assert.deepEqual(group.children(), [target]);
});

test("moveTo rejects missing or same-ID substitute shapes and containers without changing membership", () => {
  const document = new SvgDocument();
  const source = new GroupShape("source");
  const destination = new GroupShape("destination");
  const target = new RectShape("target", 10, 20, 30, 40);
  source.add(target);
  document.add(source);
  document.add(destination);
  const foreignDocument = new SvgDocument();
  const foreignTarget = new RectShape("target", 0, 0, 10, 10);
  const foreignDestination = new GroupShape("destination");
  foreignDocument.add(foreignTarget);
  foreignDocument.add(foreignDestination);

  for (const candidate of [new RectShape("absent", 0, 0, 10, 10), foreignTarget]) {
    assert.throws(() => document.moveTo(candidate, destination), {
      name: "RangeError",
      message: `no such shape: ${candidate.id}`,
    });
  }
  for (const candidate of [new GroupShape("absent"), foreignDestination]) {
    assert.throws(() => document.moveTo(target, candidate), {
      name: "RangeError",
      message: `no such container: ${candidate.id}`,
    });
  }
  assert.deepEqual(document.topLevel(), [source, destination]);
  assert.deepEqual(source.children(), [target]);
  assert.deepEqual(destination.children(), []);
  assert.deepEqual(foreignDocument.topLevel(), [foreignTarget, foreignDestination]);
  assert.deepEqual(foreignDestination.children(), []);
  assert.strictEqual(document.require("target"), target);
});

test("moveTo rejects self-insertion and insertion into a deep descendant before detaching the group", () => {
  const document = new SvgDocument();
  const outer = new GroupShape("outer");
  const middle = new GroupShape("middle");
  const inner = new GroupShape("inner");
  const leaf = new RectShape("leaf", 10, 20, 30, 40);
  inner.add(leaf);
  middle.add(inner);
  outer.add(middle);
  document.add(outer);

  for (const destination of [outer, middle, inner]) {
    assert.throws(() => document.moveTo(outer, destination), {
      name: "RangeError",
      message: "cannot move a shape into itself or its descendant",
    });
    assert.deepEqual(document.topLevel(), [outer]);
    assert.deepEqual(outer.children(), [middle]);
    assert.deepEqual(middle.children(), [inner]);
    assert.deepEqual(inner.children(), [leaf]);
    assert.strictEqual(document.require("leaf"), leaf);
  }
});

test("moveTo rolls back invalid destination indices for root and group sources and allows a retry", () => {
  for (const nestedSource of [false, true]) {
    for (const destinationKind of ["root", "source", "other"] as const) {
      const document = new SvgDocument();
      const source = nestedSource ? new GroupShape("source") : null;
      const other = new GroupShape("other");
      const first = new RectShape("first", 0, 0, 10, 10);
      const target = new GroupShape("target");
      const leaf = new RectShape("leaf", 10, 20, 30, 40);
      const last = new RectShape("last", 0, 0, 10, 10);
      target.add(leaf);
      if (source !== null) {
        document.add(source);
      }
      for (const shape of [first, target, last]) {
        if (source === null) {
          document.add(shape);
        } else {
          source.add(shape);
        }
      }
      document.add(other);
      const destination = destinationKind === "root" ? null : destinationKind === "source" ? source : other;
      const rootsBefore = document.topLevel();
      const destinationSize = destination === null ? document.topLevel().length : destination.children().length;
      const firstInvalidIndex = destinationSize - (destination === source ? 1 : 0) + 1;

      for (const index of [-1, 0.5, firstInvalidIndex, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        assert.throws(() => document.moveTo(target, destination, index), {
          name: "RangeError",
          message: destination === null
            ? "root index must be an integer within document bounds"
            : "child index must be an integer within group bounds",
        });
        assert.deepEqual(document.topLevel(), rootsBefore);
        assert.deepEqual(source?.children() ?? [], source === null ? [] : [first, target, last]);
        assert.deepEqual(other.children(), []);
        assert.strictEqual(target.children()[0], leaf);
        assert.strictEqual(document.require("target"), target);
        assert.strictEqual(document.require("leaf"), leaf);
        assert.deepEqual(leaf.position, { x: 10, y: 20 });
      }

      document.moveTo(target, destination, 0);
      assert.strictEqual((destination === null ? document.topLevel() : destination.children())[0], target);
    }
  }
});

for (const operation of ["bringToFront", "sendToBack"] as const) {
  test(`${operation} reorders whole root subtrees and preserves their original position for undo`, () => {
    for (const sourceIndex of [0, 1, 2]) {
      const document = new SvgDocument(400, 300);
      const first = new RectShape("first", 0, 0, 10, 10);
      const last = new RectShape("last", 0, 0, 10, 10);
      const target = new GroupShape("target");
      const inner = new GroupShape("inner");
      const leaf = new RectShape("leaf", 10, 20, 30, 40);
      inner.add(leaf);
      target.add(inner);
      document.add(first);
      document.add(last);
      document.add(target, sourceIndex);
      const originalOrder = document.topLevel();
      const expected = operation === "bringToFront"
        ? [first, last, target]
        : [target, first, last];

      const original = document[operation](target);

      assert.strictEqual(original.shape, target);
      assert.equal(original.parent, null);
      assert.equal(original.index, sourceIndex);
      assert.deepEqual(document.topLevel(), expected);
      assert.strictEqual(target.children()[0], inner);
      assert.strictEqual(inner.children()[0], leaf);
      for (const shape of [first, last, target, inner, leaf]) {
        assert.strictEqual(document.require(shape.id), shape);
      }
      assert.deepEqual(leaf.position, { x: 10, y: 20 });
      assert.equal(leaf.width, 30);
      assert.equal(leaf.height, 40);
      assert.equal(document.width, 400);
      assert.equal(document.height, 300);

      document.moveTo(original.shape, original.parent, original.index);
      assert.deepEqual(document.topLevel(), originalOrder);
      document[operation](target);
      assert.deepEqual(document.topLevel(), expected);
    }
  });

  test(`${operation} changes only the direct sibling order inside a deeply nested group`, () => {
    const document = new SvgDocument();
    const earlierRoot = new GroupShape("earlier-root");
    const outer = new GroupShape("outer");
    const earlierBranch = new GroupShape("earlier-branch");
    const parent = new GroupShape("parent");
    const first = new RectShape("first", 0, 0, 10, 10);
    const target = new RectShape("target", 10, 20, 30, 40);
    const last = new RectShape("last", 0, 0, 10, 10);
    parent.add(first);
    parent.add(target);
    parent.add(last);
    outer.add(earlierBranch);
    outer.add(parent);
    document.add(earlierRoot);
    document.add(outer);

    const original = document[operation](target);

    assert.strictEqual(original.parent, parent);
    assert.equal(original.index, 1);
    assert.deepEqual(parent.children(), operation === "bringToFront"
      ? [first, last, target]
      : [target, first, last]);
    assert.deepEqual(document.topLevel(), [earlierRoot, outer]);
    assert.deepEqual(outer.children(), [earlierBranch, parent]);
    assert.deepEqual(earlierRoot.children(), []);
    assert.deepEqual(earlierBranch.children(), []);
    assert.strictEqual(document.require("target"), target);
    assert.deepEqual(target.position, { x: 10, y: 20 });
    assert.equal(target.width, 30);
    assert.equal(target.height, 40);

    document.moveTo(original.shape, original.parent, original.index);
    assert.deepEqual(parent.children(), [first, target, last]);
    assert.deepEqual(document.topLevel(), [earlierRoot, outer]);
  });

  test(`${operation} preserves an already positioned node and handles a sole root or child`, () => {
    for (const nested of [false, true]) {
      const document = new SvgDocument();
      const parent = nested ? new GroupShape("parent") : null;
      const target = new RectShape("target", 10, 20, 30, 40);
      if (parent === null) {
        document.add(target);
      } else {
        parent.add(target);
        document.add(parent);
      }

      for (let repeat = 0; repeat < 2; repeat += 1) {
        const original = document[operation](target);
        assert.strictEqual(original.shape, target);
        assert.strictEqual(original.parent, parent);
        assert.equal(original.index, 0);
        assert.deepEqual(parent === null ? document.topLevel() : parent.children(), [target]);
      }

      const sibling = new RectShape("sibling", 0, 0, 10, 10);
      if (parent === null) {
        document.add(sibling);
      } else {
        parent.add(sibling);
      }
      document[operation](target);
      const expected = operation === "bringToFront" ? [sibling, target] : [target, sibling];
      for (let repeat = 0; repeat < 2; repeat += 1) {
        const original = document[operation](target);
        assert.equal(original.index, operation === "bringToFront" ? 1 : 0);
        assert.deepEqual(parent === null ? document.topLevel() : parent.children(), expected);
        assert.strictEqual(document.require("target"), target);
      }
    }
  });

  test(`${operation} rejects absent, foreign, and detached objects without changing the document`, () => {
    const document = new SvgDocument();
    const absent = new RectShape("absent", 0, 0, 10, 10);
    assert.throws(() => document[operation](absent), {
      name: "RangeError",
      message: "no such shape: absent",
    });
    assert.deepEqual(document.topLevel(), []);

    const parent = new GroupShape("parent");
    const target = new RectShape("target", 10, 20, 30, 40);
    const sibling = new RectShape("sibling", 0, 0, 10, 10);
    parent.add(target);
    parent.add(sibling);
    document.add(parent);
    const foreignDocument = new SvgDocument();
    const foreignParent = new GroupShape("parent");
    const foreignTarget = new RectShape("target", 0, 0, 10, 10);
    foreignParent.add(foreignTarget);
    foreignDocument.add(foreignParent);

    for (const candidate of [absent, foreignParent, foreignTarget]) {
      assert.throws(() => document[operation](candidate), {
        name: "RangeError",
        message: `no such shape: ${candidate.id}`,
      });
      assert.deepEqual(document.topLevel(), [parent]);
      assert.deepEqual(parent.children(), [target, sibling]);
      assert.deepEqual(foreignDocument.topLevel(), [foreignParent]);
      assert.strictEqual(foreignParent.children()[0], foreignTarget);
    }

    const detached = document.remove(target);
    assert.throws(() => document[operation](target), {
      name: "RangeError",
      message: "no such shape: target",
    });
    assert.deepEqual(document.topLevel(), [parent]);
    assert.deepEqual(parent.children(), [sibling]);
    document.restore(detached);
    document[operation](target);
    assert.deepEqual(parent.children(), operation === "bringToFront"
      ? [sibling, target]
      : [target, sibling]);
  });
}
