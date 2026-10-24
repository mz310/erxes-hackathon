import manifest from "../../../../erxes.json" with { type: "json" };
import { ASSIGNEE_ME, isOn, type FilterKey } from "./hooks/useCases";

// Saved views over the case list, in the order a handler works through them
// (the Zendesk "Your unsolved / Unassigned" pattern). Each view is a preset
// of URL filters, so it can be linked from the dashboard and bookmarked.

export type FilterPatch = Partial<Record<FilterKey, string | null>>;

export type CaseViewKey = "all" | "open" | "mine" | "unassigned" | "overdue" | "escalated";

export type CaseView = { key: CaseViewKey; label: string; hint: string; patch: FilterPatch };

export const CASE_VIEWS: CaseView[] = [
  { key: "all", label: "Бүгд", hint: "Бүх хэрэг, хаагдсан нь ч орно", patch: {} },
  { key: "open", label: "Нээлттэй", hint: "Шийдвэрлэгдээгүй бүх хэрэг", patch: { open: "1" } },
  { key: "mine", label: "Миний хэрэг", hint: "Танд оноогдсон нээлттэй хэрэг", patch: { assignee: ASSIGNEE_ME, open: "1" } },
  { key: "unassigned", label: "Томилоогүй", hint: "Хариуцагчгүй нээлттэй хэрэг", patch: { unassigned: "1", open: "1" } },
  { key: "overdue", label: "Хугацаа хэтэрсэн", hint: "Шийдвэрлэх хугацаа өнгөрсөн нээлттэй хэрэг", patch: { overdue: "1" } },
  { key: "escalated", label: "Шатласан", hint: "Дээд шатанд шилжсэн нээлттэй хэрэг", patch: { escalated: "1", open: "1" } },
];

// Choosing a view replaces the previous view's keys but keeps search,
// status, severity and category, so a narrowed list stays narrowed.
export const CLEAR_VIEW_KEYS: FilterPatch = {
  open: null,
  assignee: null,
  unassigned: null,
  overdue: null,
  escalated: null,
};

export const activeViewOf = (filters: Partial<Record<FilterKey, unknown>>): CaseViewKey => {
  if (String(filters.assignee ?? "") === ASSIGNEE_ME) return "mine";
  if (isOn(filters.unassigned)) return "unassigned";
  if (isOn(filters.overdue)) return "overdue";
  if (isOn(filters.escalated)) return "escalated";
  if (isOn(filters.open)) return "open";
  return "all";
};

export const PLUGIN_BASE = `/${manifest.ui.path}`;

// Link into the case list with filters already applied.
export const casesHref = (patch: FilterPatch = {}): string => {
  const params = new URLSearchParams();
  Object.entries(patch).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return `${PLUGIN_BASE}/cases${query ? `?${query}` : ""}`;
};

export const viewHref = (key: CaseViewKey): string =>
  casesHref(CASE_VIEWS.find((view) => view.key === key)?.patch ?? {});
