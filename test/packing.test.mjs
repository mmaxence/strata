import assert from "node:assert/strict";
import { packPanels } from "../src/packing.js";
const source = [{ id: "canvas", x: 0, y: 0, w: 360, h: 300, pinned: true }, { id: "a", x: 160, y: -90, w: 180, h: 180 }, { id: "b", x: 160, y: 50, w: 180, h: 180 }, { id: "c", x: -160, y: 0, w: 180, h: 180 }];
const result = packPanels(source, 760, 570);
assert.equal(result.get("canvas").x, 0);
assert.equal(result.get("canvas").shrink, 1);
assert.ok([...result.values()].some((n) => n.shrink < 1));
for (const n of result.values()) {
  assert.ok(Math.abs(n.x) + n.w * n.shrink / 2 <= 360.01);
  assert.ok(Math.abs(n.y) + n.h * n.shrink / 2 <= 265.01);
}
const nodes = [...result.values()];
for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
  const a = nodes[i], b = nodes[j];
  assert.ok(Math.abs(a.x - b.x) >= (a.w * a.shrink + b.w * b.shrink) / 2 - 0.1 || Math.abs(a.y - b.y) >= (a.h * a.shrink + b.h * b.shrink) / 2 - 0.1);
}
assert.deepEqual(packPanels(source, 760, 570), result);
assert.equal(source[1].x, 160);
console.log("PASS packing: anchor stability, edge shrinking, bounds, pair separation, deterministic immutable input");
