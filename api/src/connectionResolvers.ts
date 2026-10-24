import type { IMainContext } from "erxes-api-shared/core-types";
import { createGenerateModels } from "erxes-api-shared/utils";
import type { Connection } from "mongoose";
import type { ICaseDocument } from "./modules/cases/db/definitions/case.ts";
import type { ICaseEventDocument } from "./modules/cases/db/definitions/caseEvent.ts";
import type { IEvidenceDocument } from "./modules/cases/db/definitions/evidence.ts";
import type { ISettingsDocument } from "./modules/cases/db/definitions/settings.ts";
import { loadCaseClass, type ICaseModel } from "./modules/cases/db/models/Case.ts";
import { loadCaseEventClass, type ICaseEventModel } from "./modules/cases/db/models/CaseEvent.ts";
import { loadEvidenceClass, type IEvidenceModel } from "./modules/cases/db/models/Evidence.ts";
import { loadSettingsClass, type ISettingsModel } from "./modules/cases/db/models/Settings.ts";

export interface IModels {
  Cases: ICaseModel;
  CaseEvents: ICaseEventModel;
  Evidence: IEvidenceModel;
  Settings: ISettingsModel;
}

/**
 * GraphQL resolver context: what `apolloServerContext` in main.ts returns.
 * `subdomain` is the tenant, `models` are bound to that tenant's database.
 */
// IMainContext declares `models?: any`, which would absorb the typed IModels
// in a plain intersection — Omit it first so resolvers get real types.
export type Context = Omit<IMainContext, "models"> & {
  subdomain: string;
  models: IModels;
};

// Public (unauthenticated) resolvers see the same context without a user.
export type PublicContext = Omit<Context, "user"> & { user?: Context["user"] | null };

// Every model must come from this factory: createGenerateModels binds the
// connection for the request's tenant (Mongo `useDb` per organization on
// SaaS), so resolvers never touch another tenant's collections.
const loadClasses = (db: Connection) => {
  const models = {} as IModels;

  models.Cases = db.model<ICaseDocument, ICaseModel>("edu_tech_brave_cases", loadCaseClass(models));
  models.CaseEvents = db.model<ICaseEventDocument, ICaseEventModel>(
    "edu_tech_brave_case_events",
    loadCaseEventClass(models),
  );
  models.Evidence = db.model<IEvidenceDocument, IEvidenceModel>(
    "edu_tech_brave_evidence",
    loadEvidenceClass(models),
  );
  models.Settings = db.model<ISettingsDocument, ISettingsModel>(
    "edu_tech_brave_settings",
    loadSettingsClass(models),
  );

  return models;
};

export const generateModels = createGenerateModels<IModels>(loadClasses);
