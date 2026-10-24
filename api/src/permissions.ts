import type { IPermissionConfig } from "erxes-api-shared/core-types";
import { manifest } from "./config.ts";

// Action names are global across the platform, not local to this plugin.
export const CASES_READ = "eduTechBraveCasesRead";
export const CASES_CREATE = "eduTechBraveCasesCreate";
export const CASES_MANAGE = "eduTechBraveCasesManage";
export const EVIDENCE_ADD = "eduTechBraveEvidenceAdd";
export const SETTINGS_MANAGE = "eduTechBraveSettingsManage";
// Sending case text to a model is a data-processing decision, so it is its
// own action: the department chooses who may do it, separately from reading.
export const AI_USE = "eduTechBraveAiUse";

// There is deliberately no "remove" action: cases, timeline events and
// evidence are never deleted. Scopes are tenant-wide ("all") only — the
// queries do not filter by owner or group, so narrower scopes would lie.
export const permissions: IPermissionConfig = {
  plugin: manifest.name,
  modules: [
    {
      name: "eduTechBraveCases",
      description: `${manifest.title}: эрхийн зөрчлийн хэргүүд`,
      scopeField: null,
      ownerFields: [],
      scopes: [{ name: "all", description: "Энэ байгууллагын бүх хэрэг" }],
      actions: [
        {
          name: CASES_READ,
          title: "Хэрэг харах",
          description: "Хэргийн жагсаалт, дэлгэрэнгүй, түүх, нотлох баримт харах",
        },
        {
          name: CASES_CREATE,
          title: "Хэрэг бүртгэх",
          description: "Ажилтны зүгээс шинэ мэдэгдэл бүртгэх",
        },
        {
          name: CASES_MANAGE,
          title: "Хэрэг удирдах",
          description:
            "Хариуцагч томилох, төлөв солих, ангилал засах, тэмдэглэл бичих, протокол гүйцэтгэх, шатлуулах",
        },
        {
          name: EVIDENCE_ADD,
          title: "Нотлох баримт нэмэх",
          description: "Хэрэгт нотлох баримт хавсаргах (устгах боломжгүй)",
        },
        {
          name: AI_USE,
          title: "AI туслах ашиглах",
          description:
            "Хэргийн текстийг AI загварт (Gemma) илгээж ангилал, товч дүгнэлтийн санал авах",
        },
      ],
    },
    {
      name: "eduTechBraveSettings",
      description: `${manifest.title}: тохиргоо`,
      scopeField: null,
      ownerFields: [],
      scopes: [{ name: "all", description: "Байгууллагын тохиргоо" }],
      actions: [
        {
          name: SETTINGS_MANAGE,
          title: "Тохиргоо удирдах",
          description: "Шийдвэрлэх хугацаа, шатлал, тусламжийн утасны тохиргоо",
        },
      ],
    },
  ],
};
