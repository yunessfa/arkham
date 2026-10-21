import { test } from "node:test";
import assert from "node:assert/strict";
import {
  motionDelay,
  isWorkflowRoute,
  pointerOffset,
} from "../src/motion/policy.ts";
test("Stagger remains at most 240ms for any collection size", () => {
  for (let i = 0; i < 10000; i++) {
    assert.ok(motionDelay(i) >= 0 && motionDelay(i) <= 240);
  }
  assert.deepEqual([0, 1, 2, 3, 4].map(motionDelay), [0, 80, 160, 240, 0]);
  assert.equal(motionDelay(NaN), 0);
  assert.equal(motionDelay(-1), 0);
});
test("Workflow routes preserve native scrolling", () => {
  for (const p of [
    "/cart",
    "/checkout",
    "/account",
    "/orders/2",
    "/manage",
    "/login",
  ])
    assert.ok(isWorkflowRoute(p));
  for (const p of [
    "/",
    "/products",
    "/products/cart",
    "/journal",
    "/category/flowers",
  ])
    assert.equal(isWorkflowRoute(p), false);
});
test("Spotlight translation is clamped to five pixels per axis", () => {
  for (let x = -10; x < 10; x += 0.1)
    assert.ok(Math.abs(pointerOffset(x)) <= 5);
  assert.equal(pointerOffset(0), 0);
  assert.equal(pointerOffset(0.5), 5);
});
