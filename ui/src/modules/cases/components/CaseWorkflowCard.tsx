import { useMutation } from "@apollo/client";
import {
  IconAlertOctagon,
  IconCircle,
  IconCircleCheckFilled,
  IconCircleDot,
  IconLock,
  IconShieldCheck,
  IconShieldX,
  IconUserCheck,
} from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useState, type ReactNode } from "react";
import { Button, Card, Textarea, cn } from "erxes-ui";
import { SelectMember, currentUserState } from "ui-modules";
import { asCaseStatus, asProtocolStepKey } from "../../shared/enums";
import { formatDateTime } from "../../shared/format";
import {
  NEXT_STATUSES,
  PROTOCOL_STEP_HINTS,
  PROTOCOL_STEP_LABELS,
  STATUS_LABELS,
  statusActionLabel,
} from "../../shared/labels";
import {
  CASE_ASSIGN_MUTATION,
  CASE_CHANGE_STATUS_MUTATION,
  CASE_COMPLETE_STEP_MUTATION,
  CASE_DECLARE_CONFLICT_MUTATION,
} from "../graphql";
import { isOpenStatus } from "./badges";
import { MemberName } from "./MemberName";
import {
  CASE_REFETCH,
  latestDeclarationFor,
  notifyError,
  notifySuccess,
  type CaseAccess,
  type CaseDetail,
} from "./shared";

// «Ажлын явц»: every action a handler takes on a case, as one ordered
// checklist (declare → assign → emergency protocol → decision). The first
// unfinished step is highlighted, so the next thing to do is always visible;
// later steps stay usable because the API does not force this order, except
// that nothing works without a "no conflict" declaration.

type StepState = "done" | "current" | "todo" | "blocked" | "urgent" | "conflict";

const STEP_ICONS: Record<StepState, ReactNode> = {
  done: <IconCircleCheckFilled className="edutechbrave:size-5 edutechbrave:text-success" />,
  current: <IconCircleDot className="edutechbrave:size-5 edutechbrave:text-primary" />,
  todo: <IconCircle className="edutechbrave:size-5 edutechbrave:text-muted-foreground" />,
  blocked: <IconLock className="edutechbrave:size-5 edutechbrave:text-muted-foreground" />,
  urgent: <IconAlertOctagon className="edutechbrave:size-5 edutechbrave:text-destructive" />,
  conflict: <IconShieldX className="edutechbrave:size-5 edutechbrave:text-destructive" />,
};

const STATE_LABELS: Record<StepState, string> = {
  done: "хийгдсэн",
  current: "дараагийн алхам",
  todo: "хийгдээгүй",
  blocked: "мэдүүлгийн дараа",
  urgent: "яаралтай",
  conflict: "холбоотой",
};

