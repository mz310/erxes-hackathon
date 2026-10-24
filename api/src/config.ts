import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// CommonJS stacks (erxes-api-shared's ESM bundle does not run under Node,
// NestJS builds CJS) override api/shared's config.ts, which uses ESM-only
// import.meta.url. erxes.json sits at the repository root, two levels above
// both src/ and dist/.
const manifestSchema = z.object({
  name: z.string(),
  title: z.string(),
  version: z.string(),
  api: z.object({
    port: z.number().int(),
    graphql: z.string(),
    health: z.string(),
  }),
});

export const manifest = manifestSchema.parse(
  JSON.parse(readFileSync(join(__dirname, "../../erxes.json"), "utf8")),
);

const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(manifest.api.port),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: optional,
  MONGO_URL: optional,
  UI_ENTRY_URL: optional,
  LOAD_BALANCER_ADDRESS: optional,
  RELEASE_VERSION: optional,
  // AI assistant (Gemma). Off unless AI_PROVIDER is set; see .env.example.
  AI_PROVIDER: optional.pipe(z.enum(["google", "openai"]).optional()),
  AI_BASE_URL: optional,
  AI_API_KEY: optional,
  AI_MODEL: optional,
  AI_TIMEOUT_MS: optional
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(z.number().int().positive().optional()),
  // Gemini API only: minimal (default, ~4 s) | high (~30–45 s) | none.
  AI_THINKING_LEVEL: optional.pipe(z.enum(["minimal", "high", "none"]).optional()),
  // The public anonymity check sends unsent report text to the model, so it
  // has its own switch and stays off unless explicitly enabled.
  AI_PUBLIC_PRIVACY_CHECK: optional.transform((value) => value === "true"),
});

export const env = envSchema.parse(process.env);

export const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};
