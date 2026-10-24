import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublicContext } from "../../../connectionResolvers.ts";
import { publicQueries } from "./publicResolvers.ts";

// A context whose case lookup always misses: every attempt is a wrong guess.
const contextFrom = (ip: string): PublicContext =>
  ({
    req: { ip },
    models: { Cases: { findOne: async () => null } },
  }) as unknown as PublicContext;

const track = (code: string, ip: string) =>
  publicQueries.eduTechBraveTrackReport(undefined, { trackingCode: code, pin: "000000" }, contextFrom(ip));

const codeOf = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
    return "OK";
  } catch (error) {
    return (error as { extensions?: { code?: unknown } }).extensions?.code;
  }
};

test("PIN guessing against one tracking code is throttled even across many client addresses", async () => {
  const codes: unknown[] = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    codes.push(await codeOf(track("ZZZZZZZZZZ", `10.0.${attempt}.1`)));
  }
  assert.equal(codes[0], "BAD_USER_INPUT");
  assert.equal(codes.at(-1), "TOO_MANY_REQUESTS");
});

test("wrong code and wrong PIN fail with the same message", async () => {
  await assert.rejects(track("YYYYYYYYYY", "10.9.9.9"), { message: "Хяналтын код эсвэл PIN буруу" });
});
