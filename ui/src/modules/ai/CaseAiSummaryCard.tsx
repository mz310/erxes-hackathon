import { useMutation } from "@apollo/client";
import { IconFileDescription, IconSparkles } from "@tabler/icons-react";
import { Button, Card } from "erxes-ui";
import { AI_SUMMARIZE_CASE_MUTATION } from "./graphql";
import { AiStatusError, notifyAiError, useAiStatus } from "./shared";

// A short brief of the case and its timeline, e.g. for the supervisor who
// receives an escalated case. Shown, never stored; the timeline records only
// that a brief was made.
export const CaseAiSummaryCard = ({ item }: { item: { _id: string; escalationLevel: number } }) => {
  const ai = useAiStatus();
  const [summarize, { data, loading }] = useMutation(AI_SUMMARIZE_CASE_MUTATION, {
    refetchQueries: ["eduTechBraveCaseEvents"],
    onError: notifyAiError,
  });
  const result = data?.eduTechBraveAiSummarizeCase;

  if (ai.loading) {
    return null;
  }
  if (ai.error) {
    return <AiStatusError />;
  }
  if (!ai.enabled) {
    return null;
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-2 edutechbrave:text-sm">
          <IconFileDescription className="edutechbrave:size-4" />
          Товч дүгнэлт
        </Card.Title>
        <Card.Description>
          {item.escalationLevel > 0
            ? "Дээд шатанд шилжсэн хэргийг хурдан танилцуулах товч дүгнэлт."
            : "Хэрэг, түүний түүхийн товч дүгнэлт."}
        </Card.Description>
      </Card.Header>
      <Card.Content className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3">
        <Button
          variant="outline"
          className="edutechbrave:self-start"
          disabled={loading}
          onClick={() => void summarize({ variables: { _id: item._id } })}
        >
          <IconSparkles />
          {loading ? "Гаргаж байна…" : result ? "Дахин гаргах" : "AI-аар товч дүгнэлт гаргах"}
        </Button>
        {result ? (
          <div className="edutechbrave:rounded-md edutechbrave:bg-muted edutechbrave:p-3">
            <p className="edutechbrave:whitespace-pre-wrap edutechbrave:text-sm edutechbrave:leading-relaxed">
              {result.summary}
            </p>
            <p className="edutechbrave:mt-2 edutechbrave:text-xs edutechbrave:text-muted-foreground">
              AI гаргасан — эх мэдээлэл, түүхтэй тулгаж шалгана уу. Хадгалагдахгүй. Загвар: {result.model}
            </p>
          </div>
        ) : (
          !loading && (
            <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
              Дүгнэлт гаргаагүй байна.
            </p>
          )
        )}
      </Card.Content>
    </Card>
  );
};
