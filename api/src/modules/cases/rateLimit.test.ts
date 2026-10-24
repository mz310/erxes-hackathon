import assert from "node:assert/strict";
import { test } from "node:test";
import { createRateLimiter } from "./rateLimit.ts";

test("allows up to max hits per key inside the window, then refuses", () => {
  let clock = 1_000_000;
  const limiter = createRateLimiter({ max: 5, windowMs: 900_000, now: () => clock });
  for (let i = 0; i < 5; i += 1) {
    assert.equal(limiter.allow("1.1.1.1"), true, `hit ${i + 1}`);
  }
  assert.equal(limiter.allow("1.1.1.1"), false);
  assert.equal(limiter.allow("2.2.2.2"), true);
  clock += 900_001;
  assert.equal(limiter.allow("1.1.1.1"), true);
});

test("reset clears every key", () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 60_000, now: () => 5 });
  assert.equal(limiter.allow("k"), true);
  assert.equal(limiter.allow("k"), false);
  limiter.reset();
  assert.equal(limiter.allow("k"), true);
});

test("evicts the oldest key once 10000 keys are tracked", () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 60_000, now: () => 5 });
  for (let i = 0; i < 10_000; i += 1) {
    limiter.allow(`k${i}`);
  }
  assert.equal(limiter.allow("k0"), false);
  limiter.allow("k10000");
  assert.equal(limiter.allow("k0"), true);
});
