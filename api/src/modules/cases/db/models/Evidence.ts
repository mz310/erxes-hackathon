import type { Model } from "mongoose";
import type { IModels } from "../../../../connectionResolvers.ts";
import { EVIDENCE_KINDS, EVIDENCE_KIND_LABELS_MN, evidenceChecksum } from "../../domain.ts";
import { badInput } from "../../errors.ts";
import { evidenceSchema, type IEvidence, type IEvidenceDocument } from "../definitions/evidence.ts";

export type AddEvidenceInput = Omit<IEvidence, "checksum" | "createdAt">;

const MAX_EVIDENCE = 500;

// Append-only: no update or remove static; every field is immutable and the
// checksum is computed once, at insert, so later tampering is detectable.
export interface IEvidenceModel extends Model<IEvidenceDocument> {
  add(doc: AddEvidenceInput, now: Date): Promise<IEvidenceDocument>;
  listByCase(caseId: string): Promise<IEvidenceDocument[]>;
}

const cleanOptional = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
};

export const loadEvidenceClass = (models: IModels) => {
  class Evidence {
    public static async add(doc: AddEvidenceInput, now: Date): Promise<IEvidenceDocument> {
      const title = doc.title.trim();
      if (title.length < 1 || title.length > 200) {
        throw badInput("Нотлох баримтын нэр 1–200 тэмдэгт байх ёстой");
      }
      if (!(EVIDENCE_KINDS as readonly string[]).includes(doc.kind)) {
        throw badInput("Нотлох баримтын төрөл буруу");
      }
      const recordedAt = new Date(doc.recordedAt);
      if (Number.isNaN(recordedAt.getTime()) || recordedAt.getTime() > now.getTime()) {
        throw badInput("Баримт бүрдүүлсэн огноо буруу эсвэл ирээдүйд байна");
      }
      await models.Cases.getCase(doc.caseId);

      const description = cleanOptional(doc.description);
      const fileUrl = cleanOptional(doc.fileUrl);
      const created = await models.Evidence.create({
        caseId: doc.caseId,
        kind: doc.kind,
        title,
        description,
        fileUrl,
        fileName: cleanOptional(doc.fileName),
        recordedAt,
        addedBy: doc.addedBy,
        createdAt: now,
        checksum: evidenceChecksum({
          caseId: doc.caseId,
          kind: doc.kind,
          title,
          description,
          fileUrl,
          recordedAt,
          createdAt: now,
        }),
      });

      await models.CaseEvents.log({
        caseId: doc.caseId,
        type: "evidence_added",
        message: `Нотлох баримт нэмэгдлээ: ${EVIDENCE_KIND_LABELS_MN[doc.kind]}`,
        payload: { evidenceId: created._id, kind: doc.kind },
        actorId: doc.addedBy,
        isPublic: false,
        createdAt: now,
      });

      return created;
    }

    public static listByCase(caseId: string): Promise<IEvidenceDocument[]> {
      return models.Evidence.find({ caseId }).sort({ createdAt: 1, _id: 1 }).limit(MAX_EVIDENCE);
    }
  }

  evidenceSchema.loadClass(Evidence);

  return evidenceSchema;
};
