# Rights Protection case management — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `edu-tech-brave` scaffold into «Эрх хамгаалал», an independent intake and case-management plugin for pupils' and teachers' rights violations, with a public anonymous intake page, SLA-driven auto-escalation, append-only evidence, a mandatory emergency protocol and a conflict-of-interest gate.

**Architecture:** API = erxes-api-shared `startPlugin` with four tenant-scoped Mongoose models (`Cases`, `CaseEvents`, `Evidence`, `Settings`), a pure domain module (status machine, SLA, escalation, PIN hashing, validation) tested with `node:test`, a federated GraphQL subgraph with `eduTechBrave*` operations, and an `apiHandlers` route serving a self-contained public HTML intake page. UI = React Module Federation remote using erxes-ui (RecordTable with cursor paging, Sheet-based detail, controlled forms) with Mongolian copy.

**Tech Stack:** Node 22+/24, TypeScript 5.9, Mongoose 8, graphql-tag, erxes-api-shared 3.3.4, React 18, erxes-ui / ui-modules 3.3.4, Rspack, Tailwind 4 (prefix `edutechbrave:`), graphql-codegen client preset.

**Spec:** `docs/superpowers/specs/2026-10-24-rights-case-management-design.md`

## Global Constraints

- GraphQL: every type `EduTechBrave*`, every root field / operation `eduTechBrave*`; no shared core scalars or enums — define `EduTechBraveCursorDirection { forward backward }` and `EduTechBravePageInfo`.
- TypeScript: `strict`, `noUncheckedIndexedAccess`, no `any`, named exports only; API domain code is erasable TS (no `enum`, no parameter properties).
- API: no new dependencies; tests via `node --test` (Node's native type stripping, `process.features.typescript === "strip"`); every non-public resolver `await checkPermission(<action>)`; public resolvers get `wrapperConfig: { skipPermission: true }`.
- UI: no new dependencies; `gql()` from `~/gql` on static strings; Tailwind classes `edutechbrave:*` with host tokens; root imports from `erxes-ui` / `ui-modules`; loading, error and empty states on every query; refetch/update cache after every mutation.
- Copy: UI and event messages in Mongolian; fixed strings from the spec copied verbatim.
- Done = `pnpm run check`, `pnpm run lint`, `pnpm run build`, `pnpm --filter edu-tech-brave_api test` all green.
- Commits are left to the user (harness rule: commit only when asked); the plan has no commit steps.

## Review Focus

1. Anonymous report that still fills `reporterContact` → the contact must never reach the database. Test: `sanitizeReportInput` (Task 1).
2. `incidentDate` in the future or malformed → rejected with a Mongolian message, never a 500. Test: `validateReportInput` (Task 1).
3. `→resolved` while a protocol step is undone → refused; every other transition table row behaves. Test: `assertTransition` (Task 1).
4. Escalation never passes level 2 and never touches resolved/dismissed cases; it extends `dueAt` by 24h from `now`. Test: `planEscalation` (Task 1).
5. Public endpoints under brute force: sixth submit in 15 min and 21st track attempt are refused; wrong PIN fails even with correct code. Tests: `createRateLimiter`, `verifyPin` (Tasks 1–2).

---

### Task 1: Domain module (pure, tested)

**Files:**
- Create: `api/src/modules/cases/domain.ts`
- Test: `api/src/modules/cases/domain.test.ts`
- Modify: `api/package.json` (add script `"test": "node --test \"src/**/*.test.ts\""`), root `package.json` (add `"test": "pnpm --filter edu-tech-brave_api test"`)

**Interfaces:**
- Produces (all exported from `domain.ts`):
  - `CASE_CATEGORIES`, `CASE_SEVERITIES`, `CASE_STATUSES`, `REPORTER_ROLES`, `VICTIM_ROLES`, `ACCUSED_ROLES`, `EVIDENCE_KINDS`, `EVENT_TYPES`, `PROTOCOL_STEP_KEYS`, `CASE_SOURCES` as `readonly [...]` tuples with the spec's values; types `CaseCategory`, `CaseSeverity`, `CaseStatus`, `ReporterRole`, `VictimRole`, `AccusedRole`, `EvidenceKind`, `EventType`, `ProtocolStepKey`, `CaseSource` derived with `typeof X[number]`.
  - `PROTOCOL_CATEGORIES: readonly CaseCategory[]`, `OPEN_STATUSES: readonly CaseStatus[]`, `MAX_ESCALATION_LEVEL = 2`, `ESCALATION_GRACE_HOURS = 24`, `DEFAULT_SLA_HOURS: SlaHours`, `type SlaHours = Record<CaseSeverity, number>`.
  - `isOpenStatus(status: CaseStatus): boolean`
  - `computeDueAt(from: Date, severity: CaseSeverity, sla: SlaHours): Date`
  - `requiresProtocol(category: CaseCategory): boolean`
  - `type ProtocolStep = { key: ProtocolStepKey; doneAt?: Date | null; doneBy?: string | null }`
  - `initialProtocolSteps(category: CaseCategory): ProtocolStep[]` (all four keys in order, or `[]`)
  - `protocolComplete(steps: ProtocolStep[]): boolean`
  - `canTransition(from: CaseStatus, to: CaseStatus): boolean`
  - `assertTransition(from: CaseStatus, to: CaseStatus, steps: ProtocolStep[]): string | null` → `null` when allowed; `"Энэ төлөвт шилжүүлэх боломжгүй"` for a forbidden edge; `"Яаралтай протоколын бүх алхам дуусаагүй байна"` for `→resolved` with an undone step.
  - `formatCaseNumber(year: number, seq: number): string` → `ЭХ-2026-0001`
  - `type EscalationPlan = { shouldEscalate: false } | { shouldEscalate: true; level: number; dueAt: Date }`
  - `planEscalation(input: { now: Date; dueAt: Date; status: CaseStatus; level: number }): EscalationPlan`
  - `generateTrackingCode(random?: () => number): string` (10 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`)
  - `generatePin(random?: () => number): string` (6 digits, zero-padded)
  - `hashPin(trackingCode: string, pin: string): string` (sha256 hex of `${trackingCode}:${pin}`)
  - `verifyPin(trackingCode: string, pin: string, hash: string): boolean` (uses `timingSafeEqual`)
  - `type ReportInput = { title: string; description: string; category: CaseCategory; severity: CaseSeverity; reporterRole: ReporterRole; isAnonymous: boolean; reporterContact?: string | null; victimRole: VictimRole; schoolName: string; grade?: string | null; incidentDate: string | Date; incidentLocation?: string | null; accusedRole?: AccusedRole | null; accusedDescription?: string | null }`
  - `validateReportInput(input: ReportInput, now: Date): string[]` (Mongolian messages; empty array = valid)
  - `sanitizeReportInput(input: ReportInput): ReportInput` (trims strings, drops `reporterContact` when `isAnonymous`, drops empty optionals to `null`)
  - `evidenceChecksum(fields: { caseId: string; kind: EvidenceKind; title: string; description?: string | null; fileUrl?: string | null; recordedAt: Date; createdAt: Date }): string`
  - `type ConflictDeclaration = { userId: string; hasConflict: boolean; note?: string | null; declaredAt: Date }`
  - `latestDeclaration(decls: ConflictDeclaration[], userId: string): ConflictDeclaration | undefined`
  - `conflictGate(decls: ConflictDeclaration[], userId: string): string | null` → `"Эхлээд ашиг сонирхлын зөрчилгүй гэдгээ мэдүүлнэ үү"` when no declaration; `"Ашиг сонирхлын зөрчил мэдүүлсэн хэрэглэгч энэ хэрэг дээр ажиллах боломжгүй"` when `hasConflict`; else `null`.
  - `STATUS_LABELS_MN`, `SEVERITY_LABELS_MN`, `CATEGORY_LABELS_MN`, `PROTOCOL_STEP_LABELS_MN`: `Record<..., string>` used for event messages.

- [ ] **Step 1: Write the failing tests** in `api/src/modules/cases/domain.test.ts` using `node:test` + `node:assert/strict`:

```ts
test("computeDueAt adds the severity SLA", () => {
  const from = new Date("2026-03-09T08:00:00Z");
  assert.equal(computeDueAt(from, "critical", DEFAULT_SLA_HOURS).toISOString(), "2026-03-10T08:00:00.000Z");
  assert.equal(computeDueAt(from, "low", DEFAULT_SLA_HOURS).toISOString(), "2026-03-23T08:00:00.000Z");
});
test("protocol only for physical and sexual violence", () => {
  assert.deepEqual(initialProtocolSteps("physical_violence").map((s) => s.key), ["medical_aid","notify_guardian","separate_accused","report_authority"]);
  assert.deepEqual(initialProtocolSteps("bullying"), []);
});
test("transition table", () => {
  assert.equal(canTransition("new", "under_review"), true);
  assert.equal(canTransition("new", "resolved"), false);
  assert.equal(canTransition("resolved", "investigating"), true);
  assert.equal(canTransition("dismissed", "under_review"), true);
  assert.equal(canTransition("under_review", "resolved"), false);
});
test("resolve is refused while a protocol step is undone", () => {
  const steps = initialProtocolSteps("physical_violence");
  assert.equal(assertTransition("investigating", "resolved", steps), "Яаралтай протоколын бүх алхам дуусаагүй байна");
  const done = steps.map((s) => ({ ...s, doneAt: new Date(), doneBy: "u1" }));
  assert.equal(assertTransition("investigating", "resolved", done), null);
  assert.equal(assertTransition("new", "resolved", []), "Энэ төлөвт шилжүүлэх боломжгүй");
});
test("formatCaseNumber", () => { assert.equal(formatCaseNumber(2026, 1), "ЭХ-2026-0001"); assert.equal(formatCaseNumber(2026, 1234), "ЭХ-2026-1234"); });
test("planEscalation", () => {
  const now = new Date("2026-03-12T00:00:00Z"); const due = new Date("2026-03-11T00:00:00Z");
  assert.deepEqual(planEscalation({ now, dueAt: due, status: "new", level: 0 }), { shouldEscalate: true, level: 1, dueAt: new Date("2026-03-13T00:00:00Z") });
  assert.deepEqual(planEscalation({ now, dueAt: due, status: "resolved", level: 0 }), { shouldEscalate: false });
  assert.deepEqual(planEscalation({ now, dueAt: due, status: "investigating", level: 2 }), { shouldEscalate: false });
  assert.deepEqual(planEscalation({ now: due, dueAt: now, status: "new", level: 0 }), { shouldEscalate: false });
});
test("tracking code and pin", () => {
  const code = generateTrackingCode(() => 0.5); assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
  const pin = generatePin(() => 0); assert.equal(pin, "000000");
  const hash = hashPin("ABC", "123456");
  assert.equal(verifyPin("ABC", "123456", hash), true);
  assert.equal(verifyPin("ABC", "123457", hash), false);
  assert.equal(verifyPin("ABD", "123456", hash), false);
});
test("validateReportInput rejects future incident date and short text", () => {
  const now = new Date("2026-10-24T00:00:00Z");
  const errors = validateReportInput({ ...valid, incidentDate: "2027-01-01", title: "ab", description: "short" }, now);
  assert.ok(errors.some((e) => e.includes("огноо")));
  assert.equal(errors.length, 3);
  assert.deepEqual(validateReportInput(valid, now), []);
  assert.ok(validateReportInput({ ...valid, incidentDate: "not-a-date" }, now).length >= 1);
});
test("sanitizeReportInput drops contact when anonymous", () => {
  const out = sanitizeReportInput({ ...valid, isAnonymous: true, reporterContact: "99112233", title: "  Зодсон  " });
  assert.equal(out.reporterContact, null); assert.equal(out.title, "Зодсон");
  assert.equal(sanitizeReportInput({ ...valid, isAnonymous: false, reporterContact: "99112233" }).reporterContact, "99112233");
});
test("evidenceChecksum is stable and sensitive", () => {
  const f = { caseId: "c1", kind: "photo" as const, title: "Гэмтлийн зураг", recordedAt: new Date(0), createdAt: new Date(1) };
  assert.equal(evidenceChecksum(f), evidenceChecksum({ ...f }));
  assert.notEqual(evidenceChecksum(f), evidenceChecksum({ ...f, title: "x" }));
});
test("conflictGate", () => {
  assert.equal(conflictGate([], "u1"), "Эхлээд ашиг сонирхлын зөрчилгүй гэдгээ мэдүүлнэ үү");
  const d = (hasConflict: boolean, t: number) => ({ userId: "u1", hasConflict, declaredAt: new Date(t) });
  assert.equal(conflictGate([d(true, 1), d(false, 2)], "u1"), null);
  assert.equal(conflictGate([d(false, 1), d(true, 2)], "u1"), "Ашиг сонирхлын зөрчил мэдүүлсэн хэрэглэгч энэ хэрэг дээр ажиллах боломжгүй");
});
```
`valid` is a module-level `ReportInput` with title `"Багш сурагчийг зодсон"`, description `"Ширээн дээрээс сандал унагаасан гэж цохиж, өшиглөсөн."`, category `physical_violence`, severity `critical`, reporterRole `parent`, isAnonymous `false`, victimRole `student`, schoolName `"X сургууль"`, incidentDate `"2026-03-09"`.

- [ ] **Step 2: Run to verify failure.** Run (from `api/`): `pnpm test`. Expected: fails with `Cannot find module './domain.ts'`.
- [ ] **Step 3: Implement `domain.ts`** with the interfaces above. Transition table as a `Record<CaseStatus, readonly CaseStatus[]>`. `validateReportInput` checks: title length 3–200, description 10–5000, category/severity/roles ∈ tuples, `schoolName` non-empty, `incidentDate` parses and `<= now` (`"Хэрэг болсон огноо буруу эсвэл ирээдүйд байна"`), `reporterContact` ≤ 200, `accusedDescription` ≤ 1000. Use `node:crypto` `createHash` and `timingSafeEqual` (compare equal-length buffers; return false when lengths differ).
- [ ] **Step 4: Run tests.** `pnpm test` → all pass. Then `pnpm run check` (api) → no type errors.

### Task 2: In-memory rate limiter (pure, tested)

**Files:**
- Create: `api/src/modules/cases/rateLimit.ts`
- Test: `api/src/modules/cases/rateLimit.test.ts`

**Interfaces:**
- Produces: `createRateLimiter(options: { max: number; windowMs: number; now?: () => number }): { allow(key: string): boolean; reset(): void }`; sliding window per key, prunes stale timestamps on each call, caps tracked keys at 10 000 by evicting the oldest key.

- [ ] **Step 1: Failing test:** with a controllable clock, `max: 5, windowMs: 900_000`: five `allow("1.1.1.1")` true, sixth false, another key still true, after advancing 900_001 ms the key is allowed again; `reset()` clears.
- [ ] **Step 2:** `pnpm test` → fails (module missing).
- [ ] **Step 3:** Implement with `Map<string, number[]>`.
- [ ] **Step 4:** `pnpm test` → pass.

### Task 3: Mongoose definitions, models, connection resolvers, permissions

**Files:**
- Create: `api/src/modules/cases/db/definitions/case.ts`, `caseEvent.ts`, `evidence.ts`, `settings.ts`
- Create: `api/src/modules/cases/db/models/Case.ts`, `CaseEvent.ts`, `Evidence.ts`, `Settings.ts`
- Modify: `api/src/connectionResolvers.ts`, `api/src/permissions.ts`
- Delete: `api/src/modules/sample/` (both files)

**Interfaces:**
- Consumes: Task 1 domain types and functions.
- Produces:
  - `ICase`, `ICaseDocument` (fields from the spec table; `conflictDeclarations: ConflictDeclaration[]`, `protocolSteps: ProtocolStep[]`), `caseSchema` (schemaWrapper; indexes: `{ caseNumber: 1 }` unique, `{ trackingCode: 1 }` unique, `{ status: 1, dueAt: 1 }`, `{ createdAt: -1 }`).
  - `ICaseEvent`, `ICaseEventDocument`, `caseEventSchema` (all fields `immutable: true`; index `{ caseId: 1, createdAt: 1 }`).
  - `IEvidence`, `IEvidenceDocument`, `evidenceSchema` (all fields `immutable: true`; index `{ caseId: 1, createdAt: 1 }`).
  - `ISettings`, `ISettingsDocument`, `settingsSchema` (defaults from the spec).
  - `ICaseModel extends Model<ICaseDocument>` statics:
    - `getCase(_id: string): Promise<ICaseDocument>` (throws `"Хэрэг олдсонгүй"`)
    - `nextCaseNumber(now: Date): Promise<string>` (count cases with `caseNumber` starting `ЭХ-<year>-`, +1)
    - `createCase(input: ReportInput & { source: CaseSource; createdBy?: string | null }, settings: ISettings, now: Date): Promise<{ caseDoc: ICaseDocument; pin: string }>` — sanitize + validate (throw joined errors), tracking code/pin, dueAt, protocol steps, `created` event (public, message `"Мэдэгдэл бүртгэгдлээ"`).
    - `declareConflict(_id, userId, hasConflict, note): Promise<ICaseDocument>` (push declaration + `conflict_declared` event)
    - `assign(_id, assigneeId, actorId): Promise<ICaseDocument>` (refuse when assignee's latest declaration `hasConflict`; `assigned` event, public message `"Хариуцагч томилогдлоо"`)
    - `changeStatus(_id, status, note, actorId): Promise<ICaseDocument>` (conflictGate → assertTransition → set `resolvedAt`/`resolution` when `resolved`; `status_changed` event public with message `Төлөв: <STATUS_LABELS_MN[to]>`)
    - `completeProtocolStep(_id, key, actorId): Promise<ICaseDocument>` (conflictGate; idempotent; `protocol_step` event)
    - `escalateOverdue(now: Date): Promise<number>` (open cases with `dueAt < now` and `escalationLevel < 2`; apply `planEscalation`; `escalated` event public `Хугацаа хэтэрсэн тул <level>-р шатанд шилжүүлэв`; returns count)
    - `listPaged(args: CaseListArgs): Promise<CursorResult<ICaseDocument>>` using `cursorPaginate` with `orderBy: { createdAt: -1 }`; `CaseListArgs = { search?, status?, category?, severity?, assigneeId?, overdueOnly?, escalatedOnly?, limit?, cursor?, direction?, now: Date }`; `search` matches `caseNumber`, `title`, `schoolName` with escaped regex.
    - `stats(now: Date): Promise<CaseStats>` where `CaseStats = { open: number; overdue: number; escalated: number; critical: number; resolvedLast30Days: number; byStatus: { key: string; count: number }[]; byCategory: {...}[]; bySeverity: {...}[] }` (aggregation `$facet` or parallel counts).
  - `ICaseEventModel` statics: `log(doc: ICaseEvent): Promise<ICaseEventDocument>`, `listByCase(caseId): Promise<ICaseEventDocument[]>`, `publicByCase(caseId): Promise<ICaseEventDocument[]>`.
  - `IEvidenceModel` statics: `add(doc: Omit<IEvidence, "checksum" | "createdAt">, now: Date): Promise<IEvidenceDocument>` (computes checksum, logs `evidence_added` event via `models.CaseEvents`), `listByCase(caseId)`.
  - `ISettingsModel` statics: `get(): Promise<ISettings>` (returns defaults when missing), `save(input: SettingsInput, userId: string): Promise<ISettings>` (upsert single doc; `SettingsInput` = all editable fields optional).
  - `IModels = { Cases: ICaseModel; CaseEvents: ICaseEventModel; Evidence: IEvidenceModel; Settings: ISettingsModel }`, collection names `edu_tech_brave_cases`, `edu_tech_brave_case_events`, `edu_tech_brave_evidence`, `edu_tech_brave_settings`.
  - Permission action constants in `permissions.ts`: `CASES_READ = "eduTechBraveCasesRead"`, `CASES_CREATE = "eduTechBraveCasesCreate"`, `CASES_MANAGE = "eduTechBraveCasesManage"`, `EVIDENCE_ADD = "eduTechBraveEvidenceAdd"`, `SETTINGS_MANAGE = "eduTechBraveSettingsManage"`; modules `eduTechBraveCases` and `eduTechBraveSettings`, scope `all` only.

- [ ] **Step 1:** Write definitions (schemaWrapper, `immutable: true` on append-only fields).
- [ ] **Step 2:** Write models with the statics above; errors thrown as `GraphQLError` with `extensions.code` `BAD_USER_INPUT` (validation/transition/conflict) or `NOT_FOUND`.
- [ ] **Step 3:** Rewrite `connectionResolvers.ts` and `permissions.ts`; delete the sample module.
- [ ] **Step 4:** Verify: `pnpm --filter edu-tech-brave_api check` → passes (schema.ts will break — fix in Task 4; run check after Task 4 if needed).

### Task 4: GraphQL schema, resolvers, public resolvers, main.ts

**Files:**
- Create: `api/src/modules/cases/graphql/typeDefs.ts`, `serialize.ts`, `queries.ts`, `mutations.ts`, `publicResolvers.ts`
- Modify: `api/src/graphql/schema.ts`, `api/src/main.ts`

**Interfaces:**
- Consumes: Task 3 models and permission constants; Task 2 limiter.
- Produces:
  - SDL (in `typeDefs.ts`, exported `caseTypes: string`, `caseQueries: string`, `caseMutations: string`): enums `EduTechBraveCaseStatus`, `EduTechBraveCaseCategory`, `EduTechBraveCaseSeverity`, `EduTechBraveReporterRole`, `EduTechBraveVictimRole`, `EduTechBraveAccusedRole`, `EduTechBraveEvidenceKind`, `EduTechBraveEventType`, `EduTechBraveProtocolStepKey`, `EduTechBraveCaseSource`, `EduTechBraveCursorDirection`; types `EduTechBraveConflictDeclaration`, `EduTechBraveProtocolStep`, `EduTechBraveCase` (all case fields except `trackingPinHash`, dates as ISO `String`, plus `isOverdue: Boolean!`), `EduTechBravePageInfo`, `EduTechBraveCaseList { list: [EduTechBraveCase!]! totalCount: Int! pageInfo: EduTechBravePageInfo! }`, `EduTechBraveCaseEvent`, `EduTechBraveEvidence`, `EduTechBraveCountBucket { key: String! count: Int! }`, `EduTechBraveCaseStats`, `EduTechBraveSlaHours`, `EduTechBraveSettings`, `EduTechBraveReportReceipt`, `EduTechBravePublicUpdate { message: String! createdAt: String! }`, `EduTechBravePublicCase { caseNumber status createdAt dueAt escalationLevel updates: [EduTechBravePublicUpdate!]! }`; inputs `EduTechBraveReportInput`, `EduTechBraveCaseInput` (same fields), `EduTechBraveEvidenceInput { caseId kind title description fileUrl fileName recordedAt }`, `EduTechBraveSlaHoursInput`, `EduTechBraveSettingsInput`; queries and mutations exactly as the spec lists.
  - `serialize.ts`: `toCaseGql(doc, now)`, `toEventGql(doc)`, `toEvidenceGql(doc)`, `toSettingsGql(doc)`, `toPublicCaseGql(doc, events)` — plain objects, Dates → `toISOString()`, `isOverdue = isOpenStatus(status) && dueAt < now`.
  - `queries.ts`: `caseQueries` object; `eduTechBraveCases` and `eduTechBraveCaseStats` call `models.Cases.escalateOverdue(now)` first; all `await checkPermission(CASES_READ)`; `limit` clamped 1–100.
  - `mutations.ts`: `caseMutations` with permissions: create → `CASES_CREATE`; declareConflict → `CASES_READ`; assign/changeStatus/addNote/completeProtocolStep/escalateOverdue → `CASES_MANAGE`; addEvidence → `EVIDENCE_ADD` plus `conflictGate`; settingsSave → `SETTINGS_MANAGE`.
  - `publicResolvers.ts`: `publicQueries.eduTechBraveTrackReport` and `publicMutations.eduTechBraveSubmitReport`, each `Object.assign(fn, { wrapperConfig: { skipPermission: true } })`; limiter keys from `context.req.ip ?? "unknown"`; submit `max 5`, track `max 20`, window 900 000 ms; error `"Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу"` code `TOO_MANY_REQUESTS`; wrong code/PIN → `"Хяналтын код эсвэл PIN буруу"` (same message for both); track returns public events only.
  - `schema.ts`: `typeDefs = gql(\`extend schema @link(...) ${caseTypes} type Query { eduTechBraveStatus ... ${caseQueries} } type Mutation { ${caseMutations} }\`)`, `resolvers = { Query: { eduTechBraveStatus, ...caseQueries, ...publicQueries }, Mutation: { ...caseMutations, ...publicMutations } }`.
  - `main.ts`: pass `apiHandlers: intakeHandlers` (Task 5) — add after Task 5.

- [ ] **Step 1:** Write `typeDefs.ts`, `serialize.ts`.
- [ ] **Step 2:** Write `queries.ts`, `mutations.ts`, `publicResolvers.ts`; `Context` typing from `connectionResolvers.ts`; `user` may be undefined for public resolvers (type `Context["user"] | undefined`).
- [ ] **Step 3:** Rewrite `schema.ts`.
- [ ] **Step 4:** Verify: `pnpm run codegen` (root) prints `api/generated/schema.graphql` containing `eduTechBraveSubmitReport`; `pnpm --filter edu-tech-brave_api check` passes; `pnpm test` passes.

### Task 5: Public intake page

**Files:**
- Create: `api/src/modules/intake/page.ts` (exports `renderIntakePage(): string`), `api/src/modules/intake/handlers.ts` (exports `intakeHandlers`)
- Modify: `api/src/main.ts` (add `apiHandlers: intakeHandlers`)

**Interfaces:**
- Produces: `intakeHandlers: { method: "GET"; path: string; resolver: (req, res) => void }[]` for `/intake` and `/intake/`; response `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- Page requirements (fixed copy): title «Эрх хамгаалал — Мэдэгдэл илгээх»; banner «108 — Хүүхдийн тусламжийн утас (24/7, үнэгүй)» plus «Яаралтай тохиолдолд: 102 цагдаа · 103 түргэн тусламж»; notice «Таны мэдэгдэл сургуулийн удирдлагад биш, боловсролын газарт шууд очно. Нэрээ нууцалж болно.»; tabs «Мэдэгдэл илгээх» / «Явц шалгах»; fields for every `EduTechBraveReportInput` field with Mongolian labels and option labels matching `CATEGORY_LABELS_MN` etc. (duplicate the label maps into the page as a JSON literal rendered server-side from `domain.ts`, so one source of truth); POST JSON `{ query, variables }` to the relative URL `graphql`; receipt view shows `caseNumber`, `trackingCode`, `pin` with «Эдгээрийг тэмдэглэж аваарай — дахин харуулахгүй»; track view shows status label, deadline, escalation level and updates. No external assets; CSS variables with `prefers-color-scheme: dark`; max width 40rem, 16px gutters.

- [ ] **Step 1:** Write `page.ts` building the HTML with template literals; inject label maps via `JSON.stringify` into a `<script>` as `window.__LABELS__` — escape `<` as `<`.
- [ ] **Step 2:** Write `handlers.ts`; wire into `main.ts`.
- [ ] **Step 3:** Verify: `pnpm --filter edu-tech-brave_api check` and `pnpm --filter edu-tech-brave_api build` pass; `node -e "import('./api/dist/modules/intake/page.js').then(m=>console.log(m.renderIntakePage().length))"` prints a number > 5000 (run from the repo root after build; dist is CommonJS-free ESM? — api `package.json` has no `"type": "module"`, tsconfig `module: NodeNext` emits CJS for `.ts`; use `node -e "console.log(require('./api/dist/modules/intake/page.js').renderIntakePage().length)"`).

### Task 6: UI foundation — labels, legal basis, formatting, shell

**Files:**
- Create: `ui/src/modules/shared/labels.ts`, `ui/src/modules/shared/legalBasis.ts`, `ui/src/modules/shared/format.ts`, `ui/src/modules/shared/PluginPageHeader.tsx`, `ui/src/modules/shared/graphql.ts`
- Modify: `ui/src/config.tsx`, `ui/src/Main.tsx`, `ui/src/modules/Navigation.tsx`
- Delete: `ui/src/Samples.tsx`, `ui/src/graphql.ts`, `ui/src/pages/IndexPage.tsx` (replaced in Task 10 by `DashboardPage.tsx`; create a placeholder export in Task 6 so `check` passes)

**Interfaces:**
- Produces:
  - `labels.ts`: `STATUS_LABELS`, `SEVERITY_LABELS`, `CATEGORY_LABELS`, `REPORTER_ROLE_LABELS`, `VICTIM_ROLE_LABELS`, `ACCUSED_ROLE_LABELS`, `EVIDENCE_KIND_LABELS`, `EVENT_TYPE_LABELS`, `PROTOCOL_STEP_LABELS` (`Record<string, string>`), `STATUS_BADGE: Record<string, BadgeVariant>` (`new→info`, `under_review→warning`, `investigating→default`, `resolved→success`, `dismissed→secondary`), `SEVERITY_BADGE` (`low→secondary`, `medium→info`, `high→warning`, `critical→destructive`), `ESCALATION_LABELS = ["Хариуцагч", "1-р шат", "2-р шат"]`, `STATUS_OPTIONS`, `SEVERITY_OPTIONS`, `CATEGORY_OPTIONS` … as `{ value, label }[]`; `type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>`.
  - `legalBasis.ts`: `LEGAL_BASIS: Record<string, { law: string; right: string }[]>` keyed by category, plus `LEGAL_DISCLAIMER = "Лавлагаа, хууль зүйн зөвлөгөө биш"`.
  - `format.ts`: `formatDate(iso: string | null | undefined): string` (`YYYY.MM.DD`), `formatDateTime(iso)` (`YYYY.MM.DD HH:mm`), `dueLabel(dueAt: string, isOverdue: boolean, now?: Date): string` (`"3 өдөр хэтэрсэн"` / `"5 цаг үлдсэн"` / `"2 өдөр үлдсэн"`), `toDateInputValue(date: Date): string`.
  - `PluginPageHeader.tsx`: `PluginPageHeader({ crumbs: { label: string; to?: string }[]; icon: Icon; favoriteIcon: string; children?: ReactNode })` rendering `PageHeader` with breadcrumb, favorite toggle and right-side `children`.
  - `shared/graphql.ts`: `STATUS_QUERY` (existing), `SETTINGS_QUERY`, `SETTINGS_SAVE_MUTATION`.
  - `config.tsx`: icon `IconShieldCheck`; `navigationGroup.name = "Эрх хамгаалал"`; `modules: [{ name: "edu-tech-brave", icon: IconLayoutDashboard, path }, { name: "edu-tech-brave-cases", icon: IconFolderOpen, path: \`${path}/cases\` }, { name: "edu-tech-brave-settings", icon: IconSettings, path: \`${path}/settings\` }]`.
  - `Main.tsx`: routes `index → DashboardPage`, `cases → CasesPage`, `settings → SettingsPage` (lazy).
  - `Navigation.tsx`: sidebar group label «Эрх хамгаалал» with items Хяналтын самбар, Хэргүүд, Тохиргоо.

- [ ] **Step 1:** Write the five shared files; create minimal `DashboardPage.tsx`, `CasesPage.tsx` placeholders (header only) so routing compiles.
- [ ] **Step 2:** Rewrite `config.tsx`, `Main.tsx`, `Navigation.tsx`; delete the three old files.
- [ ] **Step 3:** Verify: `pnpm run check` (root) passes.

### Task 7: UI GraphQL documents and cases hook

**Files:**
- Create: `ui/src/modules/cases/graphql.ts`, `ui/src/modules/cases/hooks/useCases.ts`

**Interfaces:**
- Produces:
  - Documents (operation names = field names): `CASES_QUERY` (`eduTechBraveCases` with all filter args and `limit cursor direction`, selecting `_id caseNumber title category severity status schoolName grade assigneeId dueAt isOverdue escalationLevel incidentDate createdAt`), `CASE_DETAIL_QUERY` (all case fields incl. `conflictDeclarations { userId hasConflict note declaredAt }`, `protocolSteps { key doneAt doneBy }`), `CASE_EVENTS_QUERY`, `CASE_EVIDENCE_QUERY`, `CASE_STATS_QUERY`, mutations `CASE_CREATE`, `CASE_DECLARE_CONFLICT`, `CASE_ASSIGN`, `CASE_CHANGE_STATUS`, `CASE_ADD_NOTE`, `CASE_COMPLETE_STEP`, `CASE_ADD_EVIDENCE`, `CASES_ESCALATE`.
  - `useCases(filters: CaseFilters): { cases: CaseRow[]; totalCount: number; loading: boolean; error?: ApolloError; pageInfo?: PageInfo; handleFetchMore: ({ direction }: { direction: EnumCursorDirection }) => Promise<void>; refetch: () => void }` where `CaseFilters = { search?: string; status?: string; severity?: string; category?: string; overdueOnly?: boolean }`, `CaseRow = ResultOf<typeof CASES_QUERY>["eduTechBraveCases"]["list"][number]`, `PAGE_SIZE = 30`, `CASES_CURSOR_SESSION_KEY = "edu_tech_brave_cases_cursor"`; uses `useRecordTableCursor`, `validateFetchMore`, `mergeCursorData` from `erxes-ui` (same shape as the erxes `usePutResponse` hook).

- [ ] **Step 1:** Write `graphql.ts`.
- [ ] **Step 2:** Run `pnpm run codegen`; expected: generates without validation errors.
- [ ] **Step 3:** Write `useCases.ts`; `pnpm run check` passes.

### Task 8: Cases list page

**Files:**
- Create: `ui/src/modules/cases/components/badges.tsx`, `CasesFilterBar.tsx`, `CasesTable.tsx`
- Modify: `ui/src/pages/CasesPage.tsx`

**Interfaces:**
- Consumes: Task 7 hook and types; Task 6 labels/format.
- Produces: `StatusBadge({ status })`, `SeverityBadge({ severity })`, `CategoryBadge({ category })`, `DueBadge({ dueAt, isOverdue, status })`, `EscalationBadge({ level })`; `CasesFilterBar()` reading/writing `search`, `status`, `severity`, `category`, `overdue` via `useMultiQueryState` (Select with an «Бүгд» item mapped to `null`); `CasesTable()` using `RecordTable.Provider` + `CursorProvider` + `CursorBackwardSkeleton` / `CursorForwardSkeleton`, columns typed as `ComponentProps<typeof RecordTable.Provider>["columns"][number]`, row click sets `caseId` query state; empty state «Хэрэг олдсонгүй»; error state with Retry; assignee column via `MembersInline memberIds={[assigneeId]}` from `ui-modules`.
- `CasesPage`: `PluginPageHeader` with «Шинэ хэрэг» button opening `CaseCreateSheet` (Task 9; stub prop until then) and the detail sheet (Task 10).

- [ ] **Step 1:** badges, filter bar, table.
- [ ] **Step 2:** `CasesPage` composition.
- [ ] **Step 3:** `pnpm run check` passes; `pnpm run lint` passes.

### Task 9: Staff intake sheet

**Files:**
- Create: `ui/src/modules/cases/components/CaseCreateSheet.tsx`

**Interfaces:**
- Produces: `CaseCreateSheet({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void })`; controlled form state `ReportForm` with the `EduTechBraveCaseInput` fields; client-side validation mirroring Task 1 rules (same Mongolian messages); submit → `CASE_CREATE`, toast «Хэрэг бүртгэгдлээ», `onCreated(_id)`; on error show `error.message` under the form; `isAnonymous` switch hides the contact field; incident date `<Input type="date" max={today}>`.

- [ ] **Step 1:** Implement with `Sheet` / `Sheet.View` (`edutechbrave:sm:max-w-2xl`), `Label`, `Input`, `Textarea`, `Select`, `Switch`, `Button`.
- [ ] **Step 2:** Wire into `CasesPage`; after create, `refetch()` the list and open the detail sheet.
- [ ] **Step 3:** `pnpm run check` passes.

### Task 10: Case detail sheet

**Files:**
- Create: `ui/src/modules/cases/components/CaseDetailSheet.tsx`, `CaseOverviewTab.tsx`, `CaseProtocolTab.tsx`, `CaseEvidenceTab.tsx`, `CaseTimelineTab.tsx`

**Interfaces:**
- Produces: `CaseDetailSheet()` reads `caseId` via `useQueryState<string>("caseId")`, loads `CASE_DETAIL_QUERY`, renders header (№, title, badges) and `Tabs` «Тойм», «Протокол» (hidden when `protocolSteps` empty), «Нотлох баримт», «Түүх».
  - `CaseOverviewTab({ caseItem, onChanged })`: facts grid; «Хууль зүйн үндэслэл» (Accordion, `LEGAL_BASIS[category]`, disclaimer); «Ашиг сонирхлын мэдүүлэг» card: current user's latest declaration (from `currentUserState` via `useAtomValue` from `jotai`) with two buttons «Зөрчилгүй» / «Зөрчилтэй» + note → `CASE_DECLARE_CONFLICT`; «Хариуцагч»: `SelectMember value={assigneeId} onValueChange → CASE_ASSIGN`; «Төлөв»: buttons for each allowed next status (table mirrored from Task 1 in `labels.ts` as `NEXT_STATUSES: Record<string, string[]>`) with optional note → `CASE_CHANGE_STATUS`; all mutations call `onChanged()` which refetches detail + events.
  - `CaseProtocolTab({ caseItem, onChanged })`: ordered steps with `Checkbox` (disabled when done), done by/at, `CASE_COMPLETE_STEP`; banner «Эдгээр алхмууд удирдлагын шийдвэрээс үл хамааран заавал хэрэгжинэ».
  - `CaseEvidenceTab({ caseId })`: list from `CASE_EVIDENCE_QUERY` (kind badge, title, recordedAt, addedBy via `MembersInline`, checksum first 12 chars in `<code>`, file link via `readImage(fileUrl)` when present); add form (kind Select, title, description, recordedAt `datetime-local`, file via `useErxesUpload({ maxFiles: 1, onFilesAdded })` + `Dropzone`/`DropzoneEmptyState`/`DropzoneContent`); submit → `CASE_ADD_EVIDENCE`, refetch; note «Нотлох баримтыг засах, устгах боломжгүй».
  - `CaseTimelineTab({ caseId })`: vertical timeline from `CASE_EVENTS_QUERY` (icon per type, message, actor via `MembersInline`, time, «Нийтэд харагдана» badge when `isPublic`); add-note form (Textarea + «Мэдэгдэгчид харуулах» Switch) → `CASE_ADD_NOTE`.

- [ ] **Step 1:** Detail sheet shell + overview tab.
- [ ] **Step 2:** Protocol, evidence, timeline tabs.
- [ ] **Step 3:** Mount `CaseDetailSheet` in `CasesPage` and `DashboardPage`; `pnpm run check` and `pnpm run lint` pass.

### Task 11: Dashboard page

**Files:**
- Create: `ui/src/modules/dashboard/components/StatTiles.tsx`, `CategoryBreakdown.tsx`, `RecentCases.tsx`, `HelplineCard.tsx`, `PublicChannelCard.tsx`
- Modify: `ui/src/pages/DashboardPage.tsx`

**Interfaces:**
- Produces: `StatTiles({ stats, loading })` five tiles (нээлттэй, хугацаа хэтэрсэн, шатласан, онц ноцтой, 30 хоногт шийдвэрлэсэн) with icons and destructive accent when overdue > 0; `CategoryBreakdown({ buckets })` horizontal bars (`edutechbrave:bg-primary`, width %); `RecentCases()` uses `useCases({})` first 8 rows, click → `caseId`; `HelplineCard({ text })` with «108» large and the settings `helplineText`; `PublicChannelCard()` showing the intake URL `\`${REACT_APP_API_URL}/pl:edu-tech-brave/intake\`` (import `REACT_APP_API_URL` from `erxes-ui`; fall back to `window.location.origin`) with a copy button (`navigator.clipboard.writeText`, toast «Холбоос хуулагдлаа»).
- `DashboardPage`: `PluginPageHeader` with «Шинэ хэрэг» and «Хэргүүд» buttons; grid: tiles, breakdown + helpline + public channel, recent cases; stats from `CASE_STATS_QUERY` with loading skeletons / error / empty.

- [ ] **Step 1:** Components. **Step 2:** Page. **Step 3:** `pnpm run check` passes.

### Task 12: Settings page

**Files:**
- Modify: `ui/src/pages/SettingsPage.tsx`

**Interfaces:**
- Consumes: `SETTINGS_QUERY`, `SETTINGS_SAVE_MUTATION` (Task 6).
- Produces: form sections «Шийдвэрлэх хугацаа (цаг)» (four `Input type="number" min=1`), «Шатлал» (level 1/2 label + contact), «Байгууллага» (name), «Тусламжийн утас» (text); Save → toast «Тохиргоо хадгалагдлаа»; keeps the existing identity card.

- [ ] **Step 1:** Implement. **Step 2:** `pnpm run check` passes.

### Task 13: Docs and final verification

**Files:**
- Modify: `README.md` (remove merge-conflict markers; describe the plugin, the public intake URL, permissions and the escalation rule), `AGENTS.md` (replace sample-module references with the cases module paths and the `pnpm test` command)

- [ ] **Step 1:** Fix README/AGENTS.
- [ ] **Step 2:** Run from the repo root: `pnpm run check`, `pnpm run lint`, `pnpm run build`, `pnpm --filter edu-tech-brave_api test`. Expected: all exit 0; `ui/dist/remoteEntry.js` exists; `api/dist/main.js` exists.
