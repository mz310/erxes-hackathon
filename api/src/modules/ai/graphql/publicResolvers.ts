import type { PublicContext } from "../../../connectionResolvers.ts";
import { badInput, tooManyRequests } from "../../cases/errors.ts";
import { TOO_MANY, clientKey, markPublic } from "../../cases/graphql/publicResolvers.ts";
import { createRateLimiter } from "../../cases/rateLimit.ts";
import { aiStatus, aiUnavailable, privacyCheck } from "../service.ts";
import { aiTextProblem, type PrivacyCheckInput } from "../tasks.ts";

// Public anonymity check for the intake page: no login, no storage, no
// logging of the text. It returns only phrases quoted from the caller's own
// input, so it cannot leak anything about cases or staff. Off unless
// AI_PUBLIC_PRIVACY_CHECK=true, enforced here and not only by the page.

const WINDOW_MS = 15 * 60 * 1000;
const perClient = createRateLimiter({ max: 10, windowMs: WINDOW_MS });
// Bounds the model bill even when client addresses are spoofed.
const overall = createRateLimiter({ max: 300, windowMs: WINDOW_MS });

const checkPrivacy = async (
  _parent: unknown,
  { input }: { input: PrivacyCheckInput },
  context: PublicContext,
) => {
  if (!aiStatus.publicPrivacyCheck) {
    throw aiUnavailable("disabled");
  }
  if (!perClient.allow(clientKey(context)) || !overall.allow("all")) {
    throw tooManyRequests(TOO_MANY);
  }
  const problem = aiTextProblem(input);
  if (problem) {
    throw badInput(problem);
  }
  return privacyCheck(input);
};

export const aiPublicMutations = {
  eduTechBravePublicPrivacyCheck: markPublic(checkPrivacy),
};
