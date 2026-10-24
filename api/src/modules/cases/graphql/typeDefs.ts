// Every type and operation is prefixed with the plugin name: the gateway
// composes all plugins into one supergraph, so names must be unique across it.
// Dates travel as ISO-8601 strings; the plugin defines its own cursor enum and
// page-info type instead of relying on core's shared scalars.

const reportFields = `
  title: String!
  description: String!
  category: EduTechBraveCaseCategory!
  severity: EduTechBraveCaseSeverity!
  reporterRole: EduTechBraveReporterRole!
  isAnonymous: Boolean!
  reporterContact: String
  victimRole: EduTechBraveVictimRole!
  schoolName: String!
  grade: String
  incidentDate: String!
  incidentLocation: String
  accusedRole: EduTechBraveAccusedRole
  accusedDescription: String
`;

export const caseTypes = `
  enum EduTechBraveCaseStatus {
    new
    under_review
    investigating
    resolved
    dismissed
  }

  enum EduTechBraveCaseCategory {
    physical_violence
    psychological_violence
    bullying
    sexual_harassment
    discrimination
    neglect_of_duty
    teacher_labor_rights
    unfair_assessment
    privacy_breach
    other
  }

  enum EduTechBraveCaseSeverity {
    low
    medium
    high
    critical
  }

  enum EduTechBraveReporterRole {
    student
    parent
    teacher
    staff
    other
  }

  enum EduTechBraveVictimRole {
    student
    teacher
    staff
    other
  }

  enum EduTechBraveAccusedRole {
    teacher
    administrator
    student
    staff
    other
  }

  enum EduTechBraveEvidenceKind {
    photo
    medical_record
    witness_statement
    document
    other
  }

  enum EduTechBraveEventType {
    created
    status_changed
    assigned
    note
    evidence_added
    escalated
    protocol_step
    conflict_declared
    reclassified
    ai_assist
  }

  enum EduTechBraveProtocolStepKey {
    medical_aid
    notify_guardian
    separate_accused
    report_authority
  }

  enum EduTechBraveCaseSource {
    public
    staff
  }

  enum EduTechBraveCursorDirection {
    forward
    backward
  }

  type EduTechBraveConflictDeclaration {
    userId: String!
    hasConflict: Boolean!
    note: String
    declaredAt: String!
  }

  type EduTechBraveProtocolStep {
    key: EduTechBraveProtocolStepKey!
    doneAt: String
    doneBy: String
  }

  type EduTechBraveCase {
    _id: String!
    caseNumber: String!
    title: String!
    description: String!
    category: EduTechBraveCaseCategory!
    severity: EduTechBraveCaseSeverity!
    status: EduTechBraveCaseStatus!
    reporterRole: EduTechBraveReporterRole!
    isAnonymous: Boolean!
    reporterContact: String
    victimRole: EduTechBraveVictimRole!
    schoolName: String!
    grade: String
    incidentDate: String!
    incidentLocation: String
    accusedRole: EduTechBraveAccusedRole
    accusedDescription: String
    source: EduTechBraveCaseSource!
    assigneeId: String
    dueAt: String!
    isOverdue: Boolean!
    escalationLevel: Int!
    escalatedAt: String
    resolvedAt: String
    resolution: String
    trackingCode: String!
    conflictDeclarations: [EduTechBraveConflictDeclaration!]!
    protocolSteps: [EduTechBraveProtocolStep!]!
    createdBy: String
    createdAt: String!
    updatedAt: String!
    isDemo: Boolean!
  }

  type EduTechBraveDemoSeedResult {
    created: Int!
    sampleCaseNumber: String
    sampleTrackingCode: String
    samplePin: String
  }

  type EduTechBravePageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type EduTechBraveCaseList {
    list: [EduTechBraveCase!]!
    totalCount: Int!
    pageInfo: EduTechBravePageInfo!
  }

  type EduTechBraveCaseEvent {
    _id: String!
    caseId: String!
    type: EduTechBraveEventType!
    message: String!
    payloadJson: String
    actorId: String
    isPublic: Boolean!
    createdAt: String!
  }

  type EduTechBraveEvidence {
    _id: String!
    caseId: String!
    kind: EduTechBraveEvidenceKind!
    title: String!
    description: String
    fileUrl: String
    fileName: String
    recordedAt: String!
    addedBy: String!
    createdAt: String!
    checksum: String!
  }

  type EduTechBraveCountBucket {
    key: String!
    count: Int!
  }

  type EduTechBraveCaseStats {
    open: Int!
    overdue: Int!
    escalated: Int!
    critical: Int!
    resolvedLast30Days: Int!
    demoCount: Int!
    byStatus: [EduTechBraveCountBucket!]!
    byCategory: [EduTechBraveCountBucket!]!
    bySeverity: [EduTechBraveCountBucket!]!
  }

  type EduTechBraveSlaHours {
    critical: Int!
    high: Int!
    medium: Int!
    low: Int!
  }

  type EduTechBraveSettings {
    slaHours: EduTechBraveSlaHours!
    organizationName: String!
    escalationLevel1Label: String!
    escalationLevel1Contact: String!
    escalationLevel2Label: String!
    escalationLevel2Contact: String!
    helplineText: String!
    updatedAt: String
    updatedBy: String
  }

  type EduTechBraveReportReceipt {
    caseNumber: String!
    trackingCode: String!
    pin: String!
  }

  type EduTechBravePublicUpdate {
    message: String!
    createdAt: String!
  }

  type EduTechBravePublicCase {
    caseNumber: String!
    status: EduTechBraveCaseStatus!
    statusLabel: String!
    createdAt: String!
    dueAt: String!
    isOverdue: Boolean!
    escalationLevel: Int!
    updates: [EduTechBravePublicUpdate!]!
  }

  input EduTechBraveReportInput {
    ${reportFields}
  }

  input EduTechBraveCaseInput {
    ${reportFields}
  }

  input EduTechBraveEvidenceInput {
    caseId: String!
    kind: EduTechBraveEvidenceKind!
    title: String!
    description: String
    fileUrl: String
    fileName: String
    recordedAt: String!
  }

  input EduTechBraveSlaHoursInput {
    critical: Int
    high: Int
    medium: Int
    low: Int
  }

  input EduTechBraveSettingsInput {
    slaHours: EduTechBraveSlaHoursInput
    organizationName: String
    escalationLevel1Label: String
    escalationLevel1Contact: String
    escalationLevel2Label: String
    escalationLevel2Contact: String
    helplineText: String
  }
`;

