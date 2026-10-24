# Rights Protection case management — design

**Plugin:** `edu-tech-brave` (erxes plugin, API + UI). **Product name (UI):** «Эрх хамгаалал».

**Amended by** `2026-10-24-ai-assistant-design.md`, which adds:

- tighten-only reclassification (`eduTechBraveCaseReclassify`) and the event
  types `reclassified` and `ai_assist`;
- the optional Gemma assistant and the `eduTechBraveAiUse` permission;
- the `openOnly` and `unassignedOnly` list filters.

## Intent and why

In March 2022 a Mongolian school pupil was beaten by a part-time teacher who
was the principal's spouse. The complaint had to go to the principal, so it
was buried: no medical aid, no parental notice, no record. The documents
(ethics code, complaint form) existed; the *structure* failed — the person
resolving the complaint was related to the accused, and nothing outside the
school could see the case or its deadline.

This plugin gives a district / aimag education department (БСУГ) an intake
and case-management system for violations of pupils' and teachers' rights
that enforces four structural rules in code, not in policy:

1. **Independence.** Reports are filed to the department tenant, through a
   public, optionally anonymous channel. School management has no access
   unless the department grants erxes permissions. Nothing can be deleted.
2. **Nothing is forgotten.** Every case gets a number, a creation time, an
   assignee and a due time derived from severity. Overdue cases escalate
   automatically to the next level and the escalation is recorded.
3. **Evidence is append-only.** Photos, medical records and witness
   statements are stored with the time they were recorded and a checksum.
   There is no update or delete mutation for evidence or timeline events.
4. **The emergency protocol runs regardless of management.** For physical or
   sexual violence a mandatory checklist (medical aid → notify guardian →
   separate the accused → report to authority) must be completed before a
   case can be resolved.

Plus a conflict-of-interest gate: a handler must declare whether they are
related to the accused before acting; a declared conflict blocks that user
from being assigned or changing status. And the 108 child helpline is shown
on the dashboard and the public page.

## Goals

- Public intake page (no login) served by the plugin API, reachable through
  the erxes gateway at `/pl:edu-tech-brave/intake`; returns a tracking code
  and PIN; a tracking view shows status, deadline, escalation level and
  public updates.
- Staff UI inside erxes: dashboard, case list with filters and infinite
  scroll, case detail (overview, protocol, evidence, timeline), staff
  intake form, settings.
- Tenant-scoped data, every resolver authorized with erxes permissions.

## Non-goals

- Client-portal integration, notifications/e-mail, automations, reports
  export, multi-language switching (UI copy is Mongolian), file virus
  scanning, legal advice. Attachments use erxes's own upload endpoint.

## Anti-goals

- Any mutation that deletes or edits a case event or evidence record.
- Any path where a user with a declared conflict can change a case's status.
- Any resolver that reads case data without `checkPermission`.

## Constraints (from AGENTS.md)

- Prefix every GraphQL type with `EduTechBrave`, every operation and root
  field with `eduTechBrave`. No `any`. Named exports. Tailwind classes with
  the `edutechbrave:` prefix and host tokens. `gql()` from `~/gql` on static
  strings; Apollo hooks infer types. Every query has loading/error/empty
  states; refetch or update the cache after each mutation. Run `check`,
  `lint`, `build` before calling it done.
- Node 22+ API, erxes-api-shared 3.3.4, erxes-ui 3.3.4; no new runtime
  dependencies in `ui/` (forms are controlled components, no
  react-hook-form). API tests use `node:test` with Node's native type
  stripping, so domain code uses erasable TypeScript only (no `enum`).

## Domain

### Case (`edu_tech_brave_cases`)

