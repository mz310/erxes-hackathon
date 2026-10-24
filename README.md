# Edu Tech Brave — «Эрх хамгаалал»

### Erxes academy, Tee ducks

An erxes plugin that lets a district or aimag education department receive
and resolve reports of violations of pupils' and teachers' rights
independently of school management.

It exists because of a 2022 case. A teacher beat a pupil, and the complaint
had to go through the principal, who was the teacher's spouse. The ethics
code and the complaint form both existed. What failed was the structure, so
this plugin enforces the structure in code:

| Rule | How the plugin enforces it |
| ---- | -------------------------- |
| Independent channel | A public page, anonymous if the reporter wants, sends reports to the department's erxes tenant, not to the school. Nothing can be deleted. |
| Nothing is forgotten | Every case gets a number, a due time from its severity, and an assignee. An overdue case escalates to level 1, then to level 2 (24 h later), and each step is logged. |
| Append-only evidence | Photos, medical records and witness statements are stored with the time they were recorded and a SHA-256 checksum. No update or delete mutation exists. |
| Mandatory emergency protocol | For physical violence and sexual harassment there are four steps: medical aid, notify the guardian, separate the accused, report to the authority. A case cannot be resolved until all four are recorded. |
| Conflict of interest | A handler declares any relation to the accused before acting. A declared conflict blocks assignment and status changes. |
| 108 helpline | Shown on the dashboard and on the public page. |

The design is in
[docs/superpowers/specs/2026-10-24-rights-case-management-design.md](docs/superpowers/specs/2026-10-24-rights-case-management-design.md).

## What's inside

| Part   | Path         | Stack                                                                 | Dev port |
| ------ | ------------ | --------------------------------------------------------------------- | -------- |
| API    | `api`        | Node.js 22+, erxes-api-shared `startPlugin`, tenant-scoped Mongoose    | 3399     |
| UI     | `ui`         | React 18 Module Federation remote (Rspack), erxes-ui, Tailwind CSS     | 3099     |
| Shared | `erxes.json` | Plugin identity and ports read by both parts                          |          |

- **Staff UI** inside erxes, at `/edu-tech-brave`, has three pages. The dashboard
  shows KPI tiles, a category breakdown, the 108 card, the public link and
  recent cases. The cases page has filters, an infinite-scroll table and
  a detail sheet. Settings holds the SLA hours, escalation levels and
  helpline text.
- **Demo data**: Settings has a «Жишээ өгөгдөл ачаалах» button. It loads 14
  fictional cases with timelines, protocol steps, evidence and escalations.
  The cases are marked «Жишээ» and the current user becomes their handler.
  Loading works only once per tenant and is refused when
  `NODE_ENV=production`, because nothing in this plugin can be deleted.
- **Public intake page** is `GET /intake` on the plugin API. Through the
  gateway it is reachable without login at
  `<erxes API URL>/pl:edu-tech-brave/intake`. Reporters get a tracking code
  and a PIN and can follow the case's status and public updates.
