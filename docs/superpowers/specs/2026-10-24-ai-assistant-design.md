# AI assistant (Gemma 4) and reclassification — design

Amends `2026-10-24-rights-case-management-design.md`. Everything there still
holds; this adds an optional assistant and one tighten-only correction.

## Intent and why

Staff and reporters make three avoidable mistakes:

1. A report lands in the wrong category. A beating filed as «Бусад» from the
   public page never gets the emergency protocol, and until now nothing could
   change a case's category after creation.
2. An anonymous reporter writes their own name, phone number or a detail
   ("I am Bat's mother") that identifies them.
3. A supervisor who receives an escalated case has to read the whole timeline
   before acting.

The assistant uses a Gemma 4 model to *suggest* help for each of these. It never
decides. The only new write path is reclassification, which a human performs
and which can only make a case stricter.

## Non-goals

- Camera or video analysis.
- Any automatic write of a case field, event or evidence record from model
  output.
- Legal advice, notifications, automations (unchanged from the main spec).

## Provider

`api/src/modules/ai/client.ts` talks to one of two HTTP APIs, chosen by env:

| `AI_PROVIDER` | Endpoint | Auth | Default model |
|---|---|---|---|
| `google` | Gemini API `…/v1beta/models/<model>:generateContent` | `x-goog-api-key` header (never `?key=`) | `gemma-4-26b-a4b-it` |
| `openai` | `<AI_BASE_URL>/chat/completions` (Ollama, vLLM, LM Studio) | optional Bearer | `AI_MODEL` required |

When `AI_PROVIDER` is unset the assistant is off and every AI operation
returns `AI_UNAVAILABLE`. A half-configured provider is logged once at
startup and stays off. `AI_TIMEOUT_MS` defaults to 30 000.

On the Gemini API, Gemma 4 thinks by default. In a live test a triage call took ~30 s and ~1 300 thought tokens, and the same call with `thinkingConfig.thinkingLevel: "minimal"` took ~4 s with the same category. In that single sample (a head strike with ongoing pain), however, severity came out one level lower: `high` under `minimal`, `critical` under default and `high` thinking. Category drives the protocol and was right in every run; severity drives the suggested deadline. For that reason the UI never lets an AI suggestion lower a case's severity when it fills the reclassify form (see below). `AI_THINKING_LEVEL` (`minimal` by default, or `high` or `none`) controls this. `high` adds 4 096 tokens to `maxOutputTokens`, because thought tokens count against it, and raises the default timeout to 90 s (~43 s measured). Thought parts (`thought: true`) are dropped. A 500/502/503/504 is retried once, because the API returned a one-off 500 on a valid request during testing.

**Privacy trade-off.** With `google`, report text leaves the department and
goes to Google. With `openai` pointing at a self-hosted Ollama/vLLM it stays
on the department's hardware. The deployment chooses; the docs state it.

**Gemini API terms.** The unpaid tier may use prompts to improve products, may have them read by human reviewers, and says not to send personal information. So use only a billing-enabled (paid) project for real reports. The terms also forbid use in services "directed towards or likely to be accessed by" people under 18. The public intake page is such a service, so the public anonymity check runs only with `AI_PROVIDER=openai` (self-hosted); with `google` it is ignored and a warning is logged.

## Invariants

- **Suggestion only.** Model output is returned to the caller and shown as a
  labelled suggestion («AI-ийн санал. Шийдвэрийг та гаргана.»). No resolver
  writes model output into a case field.
- **Fail closed.** Provider safety blocks (`promptFeedback.blockReason`,
  `finishReason` SAFETY/PROHIBITED_CONTENT/…, OpenAI `content_filter` or
  `refusal`), empty answers, 429, timeouts and unparseable answers are distinct
  `AiError` codes. Each maps to a Mongolian message that says to decide by
  hand. None reads as low severity, not urgent or "no risk".
- **Minimal prompt.** Prompts never include `reporterContact`,
  `trackingCode`, user ids, conflict declarations or the PIN hash. Report
  text is fenced in `<report>`/`<case>` tags, with our own tag names
  stripped from it. Instructions say to treat it as data.
- **Validated answers.** Triage enums are parsed with zod against the
  plugin's enums. Unknown values are rejected, not coerced. Privacy findings
  are kept only if the quoted text really occurs in the input.
