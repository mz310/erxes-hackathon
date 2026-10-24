import { STATUS_LABELS_MN, isOpenStatus } from "../domain.ts";
import type { ICase } from "../db/definitions/case.ts";
import type { ICaseEvent } from "../db/definitions/caseEvent.ts";
import type { IEvidence } from "../db/definitions/evidence.ts";
import type { ISettings } from "../db/definitions/settings.ts";

// GraphQL output shapes. Dates become ISO strings; nothing here touches the
// database, so hydrated documents and lean objects serialize the same way.

type WithId<T> = T & { _id: unknown };

const iso = (value: Date | string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

const isoRequired = (value: Date | string): string => new Date(value).toISOString();

const isOverdue = (status: ICase["status"], dueAt: Date, now: Date): boolean =>
  isOpenStatus(status) && new Date(dueAt).getTime() < now.getTime();

export const toCaseGql = (doc: WithId<ICase>, now: Date) => ({
  _id: String(doc._id),
  caseNumber: doc.caseNumber,
  title: doc.title,
  description: doc.description,
  category: doc.category,
  severity: doc.severity,
  status: doc.status,
  reporterRole: doc.reporterRole,
  isAnonymous: doc.isAnonymous,
  reporterContact: doc.reporterContact ?? null,
  victimRole: doc.victimRole,
  schoolName: doc.schoolName,
  grade: doc.grade ?? null,
  incidentDate: isoRequired(doc.incidentDate),
  incidentLocation: doc.incidentLocation ?? null,
  accusedRole: doc.accusedRole ?? null,
  accusedDescription: doc.accusedDescription ?? null,
  source: doc.source,
  assigneeId: doc.assigneeId ?? null,
  dueAt: isoRequired(doc.dueAt),
  isOverdue: isOverdue(doc.status, doc.dueAt, now),
  escalationLevel: doc.escalationLevel,
  escalatedAt: iso(doc.escalatedAt),
  resolvedAt: iso(doc.resolvedAt),
  resolution: doc.resolution ?? null,
  trackingCode: doc.trackingCode,
  conflictDeclarations: doc.conflictDeclarations.map((declaration) => ({
    userId: declaration.userId,
    hasConflict: declaration.hasConflict,
    note: declaration.note ?? null,
    declaredAt: isoRequired(declaration.declaredAt),
  })),
  protocolSteps: doc.protocolSteps.map((step) => ({
    key: step.key,
    doneAt: iso(step.doneAt),
    doneBy: step.doneBy ?? null,
  })),
  createdBy: doc.createdBy ?? null,
  createdAt: isoRequired(doc.createdAt),
  updatedAt: isoRequired(doc.updatedAt),
  isDemo: Boolean(doc.isDemo),
});

export const toEventGql = (doc: WithId<ICaseEvent>) => ({
  _id: String(doc._id),
  caseId: doc.caseId,
  type: doc.type,
  message: doc.message,
  payloadJson: doc.payload ? JSON.stringify(doc.payload) : null,
  actorId: doc.actorId ?? null,
  isPublic: doc.isPublic,
  createdAt: isoRequired(doc.createdAt),
});

export const toEvidenceGql = (doc: WithId<IEvidence>) => ({
  _id: String(doc._id),
  caseId: doc.caseId,
  kind: doc.kind,
  title: doc.title,
  description: doc.description ?? null,
  fileUrl: doc.fileUrl ?? null,
  fileName: doc.fileName ?? null,
  recordedAt: isoRequired(doc.recordedAt),
  addedBy: doc.addedBy,
  createdAt: isoRequired(doc.createdAt),
  checksum: doc.checksum,
});

export const toSettingsGql = (settings: ISettings) => ({
  slaHours: { ...settings.slaHours },
  organizationName: settings.organizationName,
  escalationLevel1Label: settings.escalationLevel1Label,
  escalationLevel1Contact: settings.escalationLevel1Contact,
  escalationLevel2Label: settings.escalationLevel2Label,
  escalationLevel2Contact: settings.escalationLevel2Contact,
  helplineText: settings.helplineText,
  updatedAt: iso(settings.updatedAt),
  updatedBy: settings.updatedBy ?? null,
});

// The reporter's view: enough to know the case is alive and moving, nothing
// that identifies staff or exposes internal notes.
export const toPublicCaseGql = (doc: WithId<ICase>, events: ICaseEvent[], now: Date) => ({
  caseNumber: doc.caseNumber,
  status: doc.status,
  statusLabel: STATUS_LABELS_MN[doc.status],
  createdAt: isoRequired(doc.createdAt),
  dueAt: isoRequired(doc.dueAt),
  isOverdue: isOverdue(doc.status, doc.dueAt, now),
  escalationLevel: doc.escalationLevel,
  updates: events
    .filter((event) => event.isPublic)
    .map((event) => ({ message: event.message, createdAt: isoRequired(event.createdAt) })),
});
