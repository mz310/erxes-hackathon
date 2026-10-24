import { useMutation } from "@apollo/client";
import { IconSparkles } from "@tabler/icons-react";
import { Button } from "erxes-ui";
import type {
  EduTechBraveAccusedRole,
  EduTechBraveCaseCategory,
  EduTechBraveCaseSeverity,
  EduTechBraveVictimRole,
} from "~/gql/graphql";
import { AI_TRIAGE_DRAFT_MUTATION } from "./graphql";
import { AiStatusError, AiTriageResult, notifyAiError, useAiStatus } from "./shared";

const MIN_DESCRIPTION = 10;

// Staff intake form: suggest a category and severity from what was typed,
// before the case exists. Nothing is stored; "Хэрэглэх" only fills the form.
export const AiDraftTriage = ({
  title,
  description,
  incidentLocation,
  victimRole,
  accusedRole,
  accusedDescription,
  onApply,
}: {
  title: string;
  description: string;
  incidentLocation?: string;
  victimRole?: EduTechBraveVictimRole;
  accusedRole?: EduTechBraveAccusedRole;
  accusedDescription?: string;
  onApply: (category: EduTechBraveCaseCategory, severity: EduTechBraveCaseSeverity) => void;
}) => {
  const ai = useAiStatus();
  const [suggest, { data, loading, reset }] = useMutation(AI_TRIAGE_DRAFT_MUTATION, {
    onError: notifyAiError,
  });
  const suggestion = data?.eduTechBraveAiTriageDraft;

  if (ai.loading) {
    return null;
  }
  if (ai.error) {
    return <AiStatusError />;
  }
  if (!ai.enabled) {
    return null;
  }

  const tooShort = description.trim().length < MIN_DESCRIPTION;

  return (
    <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="edutechbrave:self-start"
        disabled={loading || tooShort}
        title={tooShort ? "Эхлээд юу болсныг 10-аас дээш тэмдэгтээр бичнэ үү" : undefined}
        onClick={() =>
          void suggest({
            variables: {
              input: {
                title: title.trim(),
                description: description.trim(),
                incidentLocation: incidentLocation?.trim() || null,
                victimRole: victimRole ?? null,
                accusedRole: accusedRole ?? null,
                accusedDescription: accusedDescription?.trim() || null,
              },
            },
          })
        }
      >
        <IconSparkles />
        {loading ? "Шинжилж байна…" : "AI-аар ангилал санал болгох"}
      </Button>
      {suggestion && (
        <AiTriageResult
          triage={suggestion}
          action={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="edutechbrave:self-start"
              onClick={() => {
                onApply(suggestion.category, suggestion.severity);
                reset();
              }}
            >
              Хэрэглэх
            </Button>
          }
        />
      )}
    </div>
  );
};
