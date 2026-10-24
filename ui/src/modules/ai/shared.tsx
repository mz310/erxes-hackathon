import { useQuery } from "@apollo/client";
import { IconAlertTriangle, IconSparkles } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Alert, Badge, toast } from "erxes-ui";
import type { EduTechBraveAiTriageCaseMutation } from "~/gql/graphql";
import { CATEGORY_LABELS, SEVERITY_BADGE, SEVERITY_LABELS } from "../shared/labels";
import { AI_STATUS_QUERY } from "./graphql";

export type AiTriage = EduTechBraveAiTriageCaseMutation["eduTechBraveAiTriageCase"];

// Operation names refetched after anything that writes a case event.
export const AI_CASE_REFETCH = [
  "eduTechBraveCaseDetail",
  "eduTechBraveCaseEvents",
  "eduTechBraveCases",
  "eduTechBraveCaseStats",
];

export const AI_DISCLAIMER = "AI-ийн санал. Шийдвэрийг та гаргана.";

export const notifyAiError = (error: unknown): void => {
  toast({
    title: "AI туслах",
    description: error instanceof Error ? error.message : String(error),
    variant: "destructive",
  });
};

// Loading → hidden, error → a quiet note, off → hidden. The assistant is an
// extra: the case screens work the same without it.
export const useAiStatus = () => {
  const { data, loading, error } = useQuery(AI_STATUS_QUERY, { fetchPolicy: "cache-first" });
  const status = data?.eduTechBraveAiStatus;
  return { enabled: Boolean(status?.enabled), model: status?.model ?? null, loading, error };
};

export const AiStatusError = () => (
  <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
    AI туслахын төлөвийг ачаалж чадсангүй.
  </p>
);

export const AiTriageResult = ({
  triage,
  hasProtocol,
  action,
}: {
  triage: AiTriage;
  hasProtocol?: boolean;
  action?: ReactNode;
}) => (
  <Alert variant={triage.urgent ? "destructive" : "default"}>
    {triage.urgent ? <IconAlertTriangle /> : <IconSparkles />}
    <Alert.Title className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:gap-2">
      AI санал:
      <Badge variant="secondary">{CATEGORY_LABELS[triage.category] ?? triage.category}</Badge>
      <Badge variant={SEVERITY_BADGE[triage.severity] ?? "secondary"}>
        {SEVERITY_LABELS[triage.severity] ?? triage.severity}
      </Badge>
      {triage.urgent && <Badge variant="destructive">Яаралтай</Badge>}
    </Alert.Title>
    <Alert.Description className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
      {triage.reasons && <span>{triage.reasons}</span>}
      {triage.protocolRecommended && hasProtocol === false && (
        <span className="edutechbrave:font-medium">
          Яаралтай протокол шаардлагатай байж магадгүй — ангиллыг шалгана уу.
        </span>
      )}
      <span className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
        {AI_DISCLAIMER} Загвар: {triage.model}
      </span>
      {action}
    </Alert.Description>
  </Alert>
);
