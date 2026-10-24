import { z } from "zod";

// Minimal client for a Gemma model behind one of two HTTP APIs:
//   - "google": the Gemini API's native generateContent endpoint, which serves
//     Gemma 4 (gemma-4-26b-a4b-it, gemma-4-31b-it) with an AI Studio key;
//   - "openai": any OpenAI-compatible /chat/completions server — Ollama, vLLM,
//     LM Studio — so the model can run on the department's own hardware.
// No framework or config imports: tests drive it with a fake fetch.

export type AiProviderKind = "google" | "openai";

// Gemma 4 on the Gemini API thinks by default: ~1 300 thought tokens and
// ~30 s per triage. "minimal" answers in ~4 s with the same category, so it is
// the default; "none" omits the setting for models that reject it.
export const THINKING_LEVELS = ["minimal", "high", "none"] as const;
export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

export type AiConfig = {
  provider: AiProviderKind;
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
  timeoutMs: number;
  thinking: ThinkingLevel;
};

export const GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_GOOGLE_MODEL = "gemma-4-26b-a4b-it";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const HIGH_THINKING_TIMEOUT_MS = 90_000;

export type AiEnv = {
  AI_PROVIDER?: AiProviderKind | undefined;
  AI_BASE_URL?: string | undefined;
  AI_API_KEY?: string | undefined;
  AI_MODEL?: string | undefined;
  AI_TIMEOUT_MS?: number | undefined;
  AI_THINKING_LEVEL?: ThinkingLevel | undefined;
};

const trimSlash = (value: string): string => value.replace(/\/+$/, "");

// A half-configured provider is reported, not guessed around: the caller
// logs `problem` once at startup and the assistant stays off.
export const resolveAiConfig = (
  env: AiEnv,
): { config: AiConfig | null; problem: string | null } => {
  if (!env.AI_PROVIDER) {
    return { config: null, problem: null };
  }
  const thinking = env.AI_THINKING_LEVEL ?? "minimal";
  // "high" took ~43 s live, past the 30 s default.
  const timeoutMs = env.AI_TIMEOUT_MS ?? (thinking === "high" ? HIGH_THINKING_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);
  if (env.AI_PROVIDER === "google") {
    if (!env.AI_API_KEY) {
      return { config: null, problem: "AI_PROVIDER=google requires AI_API_KEY" };
    }
    return {
      config: {
        provider: "google",
        baseUrl: trimSlash(env.AI_BASE_URL ?? GOOGLE_BASE_URL),
        apiKey: env.AI_API_KEY,
        model: env.AI_MODEL ?? DEFAULT_GOOGLE_MODEL,
        timeoutMs,
        thinking,
      },
      problem: null,
    };
  }
  if (!env.AI_BASE_URL || !env.AI_MODEL) {
    return { config: null, problem: "AI_PROVIDER=openai requires AI_BASE_URL and AI_MODEL" };
  }
  return {
    config: {
      provider: "openai",
      baseUrl: trimSlash(env.AI_BASE_URL),
      apiKey: env.AI_API_KEY,
      model: env.AI_MODEL,
      timeoutMs,
      thinking,
    },
    problem: null,
  };
};

export const AI_ERROR_CODES = [
  "disabled",
  "blocked",
  "empty",
  "rate_limited",
  "timeout",
  "provider",
  "unparseable",
] as const;
export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

// The message carries only a status or a short reason, never the provider's
// response body or the prompt, so it is safe to log.
export class AiError extends Error {
  code: AiErrorCode;

  constructor(code: AiErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "AiError";
    this.code = code;
  }
}

export type AiPrompt = {
  system: string;
  user: string;
  maxOutputTokens?: number;
};

export type FetchLike = typeof fetch;

type HttpRequest = { url: string; headers: Record<string, string>; body: unknown };

const DEFAULT_MAX_OUTPUT_TOKENS = 1024;
// Thought tokens count against maxOutputTokens; "high" used ~1 900 on a
// short report, so it gets extra room or the answer is cut off.
const HIGH_THINKING_EXTRA_TOKENS = 4096;
const TEMPERATURE = 0.2;

