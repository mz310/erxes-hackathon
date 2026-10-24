import type { Model } from "mongoose";
import type { IModels } from "../../../../connectionResolvers.ts";
import {
  caseEventSchema,
  type ICaseEvent,
  type ICaseEventDocument,
} from "../definitions/caseEvent.ts";

const MAX_EVENTS = 1000;

// Append-only on purpose: there is no update or remove static, and the
// schema marks every field immutable. The timeline is the audit record.
export interface ICaseEventModel extends Model<ICaseEventDocument> {
  log(doc: ICaseEvent): Promise<ICaseEventDocument>;
  listByCase(caseId: string): Promise<ICaseEventDocument[]>;
  publicByCase(caseId: string): Promise<ICaseEventDocument[]>;
}

export const loadCaseEventClass = (models: IModels) => {
  class CaseEvent {
    public static log(doc: ICaseEvent): Promise<ICaseEventDocument> {
      return models.CaseEvents.create(doc);
    }

    public static listByCase(caseId: string): Promise<ICaseEventDocument[]> {
      return models.CaseEvents.find({ caseId }).sort({ createdAt: 1, _id: 1 }).limit(MAX_EVENTS);
    }

    public static publicByCase(caseId: string): Promise<ICaseEventDocument[]> {
      return models.CaseEvents.find({ caseId, isPublic: true })
        .sort({ createdAt: 1, _id: 1 })
        .limit(MAX_EVENTS);
    }
  }

  caseEventSchema.loadClass(CaseEvent);

  return caseEventSchema;
};