const Step = ({
  state,
  title,
  summary,
  action,
  children,
}: {
  state: StepState;
  title: string;
  summary?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) => (
  <li
    className={cn(
      "edutechbrave:flex edutechbrave:gap-3 edutechbrave:px-4 edutechbrave:py-3",
      (state === "current" || state === "urgent") && "edutechbrave:bg-accent",
    )}
  >
    <span className="edutechbrave:mt-px edutechbrave:shrink-0" aria-hidden>
      {STEP_ICONS[state]}
    </span>
    <div className="edutechbrave:flex edutechbrave:min-w-0 edutechbrave:flex-1 edutechbrave:flex-col edutechbrave:gap-2">
      <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-start edutechbrave:justify-between edutechbrave:gap-x-3 edutechbrave:gap-y-1">
        <div className="edutechbrave:flex edutechbrave:min-w-0 edutechbrave:flex-col edutechbrave:gap-0.5">
          <span className="edutechbrave:text-sm edutechbrave:font-medium">
            {title}
            <span className="edutechbrave:sr-only"> ({STATE_LABELS[state]})</span>
          </span>
          {summary && (
            <div className="edutechbrave:text-sm edutechbrave:text-muted-foreground">{summary}</div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  </li>
);

const DeclarationStep = ({ item, access, state }: { item: CaseDetail; access: CaseAccess; state: StepState }) => {
  const currentUser = useAtomValue(currentUserState);
  const latest = latestDeclarationFor(item.conflictDeclarations, currentUser?._id);
  const [editing, setEditing] = useState(false);
  const [confirmingConflict, setConfirmingConflict] = useState(false);
  const [note, setNote] = useState("");
  const [declare, { loading }] = useMutation(CASE_DECLARE_CONFLICT_MUTATION, {
    refetchQueries: CASE_REFETCH,
    onError: notifyError,
    onCompleted: () => {
      setNote("");
      setEditing(false);
      setConfirmingConflict(false);
      notifySuccess("Мэдүүлэг бүртгэгдлээ");
    },
  });

  const submit = (hasConflict: boolean) =>
    declare({ variables: { _id: item._id, hasConflict, note: note.trim() || null } });

  const asking = access === "undeclared" || editing;
  const total = item.conflictDeclarations.length;
  const withConflict = item.conflictDeclarations.filter((declaration) => declaration.hasConflict).length;

  const summary =
    access === "undeclared"
      ? "Энэ хэрэг дээр ажиллахаас өмнө заавал өгнө."
      : access === "conflict"
        ? `Та холбоотой гэж мэдүүлсэн (${formatDateTime(latest?.declaredAt)}). Энэ хэргийг зөвхөн харна.`
        : `Холбоогүй гэж мэдүүлсэн (${formatDateTime(latest?.declaredAt)})`;

  return (
    <Step
      state={state}
      title="Ашиг сонирхлын мэдүүлэг"
      summary={summary}
      action={
        !asking ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Өөрчлөх
          </Button>
        ) : undefined
      }
    >
      {asking &&
        (confirmingConflict ? (
          <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
            <Textarea
              rows={2}
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ямар холбоотойг товч бичнэ үү (заавал биш)"
              aria-label="Холбооны тайлбар"
            />
            <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
              Холбоотой гэж мэдүүлбэл та энэ хэргийн хариуцагч болохгүй, шийдвэр гаргахгүй.
              {item.assigneeId && item.assigneeId === currentUser?._id ? " Таныг хариуцагчаас чөлөөлнө." : ""}
            </p>
            <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:gap-2">
              <Button variant="destructive" size="sm" disabled={loading} onClick={() => void submit(true)}>
                <IconShieldX />
                Холбоотой гэж мэдүүлэх
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingConflict(false)}>
                Буцах
              </Button>
            </div>
          </div>
        ) : (
          <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
            <p className="edutechbrave:text-sm">
              Та буруутгагдагчтай гэр бүл, хамаатан садан, ажлын шууд удирдлага-харьяалал эсвэл санхүүгийн
              холбоотой юу?
            </p>
            <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:gap-2">
              <Button size="sm" disabled={loading} onClick={() => void submit(false)}>
                <IconShieldCheck />
                Үгүй, холбоогүй
              </Button>
              <Button variant="outline" size="sm" disabled={loading} onClick={() => setConfirmingConflict(true)}>
                Тийм, холбоотой
              </Button>
              {editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Болих
                </Button>
              )}
            </div>
          </div>
        ))}
      {!asking && total > 1 && (
        <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
          Энэ хэрэгт нийт {total} мэдүүлэг, үүнээс {withConflict} нь холбоотой.
        </p>
      )}
    </Step>
  );
};

const AssigneeStep = ({ item, access, state }: { item: CaseDetail; access: CaseAccess; state: StepState }) => {
  const currentUser = useAtomValue(currentUserState);
  const [changing, setChanging] = useState(false);
  // Remount the picker after a refused assignment so it shows the real
  // assignee again instead of the rejected choice.
  const [resetKey, setResetKey] = useState(0);
  const [assign, { loading }] = useMutation(CASE_ASSIGN_MUTATION, {
    refetchQueries: CASE_REFETCH,
    onError: (error) => {
      notifyError(error);
      setResetKey((key) => key + 1);
    },
    onCompleted: () => {
      setChanging(false);
      notifySuccess("Хариуцагч томилогдлоо");
    },
  });

  const canAct = access === "ok";
  const assigned = Boolean(item.assigneeId);
  const isMine = Boolean(currentUser?._id) && item.assigneeId === currentUser?._id;
  const assignTo = (assigneeId: string) => {
    if (assigneeId && assigneeId !== item.assigneeId && !loading) {
      void assign({ variables: { _id: item._id, assigneeId } });
    }
  };

  return (
    <Step
      state={state}
      title="Хариуцагч"
      summary={
        item.assigneeId ? (
          <MemberName id={item.assigneeId} />
        ) : canAct ? (
          "Хэргийг хэн хариуцахыг сонгоно."
        ) : (
          "Мэдүүлэг өгсний дараа томилно."
        )
      }
      action={
        assigned && canAct && !changing ? (
          <Button variant="ghost" size="sm" onClick={() => setChanging(true)}>
            Солих
          </Button>
        ) : undefined
      }
    >
      {canAct && (!assigned || changing) && (
        <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:gap-2">
          {!isMine && currentUser?._id && (
            <Button size="sm" disabled={loading} onClick={() => assignTo(currentUser._id)}>
              <IconUserCheck />
              Өөрөө хариуцах
            </Button>
          )}
          <div className="edutechbrave:min-w-56 edutechbrave:flex-1">
            <SelectMember
              key={`${item.assigneeId ?? "none"}-${resetKey}`}
              value={item.assigneeId ?? undefined}
              placeholder="Өөр ажилтан сонгох"
              onValueChange={(value) => {
                if (typeof value === "string") {
                  assignTo(value);
                }
              }}
            />
          </div>
          {changing && (
            <Button variant="ghost" size="sm" onClick={() => setChanging(false)}>
              Болих
            </Button>
          )}
        </div>
      )}
    </Step>
  );
};

