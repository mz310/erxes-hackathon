import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";
import { DEFAULT_SLA_HOURS, type SlaHours } from "../../domain.ts";

export interface ISettings {
  slaHours: SlaHours;
  organizationName: string;
  escalationLevel1Label: string;
  escalationLevel1Contact: string;
  escalationLevel2Label: string;
  escalationLevel2Contact: string;
  helplineText: string;
  updatedAt?: Date | null;
  updatedBy?: string | null;
}

export interface ISettingsDocument extends ISettings, Document<string> {}

export type SettingsInput = Partial<Omit<ISettings, "updatedAt" | "updatedBy" | "slaHours">> & {
  slaHours?: Partial<SlaHours> | null;
};

export const DEFAULT_SETTINGS: ISettings = {
  slaHours: { ...DEFAULT_SLA_HOURS },
  organizationName: "Боловсролын газар",
  escalationLevel1Label: "Хэлтсийн дарга",
  escalationLevel1Contact: "",
  escalationLevel2Label: "Боловсролын газрын дарга / Мэргэжлийн хяналт",
  escalationLevel2Contact: "",
  helplineText: "108 — Хүүхдийн тусламжийн утас, 24/7, үнэгүй",
};

const slaHoursSchema = new Schema(
  {
    critical: { type: Number, required: true, min: 1 },
    high: { type: Number, required: true, min: 1 },
    medium: { type: Number, required: true, min: 1 },
    low: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

export const settingsSchema = schemaWrapper(
  new Schema({
    slaHours: { type: slaHoursSchema, required: true },
    organizationName: { type: String, required: true },
    escalationLevel1Label: { type: String, required: true },
    escalationLevel1Contact: { type: String, default: "" },
    escalationLevel2Label: { type: String, required: true },
    escalationLevel2Contact: { type: String, default: "" },
    helplineText: { type: String, required: true },
    updatedAt: { type: Date },
    updatedBy: { type: String },
  }),
);
