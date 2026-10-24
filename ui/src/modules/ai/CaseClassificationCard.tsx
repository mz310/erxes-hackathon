import { useMutation } from "@apollo/client";
import { IconCategory, IconSparkles } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { Button, Card, Label, Select, Textarea, toast } from "erxes-ui";
import { currentUserState } from "ui-modules";
import { caseAccessFor, type ConflictDeclarationView } from "../cases/components/shared";
import type {
  EduTechBraveCaseCategory,
  EduTechBraveCaseSeverity,
  EduTechBraveCaseStatus,
} from "~/gql/graphql";
import { asCaseCategory, asCaseSeverity } from "../shared/enums";
import { CATEGORY_LABELS, CATEGORY_OPTIONS, SEVERITY_LABELS, SEVERITY_OPTIONS } from "../shared/labels";
import { AI_TRIAGE_CASE_MUTATION, CASE_RECLASSIFY_MUTATION } from "./graphql";
import { AI_CASE_REFETCH, AiStatusError, AiTriageResult, notifyAiError, useAiStatus } from "./shared";

// Only the fields this card needs, so any case query that selects them fits.
export type ClassificationCase = {
  _id: string;
  category: EduTechBraveCaseCategory;
  severity: EduTechBraveCaseSeverity;
  status: EduTechBraveCaseStatus;
  protocolSteps: readonly unknown[];
  conflictDeclarations: ConflictDeclarationView[];
};

const OPEN = ["new", "under_review", "investigating"];
const SEVERITY_RANK: EduTechBraveCaseSeverity[] = ["low", "medium", "high", "critical"];

const higherSeverity = (
  a: EduTechBraveCaseSeverity,
  b: EduTechBraveCaseSeverity,
): EduTechBraveCaseSeverity => (SEVERITY_RANK.indexOf(b) > SEVERITY_RANK.indexOf(a) ? b : a);
const MIN_NOTE = 3;

// Fix a wrong category or severity (often from the public page), optionally
// starting from the AI's suggestion. The API only tightens: the protocol is
// added, never removed; the deadline moves earlier, never later.
export const CaseClassificationCard = ({ item }: { item: ClassificationCase }) => {
  const ai = useAiStatus();
  const currentUser = useAtomValue(currentUserState);
  // The API enforces the conflict gate; this only explains a disabled form.
  const access = caseAccessFor(item.conflictDeclarations, currentUser?._id);
  const [category, setCategory] = useState<EduTechBraveCaseCategory>(item.category);
  const [severity, setSeverity] = useState<EduTechBraveCaseSeverity>(item.severity);
  const [note, setNote] = useState("");

  const [reclassify, { loading: saving }] = useMutation(CASE_RECLASSIFY_MUTATION, {
    refetchQueries: AI_CASE_REFETCH,
    onError: (error) =>
      toast({ title: "Алдаа", description: error.message, variant: "destructive" }),
    onCompleted: () => {
      setNote("");
      toast({ title: "Ангилал шинэчлэгдлээ", variant: "success" });
    },
  });

  const [askAi, { data: aiData, loading: asking }] = useMutation(AI_TRIAGE_CASE_MUTATION, {
    refetchQueries: ["eduTechBraveCaseEvents"],
    onError: notifyAiError,
  });
  const suggestion = aiData?.eduTechBraveAiTriageCase;

  const isOpen = OPEN.includes(item.status);
  const changed = category !== item.category || severity !== item.severity;
  const canSave = isOpen && access === "ok" && changed && note.trim().length >= MIN_NOTE && !saving;
  const hasProtocol = item.protocolSteps.length > 0;

  return (
    <Card>
      <Card.Header>
        <Card.Title className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-2 edutechbrave:text-sm">
          <IconCategory className="edutechbrave:size-4" />
          Ангилал
        </Card.Title>
        <Card.Description>
          Одоо: {CATEGORY_LABELS[item.category]} · {SEVERITY_LABELS[item.severity]}. Засахад яаралтай
          протокол нэмэгдэж болох ч хасагдахгүй, шийдвэрлэх хугацаа урагшилж болох ч хойшлохгүй.
        </Card.Description>
      </Card.Header>
      <Card.Content className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3">
        {ai.error && <AiStatusError />}
        {ai.enabled && (
          <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
            <Button
              variant="outline"
              className="edutechbrave:self-start"
              disabled={asking}
              onClick={() => void askAi({ variables: { _id: item._id } })}
            >
              <IconSparkles />
              {asking ? "Шинжилж байна…" : "AI-аар санал авах"}
            </Button>
            {suggestion && (
              <AiTriageResult
                triage={suggestion}
                hasProtocol={hasProtocol}
                action={
                  isOpen && (suggestion.category !== item.category || suggestion.severity !== item.severity) ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="edutechbrave:self-start"
                      onClick={() => {
                        setCategory(suggestion.category);
                        // An AI suggestion never lowers severity; staff can, by hand.
                        setSeverity(higherSeverity(item.severity, suggestion.severity));
                      }}
                    >
                      Саналыг маягтад оруулах
                    </Button>
                  ) : null
                }
              />
            )}
          </div>
        )}
        {isOpen ? (
          <form
            className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSave) {
                void reclassify({
                  variables: { _id: item._id, category, severity, note: note.trim() },
                });
              }
            }}
          >
            <div className="edutechbrave:grid edutechbrave:gap-3 edutechbrave:sm:grid-cols-2">
              <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1.5">
                <Label htmlFor="etb-reclassify-category">Зөрчлийн төрөл</Label>
                <Select
                  value={category}
                  onValueChange={(value) => {
                    const next = asCaseCategory(value);
                    if (next) setCategory(next);
                  }}
                >
                  <Select.Trigger id="etb-reclassify-category">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {CATEGORY_OPTIONS.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1.5">
                <Label htmlFor="etb-reclassify-severity">Ноцтой байдал</Label>
                <Select
                  value={severity}
                  onValueChange={(value) => {
                    const next = asCaseSeverity(value);
                    if (next) setSeverity(next);
                  }}
                >
                  <Select.Trigger id="etb-reclassify-severity">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {SEVERITY_OPTIONS.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </div>
            <Textarea
              rows={2}
              value={note}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Яагаад өөрчилж байгаа шалтгаан (заавал)"
              aria-label="Ангилал өөрчлөх шалтгаан"
            />
            <Button type="submit" className="edutechbrave:self-start" disabled={!canSave}>
              {saving ? "Хадгалж байна…" : "Ангилал засах"}
            </Button>
            {access !== "ok" && (
              <p className="edutechbrave:text-xs edutechbrave:text-destructive">
                {access === "conflict"
                  ? "Та энэ хэрэгт холбоотой гэж мэдүүлсэн тул ангилал засах боломжгүй."
                  : "Ангилал засахаас өмнө «Ажлын явц» хэсэгт ашиг сонирхлын мэдүүлгээ өгнө үү."}
              </p>
            )}
            <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
              Өөрчлөлт, шалтгаан нь түүхэнд үлдэнэ.
            </p>
          </form>
        ) : (
          <p className="edutechbrave:text-sm edutechbrave:text-muted-foreground">
            Хаагдсан хэргийн ангиллыг өөрчлөх боломжгүй. Эхлээд дахин нээнэ үү.
          </p>
        )}
      </Card.Content>
    </Card>
  );
};
