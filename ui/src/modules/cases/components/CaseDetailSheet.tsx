import { useQuery } from "@apollo/client";
import { IconCheck, IconCopy, IconLock } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useState, type ReactNode } from "react";
import { Badge, Button, Sheet, Skeleton, Tabs, cn, useQueryState } from "erxes-ui";
import { currentUserState } from "ui-modules";
import { STATUS_LABELS } from "../../shared/labels";
import { CASE_DETAIL_QUERY } from "../graphql";
import { DemoBadge, DueBadge, EscalationBadge, SeverityBadge, StatusBadge, isOpenStatus } from "./badges";
import { CaseEvidenceTab } from "./CaseEvidenceTab";
import { CaseOverviewTab } from "./CaseOverviewTab";
import { CaseProtocolTab } from "./CaseProtocolTab";
import { CaseTimelineTab } from "./CaseTimelineTab";
import { CaseWorkflowCard } from "./CaseWorkflowCard";
import { MemberName } from "./MemberName";
import { caseAccessFor, notifySuccess } from "./shared";

const TRACK = ["new", "under_review", "investigating", "resolved"] as const;

// Where the case is in its life: four steps, with «Хэрэгсэхгүй болсон»
// shown as a stop instead of a step, since it can happen from any of them.
const StatusTrack = ({ status }: { status: string }) => {
  const dismissed = status === "dismissed";
  const index = TRACK.findIndex((step) => step === status);
  return (
    <ol className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:gap-x-2 edutechbrave:gap-y-1" aria-label="Хэргийн явц">
      {TRACK.map((step, position) => {
        const done = !dismissed && position < index;
        const current = !dismissed && position === index;
        return (
          <li key={step} className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-2">
            {position > 0 && (
              <span
                aria-hidden
                className={cn(
                  "edutechbrave:h-px edutechbrave:w-5",
                  done || current ? "edutechbrave:bg-primary" : "edutechbrave:bg-border",
                )}
              />
            )}
            <span
              aria-current={current ? "step" : undefined}
              className={cn(
                "edutechbrave:inline-flex edutechbrave:items-center edutechbrave:gap-1 edutechbrave:text-xs",
                current && "edutechbrave:font-semibold edutechbrave:text-foreground",
                done && "edutechbrave:text-foreground",
                !done && !current && "edutechbrave:text-muted-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "edutechbrave:flex edutechbrave:size-4 edutechbrave:items-center edutechbrave:justify-center edutechbrave:rounded-full edutechbrave:border",
                  done && "edutechbrave:border-primary edutechbrave:bg-primary edutechbrave:text-primary-foreground",
                  current && "edutechbrave:border-primary edutechbrave:bg-background",
                  !done && !current && "edutechbrave:border-border",
                )}
              >
                {done && <IconCheck className="edutechbrave:size-3" />}
                {current && <span className="edutechbrave:size-1.5 edutechbrave:rounded-full edutechbrave:bg-primary" />}
              </span>
              {STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
      {dismissed && (
        <li className="edutechbrave:ml-1">
          <Badge variant="secondary">{STATUS_LABELS.dismissed}</Badge>
        </li>
      )}
    </ol>
  );
};

const MetaItem = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="edutechbrave:flex edutechbrave:min-w-0 edutechbrave:flex-col edutechbrave:gap-0.5">
    <span className="edutechbrave:text-xs edutechbrave:text-muted-foreground">{label}</span>
    <div className="edutechbrave:flex edutechbrave:min-w-0 edutechbrave:items-center edutechbrave:text-sm">{children}</div>
  </div>
);

const CaseDetailBody = ({ caseId }: { caseId: string }) => {
  const { data, loading, error, refetch } = useQuery(CASE_DETAIL_QUERY, {
    variables: { _id: caseId },
  });
  const currentUser = useAtomValue(currentUserState);
  const [tab, setTab] = useState("overview");
  const item = data?.eduTechBraveCaseDetail;

  if (loading && !item) {
    return (
      <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3 edutechbrave:p-5" role="status">
        <Sheet.Title className="edutechbrave:sr-only">Ачаалж байна</Sheet.Title>
        <Skeleton className="edutechbrave:h-6 edutechbrave:w-40" />
        <Skeleton className="edutechbrave:h-8 edutechbrave:w-3/4" />
        <Skeleton className="edutechbrave:h-40 edutechbrave:w-full" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:items-start edutechbrave:gap-3 edutechbrave:p-5" role="alert">
        <Sheet.Title>Хэргийг ачаалж чадсангүй</Sheet.Title>
        <p className="edutechbrave:text-sm edutechbrave:text-muted-foreground">
          {error?.message ?? "Хэрэг олдсонгүй"}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Дахин оролдох
        </Button>
      </div>
    );
  }

  const access = caseAccessFor(item.conflictDeclarations, currentUser?._id);
  const hasProtocol = item.protocolSteps.length > 0;
  const pendingSteps = item.protocolSteps.filter((step) => !step.doneAt).length;
  const showOverview = () => setTab("overview");

  return (
    <div className="edutechbrave:flex edutechbrave:h-full edutechbrave:flex-col edutechbrave:bg-background">
      {/* erxes Sheet.Header is a fixed 40px bar, like every core sheet: keep
          only the case number and close button in it, and put the rest in a
          block of its own so nothing overflows into the tabs. */}
      <Sheet.Header className="edutechbrave:gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="edutechbrave:-ml-2 edutechbrave:font-mono"
          title="Хэргийн дугаар хуулах"
          onClick={() => {
            void navigator.clipboard?.writeText(item.caseNumber);
            notifySuccess("Дугаар хуулагдлаа", item.caseNumber);
          }}
        >
          {item.caseNumber}
          <IconCopy />
        </Button>
        <Sheet.Close />
      </Sheet.Header>
      <div className="edutechbrave:flex edutechbrave:flex-none edutechbrave:flex-col edutechbrave:gap-3 edutechbrave:border-b edutechbrave:border-border edutechbrave:px-5 edutechbrave:py-4">
        <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:gap-1.5">
          <StatusBadge status={item.status} />
          <SeverityBadge severity={item.severity} />
          {item.escalationLevel > 0 && <EscalationBadge level={item.escalationLevel} />}
          {item.isAnonymous && (
            <Badge variant="secondary">
              <IconLock className="edutechbrave:size-3" />
              Нэрээ нууцалсан
            </Badge>
          )}
          {item.isDemo && <DemoBadge />}
        </div>
        <Sheet.Title className="edutechbrave:text-lg edutechbrave:leading-snug">{item.title}</Sheet.Title>
        <Sheet.Description className="edutechbrave:sr-only">
          {item.schoolName}. {STATUS_LABELS[item.status] ?? item.status}.
        </Sheet.Description>
        <div className="edutechbrave:grid edutechbrave:grid-cols-2 edutechbrave:gap-3 edutechbrave:sm:grid-cols-3">
          <MetaItem label={isOpenStatus(item.status) ? "Шийдвэрлэх хугацаа" : "Хугацаа байсан"}>
            <DueBadge dueAt={item.dueAt} isOverdue={item.isOverdue} status={item.status} />
          </MetaItem>
          <MetaItem label="Хариуцагч">
            {item.assigneeId ? (
              <MemberName id={item.assigneeId} />
            ) : (
              <span className={cn(isOpenStatus(item.status) && "edutechbrave:font-medium edutechbrave:text-destructive")}>
                Томилоогүй
              </span>
            )}
          </MetaItem>
          <MetaItem label="Сургууль">{item.grade ? `${item.schoolName}, ${item.grade}` : item.schoolName}</MetaItem>
        </div>
        <StatusTrack status={item.status} />
      </div>
      <Tabs value={tab} onValueChange={setTab} className="edutechbrave:flex edutechbrave:min-h-0 edutechbrave:flex-1 edutechbrave:flex-col">
        <Tabs.List className="edutechbrave:px-5">
          <Tabs.Trigger value="overview">Тойм</Tabs.Trigger>
          {hasProtocol && (
            <Tabs.Trigger value="protocol">
              Протокол
              {pendingSteps > 0 && (
                <Badge variant="destructive" className="edutechbrave:ml-1">
                  {pendingSteps}
                </Badge>
              )}
            </Tabs.Trigger>
          )}
          <Tabs.Trigger value="evidence">Нотлох баримт</Tabs.Trigger>
          <Tabs.Trigger value="timeline">Түүх</Tabs.Trigger>
        </Tabs.List>
        <div className="edutechbrave:flex-1 edutechbrave:overflow-y-auto">
          <Tabs.Content value="overview" className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-5 edutechbrave:p-5">
            <CaseWorkflowCard item={item} access={access} onOpenProtocol={() => setTab("protocol")} />
            <CaseOverviewTab item={item} />
          </Tabs.Content>
          {hasProtocol && (
            <Tabs.Content value="protocol" className="edutechbrave:p-5">
              <CaseProtocolTab item={item} access={access} onDeclare={showOverview} />
            </Tabs.Content>
          )}
          <Tabs.Content value="evidence" className="edutechbrave:p-5">
            <CaseEvidenceTab item={item} access={access} onDeclare={showOverview} />
          </Tabs.Content>
          <Tabs.Content value="timeline" className="edutechbrave:p-5">
            <CaseTimelineTab item={item} access={access} onDeclare={showOverview} />
          </Tabs.Content>
        </div>
      </Tabs>
    </div>
  );
};

// The detail opens from anywhere (list, dashboard) through `?caseId=`, so a
// case link can be shared and the browser back button closes it.
export const CaseDetailSheet = () => {
  const [caseId, setCaseId] = useQueryState<string>("caseId");
  const id = caseId === null || caseId === undefined ? "" : String(caseId);

  return (
    <Sheet
      open={Boolean(id)}
      onOpenChange={(next) => {
        if (!next) {
          setCaseId(null);
        }
      }}
    >
      <Sheet.View className="edutechbrave:w-full edutechbrave:p-0 edutechbrave:sm:max-w-3xl">
        {id ? <CaseDetailBody key={id} caseId={id} /> : null}
      </Sheet.View>
    </Sheet>
  );
};
