import { cursorPaginate, type CursorResult } from "erxes-api-shared/utils";
import type { FilterQuery, Model, UpdateQuery } from "mongoose";
import type { IModels } from "../../../../connectionResolvers.ts";
import {
  CATEGORY_LABELS_MN,
  MAX_ESCALATION_LEVEL,
  OPEN_STATUSES,
  PROTOCOL_STEP_LABELS_MN,
  SEVERITY_LABELS_MN,
  STATUS_LABELS_MN,
  assertTransition,
  assignmentGate,
  computeDueAt,
  conflictGate,
  formatCaseNumber,
  generatePin,
  generateTrackingCode,
  hashPin,
  initialProtocolSteps,
  parseIncidentDate,
  planEscalation,
  planReclassify,
  sanitizeReportInput,
  validateReportInput,
  type CaseCategory,
  type CaseSeverity,
  type CaseSource,
  type CaseStatus,
  type ProtocolStepKey,
  type ReportInput,
} from "../../domain.ts";
import { badInput, forbidden, notFound } from "../../errors.ts";
import { caseSchema, type ICaseDocument } from "../definitions/case.ts";
import type { ISettings } from "../definitions/settings.ts";

export type CaseListArgs = {
  search?: string | null;
  status?: CaseStatus | null;
  category?: CaseCategory | null;
  severity?: CaseSeverity | null;
  assigneeId?: string | null;
  overdueOnly?: boolean | null;
  escalatedOnly?: boolean | null;
  openOnly?: boolean | null;
  unassignedOnly?: boolean | null;
  limit?: number | null;
  cursor?: string | null;
  direction?: "forward" | "backward" | null;
  now: Date;
};

export type CountBucket = { key: string; count: number };

export type CaseStats = {
  open: number;
  overdue: number;
  escalated: number;
  critical: number;
  resolvedLast30Days: number;
  demoCount: number;
  byStatus: CountBucket[];
  byCategory: CountBucket[];
  bySeverity: CountBucket[];
};

export type ReclassifyInput = {
  category: CaseCategory;
  severity: CaseSeverity;
  note: string;
};

export type CreateCaseInput = ReportInput & {
  source: CaseSource;
  createdBy?: string | null;
};

export interface ICaseModel extends Model<ICaseDocument> {
  getCase(_id: string): Promise<ICaseDocument>;
  nextCaseNumber(now: Date): Promise<string>;
  createCase(
    input: CreateCaseInput,
    settings: ISettings,
    now: Date,
  ): Promise<{ caseDoc: ICaseDocument; pin: string }>;
  declareConflict(
    _id: string,
    userId: string,
    hasConflict: boolean,
    note: string | null | undefined,
    now: Date,
  ): Promise<ICaseDocument>;
  assign(_id: string, assigneeId: string, actorId: string, now: Date): Promise<ICaseDocument>;
  changeStatus(
    _id: string,
    status: CaseStatus,
    note: string | null | undefined,
    actorId: string,
    now: Date,
  ): Promise<ICaseDocument>;
  completeProtocolStep(
    _id: string,
    key: ProtocolStepKey,
    actorId: string,
    now: Date,
  ): Promise<ICaseDocument>;
  reclassify(
    _id: string,
    input: ReclassifyInput,
    actorId: string,
    settings: ISettings,
    now: Date,
  ): Promise<ICaseDocument>;
  escalateOverdue(now: Date): Promise<number>;
  listPaged(args: CaseListArgs): Promise<CursorResult<ICaseDocument>>;
  stats(now: Date): Promise<CaseStats>;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanOptional = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
};

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

type PaginateParams = Parameters<typeof cursorPaginate>[0];

const DAY_MS = 24 * 60 * 60 * 1000;
const ESCALATION_BATCH = 500;