| Field | Type | Notes |
|---|---|---|
| caseNumber | string, unique | `ЭХ-<year>-<seq 4 digits>` per tenant |
| title, description | string | title 3–200, description 10–5000 |
| category | `physical_violence` `psychological_violence` `bullying` `sexual_harassment` `discrimination` `neglect_of_duty` `teacher_labor_rights` `unfair_assessment` `privacy_breach` `other` | |
| severity | `low` `medium` `high` `critical` | drives SLA |
| status | `new` `under_review` `investigating` `resolved` `dismissed` | |
| reporterRole | `student` `parent` `teacher` `staff` `other` | |
| isAnonymous | boolean | when true `reporterContact` is never stored |
| reporterContact? | string | |
| victimRole | `student` `teacher` `staff` `other` | |
| schoolName | string, required | |
| grade?, incidentLocation?, accusedRole?, accusedDescription? | string | accusedRole ∈ `teacher` `administrator` `student` `staff` `other` |
| incidentDate | Date, required | not in the future |
| source | `public` `staff` | |
| assigneeId? | string | erxes user id |
| dueAt | Date | createdAt + slaHours[severity] |
| escalationLevel | 0 \| 1 \| 2 | |
| escalatedAt?, resolvedAt?, resolution? | | |
| trackingCode | string, unique | 10 uppercase alphanumerics |
| trackingPinHash | string | sha256(`${trackingCode}:${pin}`) |
| conflictDeclarations | [{ userId, hasConflict, note?, declaredAt }] | one per user, latest wins |
| protocolSteps | [{ key, doneAt?, doneBy? }] | present only when the category requires the protocol |
| createdBy?, createdAt, updatedAt | | |

Status transitions: `new→under_review`, `new→dismissed`,
`under_review→investigating`, `under_review→dismissed`,
`investigating→resolved`, `investigating→dismissed`, `resolved→investigating`
(reopen), `dismissed→under_review` (reopen). Nothing else.

Protocol categories: `physical_violence`, `sexual_harassment`. Steps, in
order: `medical_aid`, `notify_guardian`, `separate_accused`,
`report_authority`. `→resolved` is refused while any step is undone.

Escalation: when `now > dueAt` and status ∉ {resolved, dismissed} and
level < 2: level += 1, `escalatedAt = now`, `dueAt = now + 24h`, event
`escalated`. Runs lazily at the start of the list and stats queries and on
demand through a mutation. Level labels/contacts come from settings.

Conflict gate: `assign` refuses an assignee whose latest declaration has
`hasConflict = true`; `changeStatus`, `addNote`, `completeProtocolStep`
and `addEvidence` require the acting user's latest declaration to exist
with `hasConflict = false` (error copy: «Эхлээд ашиг сонирхлын зөрчилгүй
гэдгээ мэдүүлнэ үү»).

### Event (`edu_tech_brave_case_events`, append-only)

`caseId`, `type` ∈ `created` `status_changed` `assigned` `note`
`evidence_added` `escalated` `protocol_step` `conflict_declared`,
`message` (Mongolian, human readable), `payload?` (Mixed), `actorId?`,
`isPublic` (shown to the reporter), `createdAt` (immutable).

### Evidence (`edu_tech_brave_evidence`, append-only)

`caseId`, `kind` ∈ `photo` `medical_record` `witness_statement` `document`
`other`, `title`, `description?`, `fileUrl?`, `fileName?`, `recordedAt`,
`addedBy`, `createdAt`, `checksum` = sha256 of
`caseId|kind|title|description|fileUrl|recordedAt ISO|createdAt ISO`.

### Settings (`edu_tech_brave_settings`, one document per tenant)

`slaHours` { critical 24, high 72, medium 168, low 336 },
`organizationName` («Боловсролын газар»), `escalationLevel1Label`
(«Хэлтсийн дарга»), `escalationLevel1Contact`, `escalationLevel2Label`
(«Боловсролын газрын дарга / Мэргэжлийн хяналт»),
`escalationLevel2Contact`, `helplineText` («108 — Хүүхдийн тусламжийн
утас, 24/7, үнэгүй»), `updatedAt`, `updatedBy`.

## Permissions

Module `eduTechBraveCases`: `eduTechBraveCasesRead`,
`eduTechBraveCasesCreate`, `eduTechBraveCasesManage` (assign, status,
notes, protocol, escalate), `eduTechBraveEvidenceAdd`. Module
`eduTechBraveSettings`: `eduTechBraveSettingsManage`. Scopes `all` only.
Public resolvers (`eduTechBraveSubmitReport`, `eduTechBraveTrackReport`)
carry `wrapperConfig.skipPermission = true` and are rate-limited per IP
in memory (submit 5 / 15 min, track 20 / 15 min).

