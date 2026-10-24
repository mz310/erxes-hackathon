import { IconAlertTriangle, IconArrowUpRight, IconClock } from "@tabler/icons-react";
import { Badge, cn } from "erxes-ui";
import { dueLabel, dueState, formatDate } from "../../shared/format";
import {
  CATEGORY_LABELS,
  ESCALATION_LABELS,
  SEVERITY_BADGE,
  SEVERITY_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
} from "../../shared/labels";

export const OPEN_STATUSES = ["new", "under_review", "investigating"];

export const isOpenStatus = (status: string): boolean => OPEN_STATUSES.includes(status);

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant={STATUS_BADGE[status] ?? "default"}>{STATUS_LABELS[status] ?? status}</Badge>
);

export const SeverityBadge = ({ severity }: { severity: string }) => (
  <Badge variant={SEVERITY_BADGE[severity] ?? "default"}>
    {severity === "critical" && <IconAlertTriangle className="edutechbrave:size-3" />}
    {SEVERITY_LABELS[severity] ?? severity}
  </Badge>
);

export const CategoryLabel = ({ category, className }: { category: string; className?: string }) => (
  <span className={cn("edutechbrave:truncate", className)}>{CATEGORY_LABELS[category] ?? category}</span>
);

// Three colours for an open case's deadline: normal, due within a day
// (warning) and overdue (red). Closed cases show the plain date.
export const DueBadge = ({
  dueAt,
  isOverdue,
  status,
}: {
  dueAt: string;
  isOverdue: boolean;
  status: string;
}) => {
  if (!isOpenStatus(status)) {
    return <span className="edutechbrave:text-muted-foreground">{formatDate(dueAt)}</span>;
  }
  const state = dueState(dueAt, isOverdue);
  return (
    <span
      className={cn(
        "edutechbrave:inline-flex edutechbrave:items-center edutechbrave:gap-1 edutechbrave:font-medium",
        state === "overdue" && "edutechbrave:text-destructive",
        state === "soon" && "edutechbrave:text-warning",
        state === "ok" && "edutechbrave:text-foreground",
      )}
      title={`Шийдвэрлэх хугацаа: ${formatDate(dueAt)}`}
    >
      <IconClock className="edutechbrave:size-3.5" />
      {dueLabel(dueAt, isOverdue)}
    </span>
  );
};

export const DemoBadge = () => (
  <Badge variant="secondary" title="Сургалт, туршилтын жишээ өгөгдөл">
    Жишээ
  </Badge>
);

// Level 0 means the case is still with its handler: nothing to flag, so the
// table cell stays quiet instead of repeating a label on every row.
export const EscalationBadge = ({ level }: { level: number }) =>
  level > 0 ? (
    <Badge variant="warning">
      <IconArrowUpRight className="edutechbrave:size-3" />
      {ESCALATION_LABELS[level] ?? `${level}-р шат`}
    </Badge>
  ) : (
    <span className="edutechbrave:text-muted-foreground" title={ESCALATION_LABELS[0]}>
      —
    </span>
  );
