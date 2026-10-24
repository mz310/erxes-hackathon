import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";
import { EVIDENCE_KINDS, type EvidenceKind } from "../../domain.ts";

export interface IEvidence {
  caseId: string;
  kind: EvidenceKind;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  recordedAt: Date;
  addedBy: string;
  createdAt: Date;
  checksum: string;
}

export interface IEvidenceDocument extends IEvidence, Document<string> {}

// Evidence is append-only: immutable fields, no update/delete static. The
// checksum lets anyone re-verify that a record was not altered in storage.
export const evidenceSchema = schemaWrapper(
  new Schema({
    caseId: { type: String, required: true, immutable: true },
    kind: { type: String, enum: EVIDENCE_KINDS, required: true, immutable: true },
    title: { type: String, required: true, immutable: true },
    description: { type: String, immutable: true },
    fileUrl: { type: String, immutable: true },
    fileName: { type: String, immutable: true },
    recordedAt: { type: Date, required: true, immutable: true },
    addedBy: { type: String, required: true, immutable: true },
    createdAt: { type: Date, required: true, default: Date.now, immutable: true },
    checksum: { type: String, required: true, immutable: true },
  }),
);

evidenceSchema.index({ caseId: 1, createdAt: 1 });
