import type { PublicContext } from "../../../connectionResolvers.ts";
import { verifyPin, type ReportInput } from "../domain.ts";
import { badInput, tooManyRequests } from "../errors.ts";
import { createRateLimiter } from "../rateLimit.ts";
import { toPublicCaseGql } from "./serialize.ts";

// The intake channel must work without an erxes account: these two resolvers
// opt out of the login wrapper (`skipPermission`) and are rate-limited per
// client address instead. They never return staff identities or internal notes.

const WINDOW_MS = 15 * 60 * 1000;
const submitLimiter = createRateLimiter({ max: 5, windowMs: WINDOW_MS });
const trackLimiter = createRateLimiter({ max: 20, windowMs: WINDOW_MS });
// Independent of the client address, which a LAN client behind a trusting
// proxy can spoof: caps guesses against any single tracking code. A real
// reporter checks a handful of times; a 6-digit PIN needs ~500 000 tries.
const trackCodeLimiter = createRateLimiter({ max: 30, windowMs: WINDOW_MS });

export const TOO_MANY = "Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу";
const BAD_CREDENTIALS = "Хяналтын код эсвэл PIN буруу";

// Shared with the AI module's public anonymity check
// (api/src/modules/ai/graphql/publicResolvers.ts).
export const clientKey = (context: PublicContext): string => {
  const req = context.req as { ip?: string } | undefined;
  return req?.ip?.trim() || "unknown";
};

export const markPublic = <T extends (...args: never[]) => unknown>(resolver: T) =>
  Object.assign(resolver, { wrapperConfig: { skipPermission: true } });

const submitReport = async (
  _parent: unknown,
  { input }: { input: ReportInput },
  context: PublicContext,
) => {
  if (!submitLimiter.allow(clientKey(context))) {
    throw tooManyRequests(TOO_MANY);
  }
  const now = new Date();
  const settings = await context.models.Settings.getSettings();
  const { caseDoc, pin } = await context.models.Cases.createCase(
    { ...input, source: "public", createdBy: null },
    settings,
    now,
  );
  return { caseNumber: caseDoc.caseNumber, trackingCode: caseDoc.trackingCode, pin };
};

const trackReport = async (
  _parent: unknown,
  { trackingCode, pin }: { trackingCode: string; pin: string },
  context: PublicContext,
) => {
  const code = trackingCode.trim().toUpperCase();
  if (!trackLimiter.allow(clientKey(context)) || !trackCodeLimiter.allow(code)) {
    throw tooManyRequests(TOO_MANY);
  }
  const doc = await context.models.Cases.findOne({ trackingCode: code });
  // One message for both failures so the code alone cannot be confirmed.
  if (!doc || !verifyPin(code, pin.trim(), doc.trackingPinHash)) {
    throw badInput(BAD_CREDENTIALS);
  }
  const events = await context.models.CaseEvents.publicByCase(String(doc._id));
  return toPublicCaseGql(doc, events, new Date());
};

export const publicQueries = {
  eduTechBraveTrackReport: markPublic(trackReport),
};

export const publicMutations = {
  eduTechBraveSubmitReport: markPublic(submitReport),
};
