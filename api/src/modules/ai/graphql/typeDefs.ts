// AI assistant (Gemma). Everything it returns is a suggestion for staff or,
// for the public anonymity check, for the reporter; nothing here writes a
// case field. Enum types are shared with the cases module.

export const aiTypes = `
  enum EduTechBraveAiProvider {
    google
    openai
  }

  type EduTechBraveAiStatus {
    enabled: Boolean!
    provider: EduTechBraveAiProvider
    model: String
    publicPrivacyCheck: Boolean!
  }

  type EduTechBraveAiTriage {
    category: EduTechBraveCaseCategory!
    severity: EduTechBraveCaseSeverity!
    urgent: Boolean!
    protocolRecommended: Boolean!
    reasons: String!
    model: String!
  }

  type EduTechBraveAiSummary {
    summary: String!
    model: String!
  }

  type EduTechBraveAiPrivacyRisk {
    quote: String!
    reason: String!
  }

  type EduTechBraveAiPrivacyCheck {
    risks: [EduTechBraveAiPrivacyRisk!]!
    aiChecked: Boolean!
  }

  input EduTechBraveAiTriageInput {
    title: String!
    description: String!
    incidentLocation: String
    victimRole: EduTechBraveVictimRole
    accusedRole: EduTechBraveAccusedRole
    accusedDescription: String
  }

  input EduTechBravePrivacyCheckInput {
    title: String!
    description: String!
    incidentLocation: String
    accusedDescription: String
  }
`;

export const aiQueries = `
  eduTechBraveAiStatus: EduTechBraveAiStatus!
`;

export const aiMutations = `
  eduTechBraveAiTriageDraft(input: EduTechBraveAiTriageInput!): EduTechBraveAiTriage!
  eduTechBraveAiTriageCase(_id: String!): EduTechBraveAiTriage!
  eduTechBraveAiSummarizeCase(_id: String!): EduTechBraveAiSummary!
  eduTechBravePublicPrivacyCheck(input: EduTechBravePrivacyCheckInput!): EduTechBraveAiPrivacyCheck!
`;