const googleRequest = (config: AiConfig, prompt: AiPrompt): HttpRequest => ({
  url: `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`,
  // The key travels in a header, not in `?key=`, so it never lands in
  // proxy or access logs that record URLs.
  headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey ?? "" },
  body: {
    systemInstruction: { parts: [{ text: prompt.system }] },
    contents: [{ role: "user", parts: [{ text: prompt.user }] }],
    generationConfig: {
      temperature: TEMPERATURE,
      maxOutputTokens:
        (prompt.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS) +
        (config.thinking === "high" ? HIGH_THINKING_EXTRA_TOKENS : 0),
      ...(config.thinking === "none" ? {} : { thinkingConfig: { thinkingLevel: config.thinking } }),
    },
  },
});

const openAiRequest = (config: AiConfig, prompt: AiPrompt): HttpRequest => ({
  url: `${config.baseUrl}/chat/completions`,
  headers: {
    "Content-Type": "application/json",
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
  },
  body: {
    model: config.model,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: TEMPERATURE,
    max_tokens: prompt.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    stream: false,
  },
});

const googleResponseSchema = z.object({
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({
            parts: z
              .array(z.object({ text: z.string().optional(), thought: z.boolean().optional() }))
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

// Reports of violence and sexual harassment against children are exactly
// what hosted safety filters block. A block must surface as a block, never
// as an empty or "nothing found" answer.
const GOOGLE_BLOCKED_FINISH = new Set([
  "SAFETY",
  "PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
  "RECITATION",
  "IMAGE_SAFETY",
]);

const readGoogle = (payload: unknown): string => {
  const parsed = googleResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AiError("provider", "unexpected response shape");
  }
  if (parsed.data.promptFeedback?.blockReason) {
    throw new AiError("blocked", parsed.data.promptFeedback.blockReason);
  }
  const candidate = parsed.data.candidates?.[0];
  if (!candidate) {
    throw new AiError("empty");
  }
  if (candidate.finishReason && GOOGLE_BLOCKED_FINISH.has(candidate.finishReason)) {
    throw new AiError("blocked", candidate.finishReason);
  }
  const text = (candidate.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new AiError("empty");
  }
  return text;
};

const openAiResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z
          .object({
            content: z.string().nullable().optional(),
            refusal: z.string().nullable().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

// Reasoning models served through Ollama/vLLM can prepend their reasoning.
export const stripThinking = (text: string): string =>
  text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

const readOpenAi = (payload: unknown): string => {
  const parsed = openAiResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AiError("provider", "unexpected response shape");
  }
  const choice = parsed.data.choices?.[0];
  if (!choice) {
    throw new AiError("empty");
  }
  if (choice.finish_reason === "content_filter" || choice.message?.refusal) {
    throw new AiError("blocked", choice.finish_reason ?? "refusal");
  }
  const text = stripThinking(choice.message?.content ?? "");
  if (!text) {
    throw new AiError("empty");
  }
  return text;
};

const isTimeout = (error: unknown): boolean =>
  error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");

// The Gemini API answered a valid request with a one-off 500 during testing;
// one retry covers that without hiding a real outage.
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);
const RETRY_DELAY_MS = 500;

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

export const generateText = async (
  config: AiConfig,
  prompt: AiPrompt,
  fetchImpl: FetchLike = fetch,
): Promise<string> => {
  const request = config.provider === "google" ? googleRequest(config, prompt) : openAiRequest(config, prompt);
  const signal = AbortSignal.timeout(config.timeoutMs);
  let payload: unknown;
  try {
    const send = () =>
      fetchImpl(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal,
      });
    let response = await send();
    if (RETRYABLE_STATUS.has(response.status)) {
      await sleep(RETRY_DELAY_MS, signal);
      response = await send();
    }
    if (response.status === 429) {
      throw new AiError("rate_limited");
    }
    if (!response.ok) {
      throw new AiError("provider", `status ${response.status}`);
    }
    payload = await response.json();
  } catch (error) {
    if (error instanceof AiError) {
      throw error;
    }
    if (isTimeout(error)) {
      throw new AiError("timeout");
    }
    throw new AiError("provider", "request failed");
  }
  return config.provider === "google" ? readGoogle(payload) : readOpenAi(payload);
};
