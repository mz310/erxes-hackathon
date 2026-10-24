import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";
import {
  ACCUSED_ROLES,
  CASE_CATEGORIES,
  CASE_SEVERITIES,
  CASE_SOURCES,
  CASE_STATUSES,
  PROTOCOL_STEP_KEYS,
  REPORTER_ROLES,
  VICTIM_ROLES,
  type AccusedRole,
  type CaseCategory,
  type CaseSeverity,
  type CaseSource,
  type CaseStatus,
  type ConflictDeclaration,
  type ProtocolStep,
  type ReporterRole,
  type VictimRole,
} from "../../domain.ts";

export interface ICase {
  caseNumber: string;
  title: string;
  description: string;
  category: CaseCategory;
  severity: CaseSeverity;
  status: CaseStatus;
  reporterRole: ReporterRole;
  isAnonymous: boolean;
  reporterContact?: string | null;
  victimRole: VictimRole;
  schoolName: string;
  grade?: string | null;
  incidentDate: Date;
  incidentLocation?: string | null;
  accusedRole?: AccusedRole | null;
  accusedDescription?: string | null;
  source: CaseSource;
  assigneeId?: string | null;
  dueAt: Date;
  escalationLevel: number;
  escalatedAt?: Date | null;
  resolvedAt?: Date | null;
  resolution?: string | null;
  trackingCode: string;
  trackingPinHash: string;
  conflictDeclarations: ConflictDeclaration[];
  protocolSteps: ProtocolStep[];
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Demo/training records loaded from Settings; shown with a «Жишээ» badge.
  isDemo?: boolean;
}

export interface ICaseDocument extends ICase, Document<string> {}

const conflictDeclarationSchema = new Schema(
  {
    userId: { type: String, required: true },
    hasConflict: { type: Boolean, required: true },
    note: { type: String },
    declaredAt: { type: Date, required: true },
  },
  { _id: false },
);

const protocolStepSchema = new Schema(
  {
    key: { type: String, enum: PROTOCOL_STEP_KEYS, required: true },
    doneAt: { type: Date },
    doneBy: { type: String },
  },
  { _id: false },
);

// schemaWrapper adds _id generation plus the processId/segmentIds fields every
// erxes collection carries — always use it for plugin-owned schemas.
export const caseSchema = schemaWrapper(
  new Schema({
    caseNumber: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: CASE_CATEGORIES, required: true },
    severity: { type: String, enum: CASE_SEVERITIES, required: true },
    status: { type: String, enum: CASE_STATUSES, required: true, default: "new" },
    reporterRole: { type: String, enum: REPORTER_ROLES, required: true },
    isAnonymous: { type: Boolean, required: true, default: false },
    reporterContact: { type: String },
    victimRole: { type: String, enum: VICTIM_ROLES, required: true },
    schoolName: { type: String, required: true },
    grade: { type: String },
    incidentDate: { type: Date, required: true },
    incidentLocation: { type: String },
    accusedRole: { type: String, enum: [...ACCUSED_ROLES, null] },
    accusedDescription: { type: String },
    source: { type: String, enum: CASE_SOURCES, required: true },
    assigneeId: { type: String },
    dueAt: { type: Date, required: true },
    escalationLevel: { type: Number, required: true, default: 0 },
    escalatedAt: { type: Date },
    resolvedAt: { type: Date },
    resolution: { type: String },
    trackingCode: { type: String, required: true },
    trackingPinHash: { type: String, required: true },
    conflictDeclarations: { type: [conflictDeclarationSchema], default: [] },
    protocolSteps: { type: [protocolStepSchema], default: [] },
    createdBy: { type: String },
    isDemo: { type: Boolean, default: false, immutable: true },
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
  }),
);

caseSchema.index({ caseNumber: 1 }, { unique: true });
caseSchema.index({ trackingCode: 1 }, { unique: true });
caseSchema.index({ status: 1, dueAt: 1 });
caseSchema.index({ createdAt: -1 });