- **Audit without content.** Every staff call on an existing case logs one
  `ai_assist` event with `isPublic: false`. Its payload holds `task`,
  `provider`, `model` and, for triage, only `category`/`severity`/`urgent`.
  The prompt and model prose are never stored. Earlier `ai_assist` events are
  not fed into later summaries.
- **Own permission.** `eduTechBraveAiUse` is required for every staff AI
  operation, in addition to read or create. Sending case text to a model is a
  data-processing decision the department grants separately.

## Tasks

- **Triage.** `eduTechBraveAiTriageDraft(input)` serves the staff intake form
  (needs `CasesCreate`). Nothing is stored. `eduTechBraveAiTriageCase(_id)`
  serves an existing case (needs `CasesRead`) and logs `ai_assist`. Both
  return `{ category severity urgent protocolRecommended reasons model }`.
  `protocolRecommended` is derived from the category in code, not by the
  model.
- **Brief.** `eduTechBraveAiSummarizeCase(_id)` returns `{ summary model }`
  (needs `CasesRead`) and logs `ai_assist`. Input is the case facts, protocol
  state, evidence kinds/titles/dates and the last 60 events (type, date,
  message ≤ 400 chars). It excludes `ai_assist` and `conflict_declared`
  events.
- **Anonymity check (public).** `eduTechBravePublicPrivacyCheck(input)` takes
  `{ title description incidentLocation accusedDescription }` and returns
  `{ risks [{ quote reason }] aiChecked }`.
  - Off unless `AI_PUBLIC_PRIVACY_CHECK=true`, enforced in the resolver.
  - Uses `skipPermission` and is rate-limited 10 / 15 min per IP plus 300 /
    15 min overall.
  - Nothing is stored or logged.
  - `detectContactDetails` (pattern-based: e-mail, Mongolian phone numbers,
    `@handles`) runs first and always. When the model fails, those findings
    still return, with `aiChecked: false`.

Text bounds for all tasks match a report: title ≤ 200, description 10–5000,
location ≤ 200, accused description ≤ 1000.

## Reclassification

`eduTechBraveCaseReclassify(_id, category, severity, note!)` →
`EduTechBraveCase`, needs `eduTechBraveCasesManage` and the conflict gate.
Pure rule `planReclassify` in `domain.ts`:

- Open statuses only.
- `note` is required, 3–2000 characters.
- No-op changes are refused.
- Protocol steps are added when the new category requires them and the case
  has none. Existing steps are never removed.
- `dueAt = min(current dueAt, createdAt + slaHours[new severity])`. A
  deadline can move earlier but never later. Severity may be lowered, but the
  deadline stays.
- The update matches on the status/category/severity/dueAt the plan was
  computed from, so concurrent changes are not lost.
- It logs a `reclassified` event (`isPublic: false`) with from/to, note and
  `addedProtocol`.

**Known trade-off.** A case moved *out of* a protocol category keeps its
four steps, and `→resolved` still requires all of them. Staff must either
complete the steps or dismiss the case. Removing the requirement would let a
reclassification escape the emergency protocol, which is the exact failure
this plugin exists to prevent.

## Schema additions

- `EduTechBraveEventType` gains `reclassified` and `ai_assist`.
- New types: `EduTechBraveAiStatus { enabled provider model publicPrivacyCheck }`,
  `EduTechBraveAiTriage`, `EduTechBraveAiSummary`, `EduTechBraveAiPrivacyRisk`,
  `EduTechBraveAiPrivacyCheck`, and the inputs `EduTechBraveAiTriageInput` and
  `EduTechBravePrivacyCheckInput`.
- `eduTechBraveCases` also gains `openOnly` and `unassignedOnly`, for the
  dashboard links.

## UI

`ui/src/modules/ai/` adds three pieces:

- `CaseClassificationCard`: reclassify form plus «AI-аар санал авах». «Саналыг маягтад оруулах» copies the suggested category and the higher of the current and suggested severity. Staff can still lower severity by hand, with a reason.
- `CaseAiSummaryCard`: the brief.
- `AiDraftTriage`: the suggestion in the staff intake form, whose «Хэрэглэх»
  fills the form only.

Every card hides while `eduTechBraveAiStatus` loads or when AI is off, and
shows a quiet note if the status query errors. The public page shows the
anonymity check on its review screen when the reporter chose anonymity and
the server enabled the check. A notice next to the button says the text is
sent to an AI model.