// Model statics live on the schema class, matching the monorepo's
// loadXClass(models) convention.
export const loadCaseClass = (models: IModels) => {
  class Case {
    public static async getCase(_id: string): Promise<ICaseDocument> {
      const doc = await models.Cases.findOne({ _id });
      if (!doc) {
        throw notFound("Хэрэг олдсонгүй");
      }
      return doc;
    }

    public static async nextCaseNumber(now: Date): Promise<string> {
      const year = now.getUTCFullYear();
      const prefix = formatCaseNumber(year, 0).slice(0, -4);
      const count = await models.Cases.countDocuments({
        caseNumber: new RegExp(`^${escapeRegExp(prefix)}`),
      });
      return formatCaseNumber(year, count + 1);
    }

    public static async createCase(
      input: CreateCaseInput,
      settings: ISettings,
      now: Date,
    ): Promise<{ caseDoc: ICaseDocument; pin: string }> {
      const { source, createdBy, ...report } = input;
      const clean = sanitizeReportInput(report);
      const errors = validateReportInput(clean, now);
      if (errors.length) {
        throw badInput(errors.join(". "));
      }
      const incidentDate = parseIncidentDate(clean.incidentDate);
      if (!incidentDate) {
        throw badInput("Хэрэг болсон огноо буруу эсвэл ирээдүйд байна");
      }

      // Case numbers are derived from a count, so two simultaneous reports
      // can collide on the unique index; retry with a fresh number.
      for (let attempt = 0; ; attempt += 1) {
        const caseNumber = await Case.nextCaseNumber(now);
        const trackingCode = generateTrackingCode();
        const pin = generatePin();
        try {
          const caseDoc = await models.Cases.create({
            ...clean,
            incidentDate,
            caseNumber,
            status: "new",
            source,
            assigneeId: null,
            dueAt: computeDueAt(now, clean.severity, settings.slaHours),
            escalationLevel: 0,
            trackingCode,
            trackingPinHash: hashPin(trackingCode, pin),
            conflictDeclarations: [],
            protocolSteps: initialProtocolSteps(clean.category),
            createdBy: createdBy ?? null,
            createdAt: now,
            updatedAt: now,
          });
          await models.CaseEvents.log({
            caseId: String(caseDoc._id),
            type: "created",
            message: "Мэдэгдэл бүртгэгдлээ",
            payload: { source, caseNumber },
            actorId: createdBy ?? null,
            isPublic: true,
            createdAt: now,
          });
          return { caseDoc, pin };
        } catch (error) {
          if (isDuplicateKey(error) && attempt < 2) {
            continue;
          }
          throw error;
        }
      }
    }

    public static async declareConflict(
      _id: string,
      userId: string,
      hasConflict: boolean,
      note: string | null | undefined,
      now: Date,
    ): Promise<ICaseDocument> {
      const doc = await Case.getCase(_id);
      const unassign = hasConflict && doc.assigneeId === userId;
      const update: UpdateQuery<ICaseDocument> = {
        $push: {
          conflictDeclarations: {
            userId,
            hasConflict,
            note: cleanOptional(note),
            declaredAt: now,
          },
        },
        $set: unassign ? { assigneeId: null, updatedAt: now } : { updatedAt: now },
      };
      const updated = await models.Cases.findOneAndUpdate({ _id }, update, { new: true });
      if (!updated) {
        throw notFound("Хэрэг олдсонгүй");
      }
      await models.CaseEvents.log({
        caseId: _id,
        type: "conflict_declared",
        message: hasConflict
          ? "Ашиг сонирхлын зөрчилтэй гэж мэдүүлэв"
          : "Ашиг сонирхлын зөрчилгүй гэж мэдүүлэв",
        payload: { hasConflict, note: cleanOptional(note) },
        actorId: userId,
        isPublic: false,
        createdAt: now,
      });
      if (unassign) {
        await models.CaseEvents.log({
          caseId: _id,
          type: "assigned",
          message: "Хариуцагч ашиг сонирхлын зөрчлийн улмаас чөлөөлөгдөв",
          payload: { assigneeId: null, previousAssigneeId: userId },
          actorId: userId,
          isPublic: true,
          createdAt: now,
        });
      }
      return updated;
    }

    public static async assign(
      _id: string,
      assigneeId: string,
      actorId: string,
      now: Date,
    ): Promise<ICaseDocument> {
      const doc = await Case.getCase(_id);
      const gate = assignmentGate(doc.conflictDeclarations, actorId, assigneeId);
      if (gate) {
        throw forbidden(gate);
      }
      const updated = await models.Cases.findOneAndUpdate(
        { _id },
        { $set: { assigneeId, updatedAt: now } },
        { new: true },
      );
      if (!updated) {
        throw notFound("Хэрэг олдсонгүй");
      }
      await models.CaseEvents.log({
        caseId: _id,
        type: "assigned",
        message: "Хариуцагч томилогдлоо",
        payload: { assigneeId, previousAssigneeId: doc.assigneeId ?? null },
        actorId,
        isPublic: true,
        createdAt: now,
      });
      return updated;
    }

    public static async changeStatus(
      _id: string,
      status: CaseStatus,
      note: string | null | undefined,
      actorId: string,
      now: Date,
    ): Promise<ICaseDocument> {
      const doc = await Case.getCase(_id);
      const gate = conflictGate(doc.conflictDeclarations, actorId);
      if (gate) {
        throw forbidden(gate);
      }
      const transitionError = assertTransition(doc.status, status, doc.protocolSteps);
      if (transitionError) {
        throw badInput(transitionError);
      }
      const set: Record<string, unknown> = { status, updatedAt: now };
      if (status === "resolved") {
        set.resolvedAt = now;
        set.resolution = cleanOptional(note);
      } else if (doc.status === "resolved") {
        set.resolvedAt = null;
      }
      const updated = await models.Cases.findOneAndUpdate(
        { _id },
        { $set: set },
        { new: true },
      );
      if (!updated) {
        throw notFound("Хэрэг олдсонгүй");
      }
      await models.CaseEvents.log({
        caseId: _id,
        type: "status_changed",
        message: `Төлөв: ${STATUS_LABELS_MN[status]}`,
        payload: { from: doc.status, to: status, note: cleanOptional(note) },
        actorId,
        isPublic: true,
        createdAt: now,
      });
      return updated;
    }

    public static async completeProtocolStep(
      _id: string,
      key: ProtocolStepKey,
      actorId: string,
      now: Date,
    ): Promise<ICaseDocument> {
      const doc = await Case.getCase(_id);
      const gate = conflictGate(doc.conflictDeclarations, actorId);
      if (gate) {
        throw forbidden(gate);
      }
      const step = doc.protocolSteps.find((item) => item.key === key);
      if (!step) {
        throw badInput("Энэ хэрэгт яаралтай протокол хамаарахгүй");
      }
      if (step.doneAt) {
        return doc;
      }
      await models.Cases.updateOne(
        { _id, "protocolSteps.key": key },
        {
          $set: {
            "protocolSteps.$.doneAt": now,
            "protocolSteps.$.doneBy": actorId,
            updatedAt: now,
          },
        },
      );
      await models.CaseEvents.log({
        caseId: _id,
        type: "protocol_step",
        message: `Протокол: ${PROTOCOL_STEP_LABELS_MN[key]} — гүйцэтгэсэн`,
        payload: { key },
        actorId,
        isPublic: true,
        createdAt: now,
      });
      return Case.getCase(_id);
    }

    // Tighten-only correction of category and severity (see planReclassify).
    public static async reclassify(
      _id: string,
      input: ReclassifyInput,
      actorId: string,
      settings: ISettings,
      now: Date,
    ): Promise<ICaseDocument> {
      const doc = await Case.getCase(_id);
      const gate = conflictGate(doc.conflictDeclarations, actorId);
      if (gate) {
        throw forbidden(gate);
      }
      const plan = planReclassify({
        status: doc.status,
        category: doc.category,
        severity: doc.severity,
        createdAt: doc.createdAt,
        dueAt: doc.dueAt,
        protocolSteps: doc.protocolSteps,
        nextCategory: input.category,
        nextSeverity: input.severity,
        note: input.note,
        sla: settings.slaHours,
      });
      if (!plan.ok) {
        throw badInput(plan.error);
      }
      // Match on what the plan was computed from, so a concurrent change
      // (another reclassify, a status change, a protocol step) is not lost.
      const filter: FilterQuery<ICaseDocument> = {
        _id,
        status: doc.status,
        category: doc.category,
        severity: doc.severity,
        dueAt: doc.dueAt,
      };
      if (plan.addedProtocol) {
        filter.protocolSteps = { $size: 0 };
      }
      const updated = await models.Cases.findOneAndUpdate(
        filter,
        {
          $set: {
            category: plan.category,
            severity: plan.severity,
            dueAt: plan.dueAt,
            updatedAt: now,
            ...(plan.addedProtocol ? { protocolSteps: plan.protocolSteps } : {}),
          },
        },
        { new: true },
      );
      if (!updated) {
        throw badInput("Хэрэг энэ хооронд өөрчлөгдсөн байна. Дахин ачаалаад оролдоно уу");
      }
      const changes = [
        doc.category !== plan.category
          ? `Төрөл: ${CATEGORY_LABELS_MN[doc.category]} → ${CATEGORY_LABELS_MN[plan.category]}`
          : null,
        doc.severity !== plan.severity
          ? `Ноцтой байдал: ${SEVERITY_LABELS_MN[doc.severity]} → ${SEVERITY_LABELS_MN[plan.severity]}`
          : null,
        plan.addedProtocol ? "Яаралтай протокол идэвхжлээ" : null,
      ].filter((value): value is string => value !== null);
      await models.CaseEvents.log({
        caseId: _id,
        type: "reclassified",
        message: changes.join("; "),
        payload: {
          from: { category: doc.category, severity: doc.severity, dueAt: doc.dueAt },
          to: { category: plan.category, severity: plan.severity, dueAt: plan.dueAt },
          addedProtocol: plan.addedProtocol,
          note: plan.note,
        },
        actorId,
        isPublic: false,
        createdAt: now,
      });
      return updated;
    }

    public static async escalateOverdue(now: Date): Promise<number> {
      const candidates = await models.Cases.find({
        status: { $in: [...OPEN_STATUSES] },
        dueAt: { $lt: now },
        escalationLevel: { $lt: MAX_ESCALATION_LEVEL },
      })
        .sort({ dueAt: 1 })
        .limit(ESCALATION_BATCH)
        .lean();

      let escalated = 0;
      for (const candidate of candidates) {
        const plan = planEscalation({
          now,
          dueAt: candidate.dueAt,
          status: candidate.status,
          level: candidate.escalationLevel,
        });
        if (!plan.shouldEscalate) {
          continue;
        }
        // The level guard makes the update idempotent when two requests
        // run the lazy escalation at the same moment.
        const result = await models.Cases.updateOne(
          { _id: candidate._id, escalationLevel: candidate.escalationLevel },
          {
            $set: {
              escalationLevel: plan.level,
              dueAt: plan.dueAt,
              escalatedAt: now,
              updatedAt: now,
            },
          },
        );
        if (result.modifiedCount === 0) {
          continue;
        }
        await models.CaseEvents.log({
          caseId: String(candidate._id),
          type: "escalated",
          message: `Хугацаа хэтэрсэн тул ${plan.level}-р шатанд шилжүүлэв`,
          payload: { level: plan.level, previousDueAt: candidate.dueAt, dueAt: plan.dueAt },
          actorId: null,
          isPublic: true,
          createdAt: now,
        });
        escalated += 1;
      }
      return escalated;
    }

    public static async listPaged(args: CaseListArgs): Promise<CursorResult<ICaseDocument>> {
      const query: FilterQuery<ICaseDocument> = {};
      if (args.status) {
        query.status = args.status;
      }
      if (args.category) {
        query.category = args.category;
      }
      if (args.severity) {
        query.severity = args.severity;
      }
      if (args.assigneeId) {
        query.assigneeId = args.assigneeId;
      }
      if (args.overdueOnly) {
        query.dueAt = { $lt: args.now };
        if (!args.status) {
          query.status = { $in: [...OPEN_STATUSES] };
        }
      }
      if (args.escalatedOnly) {
        query.escalationLevel = { $gt: 0 };
      }
      // Matches the dashboard tiles, which count open cases only.
      if (args.openOnly && !args.status) {
        query.status = { $in: [...OPEN_STATUSES] };
      }
      // `$in: [null]` also matches documents with no assigneeId field.
      if (args.unassignedOnly && !args.assigneeId) {
        query.assigneeId = { $in: [null, ""] };
      }
      const search = args.search?.trim();
      if (search) {
        const pattern = new RegExp(escapeRegExp(search), "i");
        query.$or = [{ caseNumber: pattern }, { title: pattern }, { schoolName: pattern }];
      }
      const limit = Math.min(100, Math.max(1, args.limit ?? 30));

      // erxes-api-shared constrains cursorPaginate to ObjectId-keyed documents,
      // while plugin schemas (schemaWrapper) use string ids. Adapt the types at
      // this single boundary; the runtime query is unchanged.
      const result = await cursorPaginate({
        model: models.Cases as unknown as PaginateParams["model"],
        params: {
          limit,
          cursor: args.cursor ?? undefined,
          direction: args.direction ?? undefined,
          orderBy: { createdAt: -1 },
        },
        query: query as PaginateParams["query"],
      });
      return { ...result, list: result.list as unknown as ICaseDocument[] };
    }

    public static async stats(now: Date): Promise<CaseStats> {
      const open = { status: { $in: [...OPEN_STATUSES] } };
      const groupBy = async (field: keyof ICaseDocument, keys: readonly string[]) => {
        const rows = await models.Cases.aggregate<{ _id: string; count: number }>([
          { $group: { _id: `$${String(field)}`, count: { $sum: 1 } } },
        ]);
        const counts = new Map(rows.map((row) => [row._id, row.count]));
        return keys.map((key) => ({ key, count: counts.get(key) ?? 0 }));
      };

      const [
        open_,
        overdue,
        escalated,
        critical,
        resolvedLast30Days,
        demoCount,
        byStatus,
        byCategory,
        bySeverity,
      ] = await Promise.all([
          models.Cases.countDocuments(open),
          models.Cases.countDocuments({ ...open, dueAt: { $lt: now } }),
          models.Cases.countDocuments({ ...open, escalationLevel: { $gt: 0 } }),
          models.Cases.countDocuments({ ...open, severity: "critical" }),
          models.Cases.countDocuments({
            status: "resolved",
            resolvedAt: { $gte: new Date(now.getTime() - 30 * DAY_MS) },
          }),
          models.Cases.countDocuments({ isDemo: true }),
          groupBy("status", ["new", "under_review", "investigating", "resolved", "dismissed"]),
          groupBy("category", [
            "physical_violence",
            "psychological_violence",
            "bullying",
            "sexual_harassment",
            "discrimination",
            "neglect_of_duty",
            "teacher_labor_rights",
            "unfair_assessment",
            "privacy_breach",
            "other",
          ]),
          groupBy("severity", ["critical", "high", "medium", "low"]),
        ]);

      return {
        open: open_,
        overdue,
        escalated,
        critical,
        resolvedLast30Days,
        demoCount,
        byStatus,
        byCategory,
        bySeverity,
      };
    }
  }

  caseSchema.loadClass(Case);

  return caseSchema;
};