## GraphQL surface

Queries: `eduTechBraveStatus`, `eduTechBraveCases(search, status,
category, severity, assigneeId, overdueOnly, escalatedOnly, limit, cursor,
direction)` → `EduTechBraveCaseList { list totalCount pageInfo }`,
`eduTechBraveCaseDetail(_id)`, `eduTechBraveCaseEvents(caseId)`,
`eduTechBraveCaseEvidence(caseId)`, `eduTechBraveCaseStats`,
`eduTechBraveSettings`, `eduTechBraveTrackReport(trackingCode, pin)` →
`EduTechBravePublicCase`.

Mutations: `eduTechBraveSubmitReport(input)` → `EduTechBraveReportReceipt
{ caseNumber trackingCode pin }`, `eduTechBraveCaseCreate(input)`,
`eduTechBraveCaseDeclareConflict(_id, hasConflict, note)`,
`eduTechBraveCaseAssign(_id, assigneeId)`,
`eduTechBraveCaseChangeStatus(_id, status, note)`,
`eduTechBraveCaseAddNote(_id, content, isPublic)`,
`eduTechBraveCaseCompleteProtocolStep(_id, key)`,
`eduTechBraveCaseAddEvidence(input)`, `eduTechBraveCasesEscalateOverdue`
→ Int, `eduTechBraveSettingsSave(input)`.

Cursor pagination uses the plugin's own `EduTechBraveCursorDirection`
enum and `EduTechBravePageInfo` type (no shared core types), backed by
`cursorPaginate` from erxes-api-shared.

## Public intake page

`GET /intake` (also `/intake/`) served by `apiHandlers`: a single
self-contained HTML page (Mongolian, mobile-first, light/dark via
`prefers-color-scheme`) with two tabs — «Мэдэгдэл илгээх» and «Явц
шалгах» — a 108 helpline banner, an anonymity notice, and emergency
numbers (102 police, 103 ambulance). It posts to the relative URL
`graphql` so it works both directly and behind `/pl:edu-tech-brave/`.
On success it shows the case number, tracking code and PIN with a
"write these down" warning.

## UI (erxes host)

Routes under `/edu-tech-brave`: `/` dashboard, `/cases` list, `/settings`.
Case detail opens in a right Sheet driven by `?caseId=` (useQueryState);
new case opens in a Sheet from the list header.

- **Dashboard:** KPI tiles (нээлттэй, хугацаа хэтэрсэн, шатласан, онц
  ноцтой, сүүлийн 30 хоногт шийдвэрлэсэн), category breakdown bars,
  recent cases, helpline card, public channel card with the intake URL
  and copy button.
- **Cases:** filter bar (search, status, severity, category, overdue
  toggle), RecordTable with cursor infinite scroll; columns: №, title,
  category, severity, status, school, assignee (MembersInline), due
  (relative, red when overdue), level.
- **Detail Sheet tabs:** Тойм (facts, legal basis for the category,
  conflict declaration, assignee, status actions with note), Протокол
  (checklist, only for protocol categories), Нотлох баримт (append-only
  list + add form with erxes upload), Түүх (timeline).
- **Settings:** SLA hours, escalation labels/contacts, organization name,
  helpline text.

Legal basis per category is a static, non-exhaustive list of relevant
Mongolian laws (Боловсролын ерөнхий хууль 2023, Хүүхдийн эрхийг хамгаалах
тухай хууль, Хүүхдийн эрхийн тухай хууль, Хөдөлмөрийн тухай хууль, Багшийн
хөгжлийг дэмжих тухай хууль, Хувь хүний мэдээлэл хамгаалах тухай хууль,
Багш, ажилтны ёс зүйн дүрэм) named without article numbers, labelled
«Лавлагаа, хууль зүйн зөвлөгөө биш».

## Left to the builder

Exact Tailwind layout, icon choices, Mongolian wording beyond the copy
fixed above, index definitions, and the HTML/CSS of the public page.
