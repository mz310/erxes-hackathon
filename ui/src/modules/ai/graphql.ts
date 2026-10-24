import { gql } from "~/gql";

// AI assistant (Gemma) and case reclassification. Static documents only:
// codegen validates them against the API schema.

export const AI_STATUS_QUERY = gql(`
  query eduTechBraveAiStatus {
    eduTechBraveAiStatus {
      enabled
      provider
      model
      publicPrivacyCheck
    }
  }
`);

export const AI_TRIAGE_DRAFT_MUTATION = gql(`
  mutation eduTechBraveAiTriageDraft($input: EduTechBraveAiTriageInput!) {
    eduTechBraveAiTriageDraft(input: $input) {
      category
      severity
      urgent
      protocolRecommended
      reasons
      model
    }
  }
`);

export const AI_TRIAGE_CASE_MUTATION = gql(`
  mutation eduTechBraveAiTriageCase($_id: String!) {
    eduTechBraveAiTriageCase(_id: $_id) {
      category
      severity
      urgent
      protocolRecommended
      reasons
      model
    }
  }
`);

export const AI_SUMMARIZE_CASE_MUTATION = gql(`
  mutation eduTechBraveAiSummarizeCase($_id: String!) {
    eduTechBraveAiSummarizeCase(_id: $_id) {
      summary
      model
    }
  }
`);

export const CASE_RECLASSIFY_MUTATION = gql(`
  mutation eduTechBraveCaseReclassify(
    $_id: String!
    $category: EduTechBraveCaseCategory!
    $severity: EduTechBraveCaseSeverity!
    $note: String!
  ) {
    eduTechBraveCaseReclassify(_id: $_id, category: $category, severity: $severity, note: $note) {
      _id
      category
      severity
      dueAt
      isOverdue
      protocolSteps {
        key
        doneAt
        doneBy
      }
    }
  }
`);
