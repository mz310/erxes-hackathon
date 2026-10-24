import type { Model } from "mongoose";
import type { IModels } from "../../../../connectionResolvers.ts";
import { CASE_SEVERITIES, DEFAULT_SLA_HOURS, type SlaHours } from "../../domain.ts";
import { badInput } from "../../errors.ts";
import {
  DEFAULT_SETTINGS,
  settingsSchema,
  type ISettings,
  type ISettingsDocument,
  type SettingsInput,
} from "../definitions/settings.ts";

const MAX_SLA_HOURS = 24 * 365;
const MAX_TEXT = 500;

export interface ISettingsModel extends Model<ISettingsDocument> {
  getSettings(): Promise<ISettings>;
  saveSettings(input: SettingsInput, userId: string, now: Date): Promise<ISettings>;
}

const text = (value: string | null | undefined, fallback: string, label: string): string => {
  const trimmed = (value ?? "").trim();
  if (trimmed.length > MAX_TEXT) {
    throw badInput(`${label} ${MAX_TEXT} тэмдэгтээс хэтрэхгүй`);
  }
  return trimmed.length ? trimmed : fallback;
};

export const loadSettingsClass = (models: IModels) => {
  class Settings {
    public static async getSettings(): Promise<ISettings> {
      const doc = await models.Settings.findOne({}).lean();
      if (!doc) {
        return { ...DEFAULT_SETTINGS, slaHours: { ...DEFAULT_SLA_HOURS } };
      }
      return {
        slaHours: { ...DEFAULT_SLA_HOURS, ...doc.slaHours },
        organizationName: doc.organizationName ?? DEFAULT_SETTINGS.organizationName,
        escalationLevel1Label: doc.escalationLevel1Label ?? DEFAULT_SETTINGS.escalationLevel1Label,
        escalationLevel1Contact: doc.escalationLevel1Contact ?? "",
        escalationLevel2Label: doc.escalationLevel2Label ?? DEFAULT_SETTINGS.escalationLevel2Label,
        escalationLevel2Contact: doc.escalationLevel2Contact ?? "",
        helplineText: doc.helplineText ?? DEFAULT_SETTINGS.helplineText,
        updatedAt: doc.updatedAt ?? null,
        updatedBy: doc.updatedBy ?? null,
      };
    }

    public static async saveSettings(
      input: SettingsInput,
      userId: string,
      now: Date,
    ): Promise<ISettings> {
      const current = await Settings.getSettings();
      const slaHours = { ...current.slaHours } as SlaHours;
      for (const severity of CASE_SEVERITIES) {
        const value = input.slaHours?.[severity];
        if (value === undefined || value === null) {
          continue;
        }
        if (!Number.isInteger(value) || value < 1 || value > MAX_SLA_HOURS) {
          throw badInput(`Шийдвэрлэх хугацаа 1–${MAX_SLA_HOURS} цагийн хооронд байх ёстой`);
        }
        slaHours[severity] = value;
      }

      const next: ISettings = {
        slaHours,
        organizationName: text(
          input.organizationName ?? current.organizationName,
          DEFAULT_SETTINGS.organizationName,
          "Байгууллагын нэр",
        ),
        escalationLevel1Label: text(
          input.escalationLevel1Label ?? current.escalationLevel1Label,
          DEFAULT_SETTINGS.escalationLevel1Label,
          "1-р шатны нэр",
        ),
        escalationLevel1Contact: text(
          input.escalationLevel1Contact ?? current.escalationLevel1Contact,
          "",
          "1-р шатны холбоо барих",
        ),
        escalationLevel2Label: text(
          input.escalationLevel2Label ?? current.escalationLevel2Label,
          DEFAULT_SETTINGS.escalationLevel2Label,
          "2-р шатны нэр",
        ),
        escalationLevel2Contact: text(
          input.escalationLevel2Contact ?? current.escalationLevel2Contact,
          "",
          "2-р шатны холбоо барих",
        ),
        helplineText: text(
          input.helplineText ?? current.helplineText,
          DEFAULT_SETTINGS.helplineText,
          "Тусламжийн утасны текст",
        ),
        updatedAt: now,
        updatedBy: userId,
      };

      await models.Settings.findOneAndUpdate({}, { $set: next }, { upsert: true, new: true });

      return next;
    }
  }

  settingsSchema.loadClass(Settings);

  return settingsSchema;
};