export const caseQueries = `
  eduTechBraveCases(
    search: String
    status: EduTechBraveCaseStatus
    category: EduTechBraveCaseCategory
    severity: EduTechBraveCaseSeverity
    assigneeId: String
    overdueOnly: Boolean
    escalatedOnly: Boolean
    openOnly: Boolean
    unassignedOnly: Boolean
    limit: Int
    cursor: String
    direction: EduTechBraveCursorDirection
  ): EduTechBraveCaseList!
  eduTechBraveCaseDetail(_id: String!): EduTechBraveCase!
  eduTechBraveCaseEvents(caseId: String!): [EduTechBraveCaseEvent!]!
  eduTechBraveCaseEvidence(caseId: String!): [EduTechBraveEvidence!]!
  eduTechBraveCaseStats: EduTechBraveCaseStats!
  eduTechBraveSettings: EduTechBraveSettings!
  eduTechBraveTrackReport(trackingCode: String!, pin: String!): EduTechBravePublicCase!
`;

export const caseMutations = `
  eduTechBraveSubmitReport(input: EduTechBraveReportInput!): EduTechBraveReportReceipt!
  eduTechBraveCaseCreate(input: EduTechBraveCaseInput!): EduTechBraveCase!
  eduTechBraveCaseDeclareConflict(_id: String!, hasConflict: Boolean!, note: String): EduTechBraveCase!
  eduTechBraveCaseAssign(_id: String!, assigneeId: String!): EduTechBraveCase!
  eduTechBraveCaseChangeStatus(_id: String!, status: EduTechBraveCaseStatus!, note: String): EduTechBraveCase!
  eduTechBraveCaseAddNote(_id: String!, content: String!, isPublic: Boolean): EduTechBraveCaseEvent!
  eduTechBraveCaseCompleteProtocolStep(_id: String!, key: EduTechBraveProtocolStepKey!): EduTechBraveCase!
  eduTechBraveCaseReclassify(_id: String!, category: EduTechBraveCaseCategory!, severity: EduTechBraveCaseSeverity!, note: String!): EduTechBraveCase!
  eduTechBraveCaseAddEvidence(input: EduTechBraveEvidenceInput!): EduTechBraveEvidence!
  eduTechBraveCasesEscalateOverdue: Int!
  eduTechBraveSettingsSave(input: EduTechBraveSettingsInput!): EduTechBraveSettings!
  eduTechBraveSeedDemoData: EduTechBraveDemoSeedResult!
`;