const ProtocolStep = ({
  item,
  access,
  state,
  onOpenProtocol,
}: {
  item: CaseDetail;
  access: CaseAccess;
  state: StepState;
  onOpenProtocol: () => void;
}) => {
  const [complete, { loading }] = useMutation(CASE_COMPLETE_STEP_MUTATION, {
    refetchQueries: CASE_REFETCH,
    onError: notifyError,
    onCompleted: () => notifySuccess("Алхам тэмдэглэгдлээ"),
  });
  const steps = item.protocolSteps;
  const done = steps.filter((step) => step.doneAt).length;
  const next = steps.find((step) => !step.doneAt);
  const nextKey = next ? asProtocolStepKey(next.key) : undefined;

  return (
    <Step
      state={state}
      title="Яаралтай протокол"
      summary={next ? `${done}/${steps.length} алхам хийгдсэн. Бүгд хийгдэхээс өмнө хэргийг хаахгүй.` : `${steps.length} алхам бүгд хийгдсэн`}
      action={
        <Button variant="ghost" size="sm" onClick={onOpenProtocol}>
          Бүх алхам
        </Button>
      }
    >
      {next && (
        <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1.5 edutechbrave:rounded-md edutechbrave:border edutechbrave:border-border edutechbrave:bg-background edutechbrave:p-3">
          <span className="edutechbrave:text-sm edutechbrave:font-medium">
            {done + 1}. {PROTOCOL_STEP_LABELS[next.key] ?? next.key}
          </span>
          <span className="edutechbrave:text-xs edutechbrave:text-muted-foreground">{PROTOCOL_STEP_HINTS[next.key]}</span>
          <div className="edutechbrave:pt-1">
            <Button
              size="sm"
              disabled={access !== "ok" || loading || !nextKey}
              onClick={() => {
                if (nextKey) {
                  void complete({ variables: { _id: item._id, key: nextKey } });
                }
              }}
            >
              Хийгдсэн гэж тэмдэглэх
            </Button>
          </div>
        </div>
      )}
    </Step>
  );
};

