import type { ComponentProps } from "react";
import type { Badge } from "erxes-ui";

// Mongolian UI copy for the API enums. The API is authoritative for the
// values; these maps only decide how they read on screen.

export type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

export type Option = { value: string; label: string };

export const toOptions = (labels: Record<string, string>): Option[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const STATUS_LABELS: Record<string, string> = {
  new: "Шинэ",
  under_review: "Хянагдаж байна",
  investigating: "Шалгагдаж байна",
  resolved: "Шийдвэрлэгдсэн",
  dismissed: "Хэрэгсэхгүй болсон",
};

export const STATUS_BADGE: Record<string, BadgeVariant> = {
  new: "info",
  under_review: "warning",
  investigating: "default",
  resolved: "success",
  dismissed: "secondary",
};

// Mirrors the API transition table (api/src/modules/cases/domain.ts). The API
// refuses anything not listed there; this only decides which buttons show.
export const NEXT_STATUSES: Record<string, string[]> = {
  new: ["under_review", "dismissed"],
  under_review: ["investigating", "dismissed"],
  investigating: ["resolved", "dismissed"],
  resolved: ["investigating"],
  dismissed: ["under_review"],
};

export const statusActionLabel = (from: string, to: string): string => {
  if (from === "resolved" || from === "dismissed") {
    return "Дахин нээх";
  }
  switch (to) {
    case "under_review":
      return "Хянаж эхлэх";
    case "investigating":
      return "Шалгалт эхлүүлэх";
    case "resolved":
      return "Шийдвэрлэсэн гэж тэмдэглэх";
    case "dismissed":
      return "Хэрэгсэхгүй болгох";
    default:
      return STATUS_LABELS[to] ?? to;
  }
};

export const SEVERITY_LABELS: Record<string, string> = {
  critical: "Онц ноцтой",
  high: "Өндөр",
  medium: "Дунд",
  low: "Бага",
};

export const SEVERITY_BADGE: Record<string, BadgeVariant> = {
  low: "secondary",
  medium: "info",
  high: "warning",
  critical: "destructive",
};

export const CATEGORY_LABELS: Record<string, string> = {
  physical_violence: "Бие махбодийн хүчирхийлэл",
  psychological_violence: "Сэтгэл зүйн хүчирхийлэл",
  bullying: "Дээрэлхэлт",
  sexual_harassment: "Бэлгийн дарамт",
  discrimination: "Ялгаварлан гадуурхалт",
  neglect_of_duty: "Удирдлагын үл хайхрал, нуун дарагдуулалт",
  teacher_labor_rights: "Багшийн хөдөлмөрийн эрх",
  unfair_assessment: "Шударга бус үнэлгээ",
  privacy_breach: "Хувийн мэдээлэл задруулалт",
  other: "Бусад",
};

export const PROTOCOL_CATEGORIES = ["physical_violence", "sexual_harassment"];

export const REPORTER_ROLE_LABELS: Record<string, string> = {
  student: "Сурагч",
  parent: "Эцэг эх, асран хамгаалагч",
  teacher: "Багш",
  staff: "Ажилтан",
  other: "Бусад",
};

export const VICTIM_ROLE_LABELS: Record<string, string> = {
  student: "Сурагч",
  teacher: "Багш",
  staff: "Ажилтан",
  other: "Бусад",
};

export const ACCUSED_ROLE_LABELS: Record<string, string> = {
  teacher: "Багш",
  administrator: "Удирдлага",
  student: "Сурагч",
  staff: "Ажилтан",
  other: "Бусад",
};

export const SOURCE_LABELS: Record<string, string> = {
  public: "Олон нийтийн суваг",
  staff: "Ажилтан бүртгэсэн",
};

export const EVIDENCE_KIND_LABELS: Record<string, string> = {
  photo: "Зураг",
  medical_record: "Эмчийн үзлэг, эмнэлгийн бичиг",
  witness_statement: "Гэрчийн мэдүүлэг",
  document: "Баримт бичиг",
  other: "Бусад",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  created: "Бүртгэгдсэн",
  status_changed: "Төлөв өөрчлөгдсөн",
  assigned: "Хариуцагч",
  note: "Тэмдэглэл",
  evidence_added: "Нотлох баримт",
  escalated: "Шатласан",
  protocol_step: "Протокол",
  conflict_declared: "Ашиг сонирхлын мэдүүлэг",
  reclassified: "Ангилал засварласан",
  ai_assist: "AI туслах",
};

export const PROTOCOL_STEP_LABELS: Record<string, string> = {
  medical_aid: "Эмнэлгийн тусламж үзүүлэх",
  notify_guardian: "Эцэг эх, асран хамгаалагчид мэдэгдэх",
  separate_accused: "Буруутгагдагчийг хохирогчоос түр тусгаарлах",
  report_authority: "Эрх бүхий байгууллагад мэдээлэх (108 / цагдаа / БСУГ)",
};

export const PROTOCOL_STEP_HINTS: Record<string, string> = {
  medical_aid: "Гэмтэл байгаа эсэхийг эмч үзэж, бичгээр тэмдэглүүлнэ. 103 дуудах шаардлагатай бол дуудна.",
  notify_guardian: "Тухайн өдөр нь эцэг эх, асран хамгаалагчид утсаар болон бичгээр мэдэгдэнэ.",
  separate_accused: "Шалгалт дуустал буруутгагдагч хохирогчтой хичээл, үйл ажиллагаанд хамт оролцохгүй.",
  report_authority: "108 Хүүхдийн тусламжийн утас, шаардлагатай бол цагдаа; БСУГ-д хэргийн дугаараар мэдээлнэ.",
};

export const ESCALATION_LABELS = ["Хариуцагч", "1-р шат", "2-р шат"];

export const STATUS_OPTIONS = toOptions(STATUS_LABELS);
export const SEVERITY_OPTIONS = toOptions(SEVERITY_LABELS);
export const CATEGORY_OPTIONS = toOptions(CATEGORY_LABELS);
export const REPORTER_ROLE_OPTIONS = toOptions(REPORTER_ROLE_LABELS);
export const VICTIM_ROLE_OPTIONS = toOptions(VICTIM_ROLE_LABELS);
export const ACCUSED_ROLE_OPTIONS = toOptions(ACCUSED_ROLE_LABELS);
export const EVIDENCE_KIND_OPTIONS = toOptions(EVIDENCE_KIND_LABELS);
