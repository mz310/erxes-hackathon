import { gql } from "~/gql";

// Static documents only (no `${}`): codegen validates them against the API
// schema and generates the types Apollo hooks infer from.

export const CASES_QUERY = gql(`
  query eduTechBraveCases(
    $search: String
    $status: EduTechBraveCaseStatus
    $category: EduTechBraveCaseCategory
    $severity: EduTechBraveCaseSeverity
    $assigneeId: String
    $overdueOnly: Boolean
    $escalatedOnly: Boolean
    $openOnly: Boolean
    $unassignedOnly: Boolean
    $limit: Int
    $cursor: String
    $direction: EduTechBraveCursorDirection
  ) {
    eduTechBraveCases(
      search: $search
      status: $status
      category: $category
      severity: $severity
      assigneeId: $assigneeId
      overdueOnly: $overdueOnly
      escalatedOnly: $escalatedOnly
      openOnly: $openOnly
      unassignedOnly: $unassignedOnly
      limit: $limit
      cursor: $cursor
      direction: $direction
    ) {
      list {
        _id
        caseNumber
        title
        category
        severity
        status
        schoolName
        grade
        assigneeId
        dueAt
        isOverdue
        escalationLevel
        incidentDate
        source
        createdAt
        isDemo
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`);

export const CASE_DETAIL_QUERY = gql(`
  query eduTechBraveCaseDetail($_id: String!) {
    eduTechBraveCaseDetail(_id: $_id) {
      _id
      caseNumber
      title
      description
      category
      severity
      status
      reporterRole
      isAnonymous
      reporterContact
      victimRole
      schoolName
      grade
      incidentDate
      incidentLocation
      accusedRole
      accusedDescription
      source
      assigneeId
      dueAt
      isOverdue
      escalationLevel
      escalatedAt
      resolvedAt
      resolution
      trackingCode
      conflictDeclarations {
        userId
        hasConflict
        note
        declaredAt
      }
      protocolSteps {
        key
        doneAt
        doneBy
      }
      createdBy
      createdAt
      updatedAt
      isDemo
    }
  }
`);

export const CASE_EVENTS_QUERY = gql(`
  query eduTechBraveCaseEvents($caseId: String!) {
    eduTechBraveCaseEvents(caseId: $caseId) {
      _id
      caseId
      type
      message
      payloadJson
      actorId
      isPublic
      createdAt
    }
  }
`);

export const CASE_EVIDENCE_QUERY = gql(`
  query eduTechBraveCaseEvidence($caseId: String!) {
    eduTechBraveCaseEvidence(caseId: $caseId) {
      _id
      caseId
      kind
      title
      description
      fileUrl
      fileName
      recordedAt
      addedBy
      createdAt
      checksum
    }
  }
`);

export const CASE_STATS_QUERY = gql(`
  query eduTechBraveCaseStats {
    eduTechBraveCaseStats {
      open
      overdue
      escalated
      critical
      resolvedLast30Days
      demoCount
      byStatus {
        key
        count
      }
      byCategory {
        key
        count
      }
      bySeverity {
        key
        count
      }
    }
  }
`);

export const CASE_CREATE_MUTATION = gql(`
  mutation eduTechBraveCaseCreate($input: EduTechBraveCaseInput!) {
    eduTechBraveCaseCreate(input: $input) {
      _id
      caseNumber
    }
  }
`);

export const CASE_DECLARE_CONFLICT_MUTATION = gql(`
  mutation eduTechBraveCaseDeclareConflict($_id: String!, $hasConflict: Boolean!, $note: String) {
    eduTechBraveCaseDeclareConflict(_id: $_id, hasConflict: $hasConflict, note: $note) {
      _id
      assigneeId
      conflictDeclarations {
        userId
        hasConflict
        note
        declaredAt
      }
    }
  }
`);

export const CASE_ASSIGN_MUTATION = gql(`
  mutation eduTechBraveCaseAssign($_id: String!, $assigneeId: String!) {
    eduTechBraveCaseAssign(_id: $_id, assigneeId: $assigneeId) {
      _id
      assigneeId
    }
  }
`);

export const CASE_CHANGE_STATUS_MUTATION = gql(`
  mutation eduTechBraveCaseChangeStatus($_id: String!, $status: EduTechBraveCaseStatus!, $note: String) {
    eduTechBraveCaseChangeStatus(_id: $_id, status: $status, note: $note) {
      _id
      status
      resolvedAt
      resolution
      isOverdue
    }
  }
`);

export const CASE_ADD_NOTE_MUTATION = gql(`
  mutation eduTechBraveCaseAddNote($_id: String!, $content: String!, $isPublic: Boolean) {
    eduTechBraveCaseAddNote(_id: $_id, content: $content, isPublic: $isPublic) {
      _id
    }
  }
`);

export const CASE_COMPLETE_STEP_MUTATION = gql(`
  mutation eduTechBraveCaseCompleteProtocolStep($_id: String!, $key: EduTechBraveProtocolStepKey!) {
    eduTechBraveCaseCompleteProtocolStep(_id: $_id, key: $key) {
      _id
      protocolSteps {
        key
        doneAt
        doneBy
      }
    }
  }
`);

export const CASE_ADD_EVIDENCE_MUTATION = gql(`
  mutation eduTechBraveCaseAddEvidence($input: EduTechBraveEvidenceInput!) {
    eduTechBraveCaseAddEvidence(input: $input) {
      _id
    }
  }
`);

export const SEED_DEMO_MUTATION = gql(`
  mutation eduTechBraveSeedDemoData {
    eduTechBraveSeedDemoData {
      created
      sampleCaseNumber
      sampleTrackingCode
      samplePin
    }
  }
`);

export const CASES_ESCALATE_MUTATION = gql(`
  mutation eduTechBraveCasesEscalateOverdue {
    eduTechBraveCasesEscalateOverdue
  }
`);