- **AI assistant (optional, Gemma 4)** suggests a category and severity,
  writes a short brief of a case and its timeline, and can check an
  anonymous public report for details that identify the writer. It only
  suggests; staff decide. It is off until configured; see
  [AI assistant](#ai-assistant).

### Permissions

| Action | Allows |
| ------ | ------ |
| `eduTechBraveCasesRead` | List, view, see timeline and evidence, declare conflict of interest |
| `eduTechBraveCasesCreate` | Register a case on someone's behalf |
| `eduTechBraveCasesManage` | Assign, change status, correct category/severity (tighten-only), add notes, complete protocol steps, run escalation |
| `eduTechBraveEvidenceAdd` | Attach evidence (cannot be removed) |
| `eduTechBraveSettingsManage` | Edit SLA hours, escalation levels, helpline text |
| `eduTechBraveAiUse` | Send case text to the AI model for suggestions and briefs |

Grant them to department staff only. School management gets no access
unless the department decides so.

### AI assistant

Set these in `.env` (see `.env.example`) and restart the API:

- **Google Gemini API.** Set `AI_PROVIDER=google`, `AI_API_KEY=<AI Studio key>`
  and optionally `AI_MODEL` (`gemma-4-26b-a4b-it` by default, or
  `gemma-4-31b-it`). Report text is sent to Google, so check the terms of
  your Gemini API tier before you send real reports: use a billing-enabled
  (paid) project, because on the unpaid tier Google may use prompts to
  improve its products.
- **Self-hosted.** Set `AI_PROVIDER=openai`, `AI_BASE_URL` to an
  OpenAI-compatible server (Ollama `http://localhost:11434/v1`, vLLM, LM
  Studio) and `AI_MODEL` to the Gemma 4 tag you serve. The text stays on
  your own hardware.
- **Public anonymity check.** It is off by default. Turn it on with
  `AI_PUBLIC_PRIVACY_CHECK=true`. It runs only on a self-hosted provider,
  because the public page is used by minors and the Gemini API terms do not
  allow that.

Then grant `eduTechBraveAiUse` to the users who may use it.

Model answers are shown as labelled suggestions and never stored. The
timeline records only that the assistant was used, which model was used
and, for triage, the suggested category and severity. Provider safety
blocks, timeouts and errors all say «гараар шийдвэрлэнэ үү»; none of them
reads as "low risk". The design is in
[docs/superpowers/specs/2026-10-24-ai-assistant-design.md](docs/superpowers/specs/2026-10-24-ai-assistant-design.md).

## Develop

```sh
pnpm install
cp .env.example .env
pnpm run dev:api   # registers with the erxes gateway through Redis
pnpm run dev:ui    # serves http://localhost:3099/remoteEntry.js
pnpm test          # API domain and serializer tests (node --test)
```

In the erxes checkout `.env`, add the plugin and restart the gateway and
core-api so they pick it up:

```sh
ENABLED_PLUGINS=...,edu-tech-brave
```

Then open `http://localhost:3001/edu-tech-brave`. The public page is at
`http://localhost:4000/pl:edu-tech-brave/intake` (gateway) or
`http://localhost:3399/intake` (API directly).

Both processes must use the same Redis as erxes. `UI_ENTRY_URL` must be
reachable by the browser, not merely by the API container. Requests reach the
API through the gateway, which forwards the signed-in user and tenant. Those
headers are not independently authenticated. Keep the API on a private
gateway-only network and strip user/tenant headers at public ingress.

## Scripts

| Script             | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `pnpm run dev:api` | API in watch mode                               |
| `pnpm run dev:ui`  | UI remote dev server                            |
| `pnpm run codegen` | Print the API schema, generate UI GraphQL types |
| `pnpm run build`   | Production build of every part                  |
| `pnpm run check`   | Type-check every part                           |
| `pnpm test`        | API unit tests                                  |
| `pnpm run lint`    | oxlint                                          |
| `pnpm run fmt`     | oxfmt                                           |

## Deploy

- **API**: `docker build --build-arg UI_ENTRY_URL=<remoteEntry.js URL> -t <image> .`
  Run `pnpm install` first and commit its lockfile before building the image.
  The image serves the API on port 80 and registers itself on start
  (`plugin-edu-tech-brave-api:80` unless `LOAD_BALANCER_ADDRESS` is set).
- **UI**: upload `ui/dist` to a static host or CDN. Upload hashed assets
  first and `remoteEntry.js` last with `Cache-Control: no-store`. Without
  `UI_ENTRY_URL`, erxes falls back to `https://plugins.erxes.io/<release>/edu-tech-brave_ui/remoteEntry.js`;
  this generator does not upload there. Set your own browser-reachable URL,
  serve all emitted chunks with CORS for the erxes origin, and use immutable
  caching only for content-hashed assets (not stable-named expose chunks).
- **Public page**: the gateway route `/pl:edu-tech-brave/intake` must be
  reachable from the internet. The page sends a strict Content-Security-Policy
  and rate-limits submissions (5 per 15 min) and tracking lookups (20 per
  15 min) per client IP.

See [docs/erxes-integration.md](docs/erxes-integration.md) for how the plugin
plugs into erxes and [AGENTS.md](AGENTS.md) for the rules to keep it working.
