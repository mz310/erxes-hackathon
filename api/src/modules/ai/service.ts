import { GraphQLError } from "graphql";
import { env } from "../../config.ts";
import { AiError, generateText, resolveAiConfig, type AiConfig, type AiErrorCode } from "./client.ts";
import {
  buildPrivacyPrompt,
  buildSummaryPrompt,
  buildTriagePrompt,
  mergePrivacyRisks,
  parseSummary,
  parseTriage,
  type PrivacyCheckInput,
  type PrivacyRisk,
  type SummaryInput,
  type TriageInput,
  type TriageSuggestion,
} from "./tasks.ts";

const resolved = resolveAiConfig(env);
if (resolved.problem) {
  console.warn(`[edu-tech-brave] AI assistant is off: ${resolved.problem}`);
}

const aiConfig: AiConfig | null = resolved.config;

// The Gemini API terms forbid use in services "directed towards or likely to
// be accessed by" people under 18, and the public intake page is used by
// pupils. So the public check runs only on a self-hosted (openai) provider.
const publicCheckRequested = aiConfig !== null && env.AI_PUBLIC_PRIVACY_CHECK;
if (publicCheckRequested && aiConfig?.provider === "google") {
  console.warn(
    "[edu-tech-brave] AI_PUBLIC_PRIVACY_CHECK ignored: the public page is used by minors, which the Gemini API terms do not allow. Use a self-hosted AI_PROVIDER=openai.",
  );
}

export const aiStatus = {
  enabled: aiConfig !== null,
  provider: aiConfig?.provider ?? null,
  model: aiConfig?.model ?? null,
  publicPrivacyCheck: publicCheckRequested && aiConfig?.provider === "openai",
};

// Every failure tells staff to decide by hand; none of them may read as
// "low severity" or "nothing found".
const MESSAGES: Record<AiErrorCode, string> = {
  disabled: "AI туслах тохируулагдаагүй байна",
  blocked: "AI загвар энэ агуулгыг шинжлэхээс татгалзлаа. Гараар шийдвэрлэнэ үү",
  empty: "AI хариу өгсөнгүй. Гараар шийдвэрлэнэ үү",
  rate_limited: "AI үйлчилгээний хязгаар хэтэрлээ. Түр хүлээгээд дахин оролдоно уу",
  timeout: "AI хариу өгөхгүй удлаа. Дахин оролдох эсвэл гараар шийдвэрлэнэ үү",
  provider: "AI үйлчилгээнд алдаа гарлаа. Гараар шийдвэрлэнэ үү",
  unparseable: "AI-ийн хариу ойлгомжгүй байна. Гараар шийдвэрлэнэ үү",
};

export const aiUnavailable = (code: AiErrorCode): GraphQLError =>
  new GraphQLError(MESSAGES[code], { extensions: { code: "AI_UNAVAILABLE", aiCode: code } });

const requireConfig = (): AiConfig => {
  if (!aiConfig) {
    throw aiUnavailable("disabled");
  }
  return aiConfig;
};

const run = async <T>(task: (config: AiConfig) => Promise<T>): Promise<T> => {
  const config = requireConfig();
  try {
    return await task(config);
  } catch (error) {
    if (error instanceof AiError) {
      // AiError messages carry a code and status only, never report text.
      console.warn(`[edu-tech-brave] AI ${error.message}`);
      throw aiUnavailable(error.code);
    }
    throw error;
  }
};

export const triage = (input: TriageInput): Promise<TriageSuggestion> =>
  run(async (config) => parseTriage(await generateText(config, buildTriagePrompt(input))));

export const summarize = (input: SummaryInput): Promise<string> =>
  run(async (config) => parseSummary(await generateText(config, buildSummaryPrompt(input))));

// The anonymity check never fails silently: when the model is unavailable
// the pattern findings still come back, flagged as not checked by AI.
export const privacyCheck = async (
  input: PrivacyCheckInput,
): Promise<{ risks: PrivacyRisk[]; aiChecked: boolean }> => {
  const config = requireConfig();
  try {
    const text = await generateText(config, buildPrivacyPrompt(input));
    return { risks: mergePrivacyRisks(input, text), aiChecked: true };
  } catch (error) {
    if (error instanceof AiError) {
      console.warn(`[edu-tech-brave] AI ${error.message}`);
      return { risks: mergePrivacyRisks(input, null), aiChecked: false };
    }
    throw error;
  }
};

// What the audit event records about a model call: which model, which task
// and, for triage, the enum answer. Never the prompt or model prose.
export const auditPayload = (task: "triage" | "summary", extra: Record<string, unknown> = {}) => ({
  task,
  provider: aiConfig?.provider ?? null,
  model: aiConfig?.model ?? null,
  ...extra,
});
