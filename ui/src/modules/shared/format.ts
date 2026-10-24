const pad = (value: number): string => String(value).padStart(2, "0");

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (iso: string | null | undefined): string => {
  const date = parse(iso);
  return date ? `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}` : "—";
};

export const formatDateTime = (iso: string | null | undefined): string => {
  const date = parse(iso);
  return date ? `${formatDate(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}` : "—";
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// "3 өдөр хэтэрсэн" / "5 цаг үлдсэн": how far a deadline is from now.
export const dueLabel = (dueAt: string, isOverdue: boolean, now: Date = new Date()): string => {
  const due = parse(dueAt);
  if (!due) {
    return "—";
  }
  const diff = Math.abs(due.getTime() - now.getTime());
  const amount = diff >= DAY_MS ? `${Math.floor(diff / DAY_MS)} өдөр` : `${Math.max(1, Math.round(diff / HOUR_MS))} цаг`;
  return isOverdue ? `${amount} хэтэрсэн` : `${amount} үлдсэн`;
};

// A deadline inside this window is shown in the warning colour, so a handler
// sees it coming before it turns red (the Jira SLA pattern).
export const DUE_SOON_HOURS = 24;

export type DueState = "overdue" | "soon" | "ok";

export const dueState = (dueAt: string, isOverdue: boolean, now: Date = new Date()): DueState => {
  if (isOverdue) {
    return "overdue";
  }
  const due = parse(dueAt);
  return due && due.getTime() - now.getTime() <= DUE_SOON_HOURS * HOUR_MS ? "soon" : "ok";
};

// "72 цаг (3 өдөр)": SLA hours as staff think about them.
export const formatHours = (hours: number): string =>
  hours >= 24 && hours % 24 === 0 ? `${hours} цаг (${hours / 24} өдөр)` : `${hours} цаг`;

export const toDateInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const toDateTimeInputValue = (date: Date): string =>
  `${toDateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
