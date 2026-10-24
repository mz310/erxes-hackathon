import { toast } from "erxes-ui";
import type { EduTechBraveCaseDetailQuery } from "~/gql/graphql";

export type CaseDetail = EduTechBraveCaseDetailQuery["eduTechBraveCaseDetail"];

// Every case mutation changes what several views show; refetch the active
// ones by operation name so list, dashboard, detail and timeline stay in step.
export const CASE_REFETCH = [
  "eduTechBraveCaseDetail",
  "eduTechBraveCaseEvents",
  "eduTechBraveCaseEvidence",
  "eduTechBraveCases",
  "eduTechBraveCaseStats",
];

export const notifyError = (error: unknown): void => {
  toast({
    title: "Алдаа",
    description: error instanceof Error ? error.message : String(error),
    variant: "destructive",
  });
};

export const notifySuccess = (title: string, description?: string): void => {
  toast({ title, description, variant: "success" });
};

export type ConflictDeclarationView = CaseDetail["conflictDeclarations"][number];

export const latestDeclarationFor = (
  declarations: ConflictDeclarationView[],
  userId: string | undefined,
): ConflictDeclarationView | undefined =>
  userId
    ? [...declarations]
        .filter((declaration) => declaration.userId === userId)
        .sort((a, b) => new Date(b.declaredAt).getTime() - new Date(a.declaredAt).getTime())[0]
    : undefined;

// Mirrors the API conflict gate: assigning, changing status, notes, protocol
// steps and evidence all need the acting user's latest declaration to say
// "no conflict". The UI uses it to explain the rule before a refused request.
export type CaseAccess = "undeclared" | "conflict" | "ok";

export const caseAccessFor = (
  declarations: ConflictDeclarationView[],
  userId: string | undefined,
): CaseAccess => {
  const latest = latestDeclarationFor(declarations, userId);
  if (!latest) {
    return "undeclared";
  }
  return latest.hasConflict ? "conflict" : "ok";
};
