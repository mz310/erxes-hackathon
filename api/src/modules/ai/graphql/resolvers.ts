import type { Context } from "../../../connectionResolvers.ts";
import { AI_USE, CASES_CREATE, CASES_READ } from "../../../permissions.ts";
import type { EventType } from "../../cases/domain.ts";
import { badInput, unauthenticated } from "../../cases/errors.ts";
import { aiTextProblem, type TriageInput } from "../tasks.ts";
import { aiStatus, auditPayload, summarize, triage } from "../service.ts";

const requireUserId = (context: Context): string => {
  const userId = context.user?._id;
  if (!userId) {
    throw unauthenticated("Нэвтрэх шаардлагатай");
  }
  return String(userId);
};

const model = (): string => aiStatus.model ?? "";

const SUMMARY_SKIPPED_EVENTS: readonly EventType[] = ["ai_assist", "conflict_declared"];

export const aiQueries = {
  eduTechBraveAiStatus: async (_parent: unknown, _args: unknown, context: Context) => {
    await context.checkPermission(CASES_READ);
    return aiStatus;
  },
};

export const aiMutations = {
  // Staff intake form: suggest before the case exists. Nothing is stored.
  eduTechBraveAiTriageDraft: async (
    _parent: unknown,
    { input }: { input: TriageInput },
    context: Context,
  ) => {
    await context.checkPermission(CASES_CREATE);
    await context.checkPermission(AI_USE);
    requireUserId(context);
    const problem = aiTextProblem(input);
    if (problem) {
      throw badInput(problem);
    }
    const suggestion = await triage(input);
    return { ...suggestion, model: model() };
  },

  // Existing case: the suggestion is shown to staff, and a non-public event
  // records that case text went to the model, with the enum answer only.
  eduTechBraveAiTriageCase: async (_parent: unknown, { _id }: { _id: string }, context: Context) => {
    await context.checkPermission(CASES_READ);
    await context.checkPermission(AI_USE);
    const userId = requireUserId(context);
    const doc = await context.models.Cases.getCase(_id);
    const suggestion = await triage({
      title: doc.title,
      description: doc.description,
      incidentLocation: doc.incidentLocation,
      victimRole: doc.victimRole,
      accusedRole: doc.accusedRole,
      accusedDescription: doc.accusedDescription,
    });
    await context.models.CaseEvents.log({
      caseId: _id,
      type: "ai_assist",
      message: "AI туслахаар ангилал, ноцтой байдлын санал авав",
      payload: auditPayload("triage", {
        category: suggestion.category,
        severity: suggestion.severity,
        urgent: suggestion.urgent,
      }),
      actorId: userId,
      isPublic: false,
      createdAt: new Date(),
    });
    return { ...suggestion, model: model() };
  },

  eduTechBraveAiSummarizeCase: async (_parent: unknown, { _id }: { _id: string }, context: Context) => {
    await context.checkPermission(CASES_READ);
    await context.checkPermission(AI_USE);
    const userId = requireUserId(context);
    const doc = await context.models.Cases.getCase(_id);
    const [events, evidence] = await Promise.all([
      context.models.CaseEvents.listByCase(_id),
      context.models.Evidence.listByCase(_id),
    ]);
    const summary = await summarize({
      caseNumber: doc.caseNumber,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      severity: doc.severity,
      status: doc.status,
      schoolName: doc.schoolName,
      incidentDate: doc.incidentDate,
      createdAt: doc.createdAt,
      dueAt: doc.dueAt,
      escalationLevel: doc.escalationLevel,
      accusedRole: doc.accusedRole,
      accusedDescription: doc.accusedDescription,
      protocolSteps: doc.protocolSteps.map((step) => ({ key: step.key, doneAt: step.doneAt })),
      // Earlier AI output is not fed back in, and conflict declarations
      // (who is related to the accused) never leave the plugin.
      events: events
        .filter((event) => !SUMMARY_SKIPPED_EVENTS.includes(event.type))
        .map((event) => ({ type: event.type, message: event.message, createdAt: event.createdAt })),
      evidence: evidence.map((item) => ({ kind: item.kind, title: item.title, recordedAt: item.recordedAt })),
    });
    await context.models.CaseEvents.log({
      caseId: _id,
      type: "ai_assist",
      message: "AI туслахаар товч дүгнэлт гаргав",
      payload: auditPayload("summary"),
      actorId: userId,
      isPublic: false,
      createdAt: new Date(),
    });
    return { summary, model: model() };
  },
};