const DecisionStep = ({ item, access, state }: { item: CaseDetail; access: CaseAccess; state: StepState }) => {
  const [note, setNote] = useState("");
  const [reopening, setReopening] = useState(false);
  const [changeStatus, { loading }] = useMutation(CASE_CHANGE_STATUS_MUTATION, {
    refetchQueries: CASE_REFETCH,
    onError: notifyError,
    onCompleted: (data) => {
      setNote("");
      setReopening(false);
      notifySuccess("Төлөв шинэчлэгдлээ", STATUS_LABELS[data.eduTechBraveCaseChangeStatus.status]);
    },
  });
  const closed = !isOpenStatus(item.status);
  const next = NEXT_STATUSES[item.status] ?? [];
  const protocolPending = item.protocolSteps.some((step) => !step.doneAt);
  const canAct = access === "ok";
  const showForm = canAct && (!closed || reopening);

  return (
    <Step
      state={state}
      title="Шийдвэр"
      summary={
        closed
          ? `${STATUS_LABELS[item.status] ?? item.status}${item.resolvedAt ? ` (${formatDateTime(item.resolvedAt)})` : ""}`
          : `Одоогийн төлөв: ${STATUS_LABELS[item.status] ?? item.status}`
      }
      action={
        closed && canAct && !reopening ? (
          <Button variant="ghost" size="sm" onClick={() => setReopening(true)}>
            Дахин нээх
          </Button>
        ) : undefined
      }
    >
      {closed && item.resolution && (
        <div className="edutechbrave:whitespace-pre-wrap edutechbrave:rounded-md edutechbrave:bg-muted edutechbrave:p-3 edutechbrave:text-sm">
          {item.resolution}
        </div>
      )}
      {showForm && (
        <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
          <Textarea
            rows={2}
            value={note}
            maxLength={2000}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              next.includes("resolved")
                ? "Ямар шийдвэр гарсан, ямар арга хэмжээ авсан"
                : "Тайлбар (заавал биш)"
            }
            aria-label="Төлөвийн тайлбар"
          />
          <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
            Тайлбар дотоод түүхэнд үлдэнэ. Мэдэгдэгч зөвхөн шинэ төлвийг харна.
          </p>
          <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:gap-2">
            {next.map((target) => {
              const status = asCaseStatus(target);
              const blocked = target === "resolved" && protocolPending;
              return (
                <Button
                  key={target}
                  size="sm"
                  variant={target === "dismissed" ? "outline" : "default"}
                  disabled={loading || blocked || !status}
                  onClick={() => {
                    if (status) {
                      void changeStatus({ variables: { _id: item._id, status, note: note.trim() || null } });
                    }
                  }}
                >
                  {statusActionLabel(item.status, target)}
                </Button>
              );
            })}
            {reopening && (
              <Button variant="ghost" size="sm" onClick={() => setReopening(false)}>
                Болих
              </Button>
            )}
          </div>
          {next.includes("resolved") && protocolPending && (
            <p className="edutechbrave:text-xs edutechbrave:text-destructive">
              Яаралтай протоколын бүх алхам хийгдээгүй тул «Шийдвэрлэсэн» болгох боломжгүй.
            </p>
          )}
        </div>
      )}
    </Step>
  );
};

export const CaseWorkflowCard = ({
  item,
  access,
  onOpenProtocol,
}: {
  item: CaseDetail;
  access: CaseAccess;
  onOpenProtocol: () => void;
}) => {
  const hasProtocol = item.protocolSteps.length > 0;
  const protocolDone = item.protocolSteps.every((step) => step.doneAt);
  const closed = !isOpenStatus(item.status);

  // Which steps are finished, in order; the first unfinished one is "current".
  const finished = {
    declaration: access === "ok",
    assignee: Boolean(item.assigneeId),
    protocol: protocolDone,
    decision: closed,
  };
  const order = (["declaration", "assignee", "protocol", "decision"] as const).filter(
    (key) => key !== "protocol" || hasProtocol,
  );
  const firstOpen = order.find((key) => !finished[key]);

  const stateOf = (key: (typeof order)[number]): StepState => {
    if (key === "declaration") {
      return access === "conflict" ? "conflict" : finished.declaration ? "done" : "current";
    }
    if (access !== "ok") {
      return finished[key] ? "done" : "blocked";
    }
    if (finished[key]) {
      return "done";
    }
    if (key === "protocol") {
      return "urgent";
    }
    return key === firstOpen ? "current" : "todo";
  };

  return (
    <Card>
      <Card.Header className="edutechbrave:pb-2">
        <Card.Title className="edutechbrave:text-sm">Ажлын явц</Card.Title>
        <Card.Description>Хийх зүйлс дарааллаараа. Үйлдэл бүр түүхэнд үлдэж, засагдахгүй.</Card.Description>
      </Card.Header>
      <ol className="edutechbrave:flex edutechbrave:flex-col edutechbrave:divide-y edutechbrave:divide-border edutechbrave:border-t edutechbrave:border-border">
        <DeclarationStep item={item} access={access} state={stateOf("declaration")} />
        <AssigneeStep item={item} access={access} state={stateOf("assignee")} />
        {hasProtocol && (
          <ProtocolStep item={item} access={access} state={stateOf("protocol")} onOpenProtocol={onOpenProtocol} />
        )}
        <DecisionStep item={item} access={access} state={stateOf("decision")} />
      </ol>
    </Card>
  );
};
