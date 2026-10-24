import type { Context } from "../../../connectionResolvers.ts";
import { CASES_READ } from "../../../permissions.ts";
import type { CaseListArgs } from "../db/models/Case.ts";
import { toCaseGql, toEventGql, toEvidenceGql, toSettingsGql } from "./serialize.ts";

type CasesArgs = Omit<CaseListArgs, "now">;

export const caseQueries = {
  eduTechBraveCases: async (_parent: unknown, args: CasesArgs, context: Context) => {
    await context.checkPermission(CASES_READ);
    const now = new Date();
    // Lazy escalation: anyone opening the list advances overdue cases, so a
    // forgotten case cannot stay quiet just because no job ran.
    await context.models.Cases.escalateOverdue(now);
    const result = await context.models.Cases.listPaged({ ...args, now });
    return {
      list: result.list.map((doc) => toCaseGql(doc, now)),
      totalCount: result.totalCount,
      pageInfo: result.pageInfo,
    };
  },

  eduTechBraveCaseDetail: async (_parent: unknown, { _id }: { _id: string }, context: Context) => {
    await context.checkPermission(CASES_READ);
    const doc = await context.models.Cases.getCase(_id);
    return toCaseGql(doc, new Date());
  },

  eduTechBraveCaseEvents: async (
    _parent: unknown,
    { caseId }: { caseId: string },
    context: Context,
  ) => {
    await context.checkPermission(CASES_READ);
    const events = await context.models.CaseEvents.listByCase(caseId);
    return events.map(toEventGql);
  },

  eduTechBraveCaseEvidence: async (
    _parent: unknown,
    { caseId }: { caseId: string },
    context: Context,
  ) => {
    await context.checkPermission(CASES_READ);
    const evidence = await context.models.Evidence.listByCase(caseId);
    return evidence.map(toEvidenceGql);
  },

  eduTechBraveCaseStats: async (_parent: unknown, _args: unknown, context: Context) => {
    await context.checkPermission(CASES_READ);
    const now = new Date();
    await context.models.Cases.escalateOverdue(now);
    return context.models.Cases.stats(now);
  },

  eduTechBraveSettings: async (_parent: unknown, _args: unknown, context: Context) => {
    await context.checkPermission(CASES_READ);
    return toSettingsGql(await context.models.Settings.getSettings());
  },
};
