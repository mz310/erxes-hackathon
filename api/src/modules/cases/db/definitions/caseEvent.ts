import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";
import { EVENT_TYPES, type EventType } from "../../domain.ts";

export interface ICaseEvent {
  caseId: string;
  type: EventType;
  message: string;
  payload?: Record<string, unknown> | null;
  actorId?: string | null;
  isPublic: boolean;
  createdAt: Date;
}

export interface ICaseEventDocument extends ICaseEvent, Document<string> {}

// The timeline is the audit trail: every field is immutable and the model
// exposes no update or delete static, so an event can never be rewritten.
export const caseEventSchema = schemaWrapper(
  new Schema({
    caseId: { type: String, required: true, immutable: true },
    type: { type: String, enum: EVENT_TYPES, required: true, immutable: true },
    message: { type: String, required: true, immutable: true },
    payload: { type: Schema.Types.Mixed, immutable: true },
    actorId: { type: String, immutable: true },
    isPublic: { type: Boolean, required: true, default: false, immutable: true },
    createdAt: { type: Date, required: true, default: Date.now, immutable: true },
  }),
);

caseEventSchema.index({ caseId: 1, createdAt: 1 });
