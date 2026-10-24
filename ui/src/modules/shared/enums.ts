import type {
  EduTechBraveAccusedRole,
  EduTechBraveCaseCategory,
  EduTechBraveCaseSeverity,
  EduTechBraveCaseStatus,
  EduTechBraveEvidenceKind,
  EduTechBraveProtocolStepKey,
  EduTechBraveReporterRole,
  EduTechBraveVictimRole,
} from "~/gql/graphql";

// Narrow free-form strings (URL query state, <select> values) to the
// generated GraphQL enum unions without casting.
const narrow =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): T | undefined =>
    values.find((item) => item === value);

export const asCaseStatus = narrow<EduTechBraveCaseStatus>([
  "new",
  "under_review",
  "investigating",
  "resolved",
  "dismissed",
]);

export const asCaseSeverity = narrow<EduTechBraveCaseSeverity>(["low", "medium", "high", "critical"]);

export const asCaseCategory = narrow<EduTechBraveCaseCategory>([
  "physical_violence",
  "psychological_violence",
  "bullying",
  "sexual_harassment",
  "discrimination",
  "neglect_of_duty",
  "teacher_labor_rights",
  "unfair_assessment",
  "privacy_breach",
  "other",
]);

export const asReporterRole = narrow<EduTechBraveReporterRole>([
  "student",
  "parent",
  "teacher",
  "staff",
  "other",
]);

export const asVictimRole = narrow<EduTechBraveVictimRole>(["student", "teacher", "staff", "other"]);

export const asAccusedRole = narrow<EduTechBraveAccusedRole>([
  "teacher",
  "administrator",
  "student",
  "staff",
  "other",
]);

export const asEvidenceKind = narrow<EduTechBraveEvidenceKind>([
  "photo",
  "medical_record",
  "witness_statement",
  "document",
  "other",
]);

export const asProtocolStepKey = narrow<EduTechBraveProtocolStepKey>([
  "medical_aid",
  "notify_guardian",
  "separate_accused",
  "report_authority",
]);
