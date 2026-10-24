import assert from "node:assert/strict";
import { test } from "node:test";
import { AiError, generateText, resolveAiConfig, type AiConfig, type FetchLike } from "./client.ts";

type Call = { url: string; headers: Record<string, string>; body: unknown };

const fakeFetch = (status: number, payload: unknown, calls: Call[] = []): FetchLike =>
  async (input, init) => {
    calls.push({
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body ?? "null")),
    });
    return new Response(JSON.stringify(payload), { status });
  };

const google: AiConfig = {
  provider: "google",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  apiKey: "test-key",
  model: "gemma-4-26b-a4b-it",
  timeoutMs: 1000,
  thinking: "minimal",
};

const openai: AiConfig = {
  provider: "openai",
  baseUrl: "http://localhost:11434/v1",
  apiKey: undefined,
  model: "gemma4:e4b",
  timeoutMs: 1000,
  thinking: "minimal",
};

const prompt = { system: "sys", user: "hello" };

const rejectsWith = async (promise: Promise<unknown>, code: string) => {
  await assert.rejects(promise, (error: unknown) => error instanceof AiError && error.code === code);
};

test("config stays off without a provider and reports a half-configured one", () => {
  assert.deepEqual(resolveAiConfig({}), { config: null, problem: null });
  assert.equal(resolveAiConfig({ AI_PROVIDER: "google" }).config, null);
  assert.ok(resolveAiConfig({ AI_PROVIDER: "google" }).problem);
  assert.ok(resolveAiConfig({ AI_PROVIDER: "openai", AI_MODEL: "x" }).problem);
  const ok = resolveAiConfig({ AI_PROVIDER: "google", AI_API_KEY: "k" }).config;
  assert.equal(ok?.model, "gemma-4-26b-a4b-it");
  assert.equal(ok?.baseUrl, "https://generativelanguage.googleapis.com/v1beta");
  const local = resolveAiConfig({ AI_PROVIDER: "openai", AI_BASE_URL: "http://x/v1/", AI_MODEL: "m" }).config;
  assert.equal(local?.baseUrl, "http://x/v1");
});

test("google request sends the key in a header, never in the URL, and drops thought parts", async () => {
  const calls: Call[] = [];
  const text = await generateText(
    google,
    prompt,
    fakeFetch(
      200,
      {
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: "thinking…", thought: true }, { text: '{"ok":true}' }] },
          },
        ],
      },
      calls,
    ),
  );
  assert.equal(text, '{"ok":true}');
  const call = calls[0];
  assert.ok(call);
  assert.equal(
    call.url,
    "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent",
  );
  assert.equal(call.url.includes("test-key"), false);
  assert.equal(call.headers["x-goog-api-key"], "test-key");
  assert.deepEqual((call.body as { contents: unknown }).contents, [
    { role: "user", parts: [{ text: "hello" }] },
  ]);
});

test("google safety blocks surface as blocked, not as an empty answer", async () => {
  await rejectsWith(
    generateText(google, prompt, fakeFetch(200, { promptFeedback: { blockReason: "SAFETY" } })),
    "blocked",
  );
  await rejectsWith(
    generateText(google, prompt, fakeFetch(200, { candidates: [{ finishReason: "SAFETY" }] })),
    "blocked",
  );
  await rejectsWith(generateText(google, prompt, fakeFetch(200, { candidates: [] })), "empty");
});

test("openai-compatible request uses Bearer only when a key exists and strips <think>", async () => {
  const calls: Call[] = [];
  const text = await generateText(
    { ...openai, apiKey: "local-key" },
    prompt,
    fakeFetch(200, { choices: [{ finish_reason: "stop", message: { content: "<think>hmm</think> done" } }] }, calls),
  );
  assert.equal(text, "done");
  assert.equal(calls[0]?.url, "http://localhost:11434/v1/chat/completions");
  assert.equal(calls[0]?.headers.Authorization, "Bearer local-key");

  const keyless: Call[] = [];
  await generateText(openai, prompt, fakeFetch(200, { choices: [{ message: { content: "x" } }] }, keyless));
  assert.equal(keyless[0]?.headers.Authorization, undefined);

  await rejectsWith(
    generateText(openai, prompt, fakeFetch(200, { choices: [{ finish_reason: "content_filter", message: { content: "" } }] })),
    "blocked",
  );
});

test("HTTP failures map to distinct codes without the response body", async () => {
  await rejectsWith(generateText(google, prompt, fakeFetch(429, { error: "slow down" })), "rate_limited");
  await assert.rejects(
    generateText(google, prompt, fakeFetch(500, { error: "secret provider detail" })),
    (error: unknown) =>
      error instanceof AiError && error.code === "provider" && !error.message.includes("secret"),
  );
});

test("a slow provider times out", async () => {
  const hanging: FetchLike = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    });
  await rejectsWith(generateText({ ...google, timeoutMs: 20 }, prompt, hanging), "timeout");
});

test("google request asks for minimal thinking by default and omits it for none", async () => {
  const calls: Call[] = [];
  const ok = { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "x" }] } }] };
  await generateText(google, prompt, fakeFetch(200, ok, calls));
  await generateText({ ...google, thinking: "none" }, prompt, fakeFetch(200, ok, calls));
  await generateText({ ...google, thinking: "high" }, prompt, fakeFetch(200, ok, calls));
  type Body = { generationConfig: { maxOutputTokens: number; thinkingConfig?: { thinkingLevel: string } } };
  const [minimal, none, high] = calls.map((call) => (call.body as Body).generationConfig);
  assert.deepEqual(minimal?.thinkingConfig, { thinkingLevel: "minimal" });
  assert.equal(none?.thinkingConfig, undefined);
  assert.ok((high?.maxOutputTokens ?? 0) > (minimal?.maxOutputTokens ?? 0), "high thinking gets room");
  assert.equal(resolveAiConfig({ AI_PROVIDER: "google", AI_API_KEY: "k" }).config?.thinking, "minimal");
});

test("a one-off server error is retried once", async () => {
  let attempts = 0;
  const flaky: FetchLike = async () => {
    attempts += 1;
    return attempts === 1
      ? new Response("{}", { status: 500 })
      : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200 });
  };
  assert.equal(await generateText(google, prompt, flaky), "ok");
  assert.equal(attempts, 2);
  let failing = 0;
  const down: FetchLike = async () => {
    failing += 1;
    return new Response("{}", { status: 503 });
  };
  await rejectsWith(generateText(google, prompt, down), "provider");
  assert.equal(failing, 2, "only one retry");
});

test("high thinking gets a longer default timeout, an explicit one wins", () => {
  const high = resolveAiConfig({ AI_PROVIDER: "google", AI_API_KEY: "k", AI_THINKING_LEVEL: "high" }).config;
  assert.equal(high?.timeoutMs, 90_000);
  const explicit = resolveAiConfig({
    AI_PROVIDER: "google",
    AI_API_KEY: "k",
    AI_THINKING_LEVEL: "high",
    AI_TIMEOUT_MS: 45_000,
  }).config;
  assert.equal(explicit?.timeoutMs, 45_000);
});
