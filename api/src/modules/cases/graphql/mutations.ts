import { env } from "../../../config.ts";
import type { Context } from "../../../connectionResolvers.ts";
import {
  CASES_CREATE,
  CASES_MANAGE,
  CASES_READ,
  EVIDENCE_ADD,
  SETTINGS_MANAGE,
} from "../../../permissions.ts";
import type { SettingsInput } from "../db/definitions/settings.ts";
import type { AddEvidenceInput } from "../db/models/Evidence.ts";
import { seedDemoData } from "../demo/seedDemo.ts";
import type { ReclassifyInput } from "../db/models/Case.ts";
import {
  conflictGate,
  type CaseStatus,
  type ProtocolStepKey,
  type ReportInput,
} from "../domain.ts";
import { badInput, forbidden, unauthenticated } from "../errors.ts";
import { toCaseGql, toEventGql, toEvidenceGql, toSettingsGql } from "./serialize.ts";

const MAX_NOTE = 5000;

const requireUserId = (context: Context): string => {
  const userId = context.user?._id;
  if (!userId) {
    throw unauthenticated("Нэвтрэх шаардлагатай");
  }
  return String(userId);
};

export const caseMutations = {
  eduTechBraveCaseCreate: async (
    _parent: unknown,
    { input }: { input: ReportInput },
    context: Context,
  ) => {
    await context.checkPermission(CASES_CREATE);
    const userId = requireUserId(context);
    const now = new Date();
    const settings = await context.models.Settings.getSettings();
    const { caseDoc } = await context.models.Cases.createCase(
      { ...input, source: "staff", createdBy: userId },
      settings,
      now,
    );
    return toCaseGql(caseDoc, now);
  },

  eduTechBraveCaseDeclareConflict: async (
    _parent: unknown,
    { _id, hasConflict, note }: { _id: string; hasConflict: boolean; note?: string | null },
    context: Context,
  ) => {
    await context.checkPermission(CASES_READ);
    const userId = requireUserId(context);
    const now = new Date();
    const doc = await context.models.Cases.declareConflict(_id, userId, hasConflict, note, now);
    return toCaseGql(doc, now);
  },

  eduTechBraveCaseAssign: async (
    _parent: unknown,
    { _id, assigneeId }: { _id: string; assigneeId: string },
    context: Context,
  ) => {
    await context.checkPermission(CASES_MANAGE);
    const userId = requireUserId(context);
    const now = new Date();
    const doc = await context.models.Cases.assign(_id, assigneeId, userId, now);
    return toCaseGql(doc, now);
  },

  eduTechBraveCaseChangeStatus: async (
    _parent: unknown,
    { _id, status, note }: { _id: string; status: CaseStatus; note?: string | null },
    context: Context,
  ) => {
    await context.checkPermission(CASES_MANAGE);
    const userId = requireUserId(context);
    const now = new Date();
    const doc = await context.models.Cases.changeStatus(_id, status, note, userId, now);
    return toCaseGql(doc, now);
  },

  eduTechBraveCaseAddNote: async (
    _parent: unknown,
    { _id, content, isPublic }: { _id: string; content: string; isPublic?: boolean | null },
    context: Context,
  ) => {
    await context.checkPermission(CASES_MANAGE);
    const userId = requireUserId(context);
    const trimmed = content.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_NOTE) {
      throw badInput(`Тэмдэглэл 1–${MAX_NOTE} тэмдэгт байх ёстой`);
    }
    const doc = await context.models.Cases.getCase(_id);
    const gate = conflictGate(doc.conflictDeclarations, userId);
    if (gate) {
      throw forbidden(gate);
    }
    const event = await context.models.CaseEvents.log({
      caseId: _id,
      type: "note",
      message: trimmed,
      payload: null,
      actorId: userId,
      isPublic: Boolean(isPublic),
      createdAt: new Date(),
    });
    return toEventGql(event);
  },

  eduTechBraveCaseCompleteProtocolStep: async (
    _parent: unknown,
    { _id, key }: { _id: string; key: ProtocolStepKey },
    context: Context,
  ) => {
    await context.checkPermission(CASES_MANAGE);
    const userId = requireUserId(context);
    const now = new Date();
    const doc = await context.models.Cases.completeProtocolStep(_id, key, userId, now);
    return toCaseGql(doc, now);
  },

  // Corrects a wrong category/severity, e.g. a beating filed as «Бусад» on
  // the public page. Tighten-only: adds the protocol, never extends the
  // deadline (domain.ts planReclassify).
  eduTechBraveCaseReclassify: async (
    _parent: unknown,
    { _id, category, severity, note }: { _id: string } & ReclassifyInput,
    context: Context,
  ) => {
    await context.checkPermission(CASES_MANAGE);
    const userId = requireUserId(context);
    const now = new Date();
    const settings = await context.models.Settings.getSettings();
    const doc = await context.models.Cases.reclassify(
      _id,
      { category, severity, note },
      userId,
      settings,
      now,
    );
    return toCaseGql(doc, now);
  },

  eduTechBraveCaseAddEvidence: async (
    _parent: unknown,
    { input }: { input: Omit<AddEvidenceInput, "addedBy" | "recordedAt"> & { recordedAt: string } },
    context: Context,
  ) => {
    await context.checkPermission(EVIDENCE_ADD);
    const userId = requireUserId(context);
    const doc = await context.models.Cases.getCase(input.caseId);
    const gate = conflictGate(doc.conflictDeclarations, userId);
    if (gate) {
      throw forbidden(gate);
    }
    const evidence = await context.models.Evidence.add(
      { ...input, recordedAt: new Date(input.recordedAt), addedBy: userId },
      new Date(),
    );
    return toEvidenceGql(evidence);
  },

  eduTechBraveCasesEscalateOverdue: async (_parent: unknown, _args: unknown, context: Context) => {
    await context.checkPermission(CASES_MANAGE);
    return context.models.Cases.escalateOverdue(new Date());
  },

  eduTechBraveSettingsSave: async (
    _parent: unknown,
    { input }: { input: SettingsInput },
    context: Context,
  ) => {
    await context.checkPermission(SETTINGS_MANAGE);
    const userId = requireUserId(context);
    const settings = await context.models.Settings.saveSettings(input, userId, new Date());
    return toSettingsGql(settings);
  },

  // Demo data cannot be deleted later (nothing in this plugin can), so it is
  // refused on production deployments and loaded at most once per tenant.
  eduTechBraveSeedDemoData: async (_parent: unknown, _args: unknown, context: Context) => {
    await context.checkPermission(SETTINGS_MANAGE);
    const userId = requireUserId(context);
    if (env.NODE_ENV === "production") {
      throw forbidden("Жишээ өгөгдлийг production орчинд үүсгэх боломжгүй");
    }
    const settings = await context.models.Settings.getSettings();
    return seedDemoData(context.models, { now: new Date(), actorId: userId, settings });
  },
};
