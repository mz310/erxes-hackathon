import { useMutation } from "@apollo/client";
import { IconAlertOctagon, IconCircleCheck } from "@tabler/icons-react";
import { Alert, Checkbox, cn } from "erxes-ui";
import { MembersInline } from "ui-modules";
import { asProtocolStepKey } from "../../shared/enums";
import { formatDateTime } from "../../shared/format";
import { PROTOCOL_STEP_HINTS, PROTOCOL_STEP_LABELS } from "../../shared/labels";
import { CASE_COMPLETE_STEP_MUTATION } from "../graphql";
import { CaseGateNotice } from "./CaseGateNotice";
import { CASE_REFETCH, notifyError, notifySuccess, type CaseAccess, type CaseDetail } from "./shared";

// The emergency checklist runs regardless of school management: the case
// cannot be resolved until every step is recorded with who and when.
export const CaseProtocolTab = ({
  item,
  access,
  onDeclare,
}: {
  item: CaseDetail;
  access: CaseAccess;
  onDeclare: () => void;
}) => {
  const [complete, { loading }] = useMutation(CASE_COMPLETE_STEP_MUTATION, {
    refetchQueries: CASE_REFETCH,
    onError: notifyError,
    onCompleted: () => notifySuccess("Алхам тэмдэглэгдлээ"),
  });
  const done = item.protocolSteps.filter((step) => step.doneAt).length;
  const allDone = done === item.protocolSteps.length;

  return (
    <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-4">
      <Alert variant={allDone ? "default" : "destructive"}>
        {allDone ? <IconCircleCheck /> : <IconAlertOctagon />}
        <Alert.Title>
          Яаралтай протокол: {done}/{item.protocolSteps.length} хийгдсэн
        </Alert.Title>
        <Alert.Description>
          Эдгээр алхмыг сургуулийн удирдлагын шийдвэрээс үл хамааран заавал хийнэ. Бүгд хийгдэхээс өмнө
          хэргийг «Шийдвэрлэсэн» болгохгүй.
        </Alert.Description>
      </Alert>
      <CaseGateNotice access={access} onDeclare={onDeclare} />
      <ol className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
        {item.protocolSteps.map((step, index) => {
          const key = asProtocolStepKey(step.key);
          const isDone = Boolean(step.doneAt);
          return (
            <li
              key={step.key}
              className={cn(
                "edutechbrave:flex edutechbrave:gap-3 edutechbrave:rounded-lg edutechbrave:border edutechbrave:border-border edutechbrave:p-4",
                isDone && "edutechbrave:bg-muted",
              )}
            >
              <Checkbox
                id={`etb-step-${step.key}`}
                checked={isDone}
                disabled={isDone || loading || !key || access !== "ok"}
                onCheckedChange={(checked) => {
                  if (checked === true && key) {
                    void complete({ variables: { _id: item._id, key } });
                  }
                }}
                className="edutechbrave:mt-0.5"
              />
              <div className="edutechbrave:flex edutechbrave:flex-1 edutechbrave:flex-col edutechbrave:gap-1">
                <label
                  htmlFor={`etb-step-${step.key}`}
                  className={cn(
                    "edutechbrave:text-sm edutechbrave:font-medium",
                    isDone && "edutechbrave:text-muted-foreground edutechbrave:line-through",
                  )}
                >
                  {index + 1}. {PROTOCOL_STEP_LABELS[step.key]}
                </label>
                <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
                  {PROTOCOL_STEP_HINTS[step.key]}
                </p>
                {isDone && (
                  <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:gap-2 edutechbrave:text-xs edutechbrave:text-muted-foreground">
                    <span>{formatDateTime(step.doneAt)}</span>
                    {step.doneBy && <MembersInline memberIds={[step.doneBy]} size="sm" />}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
