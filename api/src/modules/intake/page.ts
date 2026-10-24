import {
  ACCUSED_ROLES,
  CASE_SEVERITIES,
  CATEGORY_LABELS_MN,
  REPORTER_ROLES,
  REPORTER_ROLE_LABELS_MN,
  type AccusedRole,
  type CaseCategory,
  type CaseSeverity,
  type ReporterRole,
  type VictimRole,
} from "../cases/domain.ts";

// Self-contained public intake page (Mongolian, mobile-first, light/dark).
// It is a one-question-per-screen wizard written for a frightened child:
// a friendly helper asks each question in a speech bubble and the screens
// slide forward as answers are tapped. No external assets: everything the
// browser needs is in this one response, so the page works wherever the
// gateway proxies /pl:edu-tech-brave/intake. It talks to the sibling
// `graphql` endpoint with a relative URL.
//
// The nonce CSP (see handlers.ts) forbids inline `style="…"` and `on…=`
// attributes; the script toggles classes and the `hidden` attribute instead.

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Category choices in a child's words. The staff UI keeps CATEGORY_LABELS_MN;
// the generated case title uses those formal labels too.
export const CHILD_CATEGORY_LABELS: Record<CaseCategory, string> = {
  physical_violence: "Зодсон, цохисон, түлхсэн",
  psychological_violence: "Хашгирсан, айлгасан, доромжилсон",
  bullying: "Дээрэлхсэн, шоолсон",
  sexual_harassment: "Бэлгийн шинжтэй зүй бус үйлдэл, хүрэлцсэн",
  discrimination: "Ялгаварласан, гадуурхсан",
  unfair_assessment: "Дүнг шударга бус тавьсан",
  privacy_breach: "Миний хувийн мэдээллийг задруулсан",
  neglect_of_duty: "Хэлсэн ч сургууль арга хэмжээ аваагүй, нуусан",
  teacher_labor_rights: "Багшийн хөдөлмөрийн эрх зөрчсөн",
  other: "Өөр зүйл",
};

// Display order: the most common situations first.
const CATEGORY_ORDER: readonly CaseCategory[] = [
  "physical_violence",
  "psychological_violence",
  "bullying",
  "sexual_harassment",
  "discrimination",
  "unfair_assessment",
  "privacy_breach",
  "neglect_of_duty",
  "teacher_labor_rights",
  "other",
];

// Only adults at work can report these; children never see them.
export const STAFF_ONLY_CATEGORIES: readonly CaseCategory[] = ["teacher_labor_rights"];
const STAFF_REPORTERS: readonly ReporterRole[] = ["teacher", "staff"];

// "How bad is it?" asked through examples instead of low/medium/high words.
export const SEVERITY_CHOICES: readonly { label: string; value: CaseSeverity }[] = [
  { label: "Гэмтсэн, эсвэл одоо ч үргэлжилж байна", value: "critical" },
  { label: "Их айсан, өвдсөн", value: "high" },
  { label: "Дахин дахин болдог", value: "medium" },
  { label: "Нэг удаа болсон, гэмтээгүй", value: "low" },
];

// A frightened child may play down what happened. These categories never go
// below `high`, so the SLA is not silently stretched. Answering "not safe now"
// always makes the case `critical`.
export const SEVERITY_FLOOR: Partial<Record<CaseCategory, CaseSeverity>> = {
  physical_violence: "high",
  sexual_harassment: "high",
};

// The "it happened to me" answer, resolved from who is reporting. A parent
// sees "my child" instead, which is a student.
export const SELF_VICTIM_ROLE: Record<ReporterRole, VictimRole> = {
  student: "student",
  parent: "student",
  teacher: "teacher",
  staff: "staff",
  other: "other",
};

const VICTIM_CHOICES: readonly { label: string; value: VictimRole | "self"; only?: "parent" | "not-parent" }[] = [
  { label: "Надад", value: "self", only: "not-parent" },
  { label: "Миний хүүхдэд", value: "student", only: "parent" },
  { label: "Өөр сурагчид", value: "student" },
  { label: "Багшид", value: "teacher" },
  { label: "Ажилтанд", value: "staff" },
  { label: "Өөр хүнд", value: "other" },
];

const ACCUSED_LABELS: Record<AccusedRole, string> = {
  teacher: "Багш",
  administrator: "Сургуулийн удирдлага",
  student: "Сурагч",
  staff: "Ажилтан",
  other: "Өөр хүн",
};

const LOCATION_CHOICES: readonly string[] = [
  "Ангид",
  "Коридорт",
  "Биеийн тамирын зааланд",
  "Бие засах газарт",
  "Сургуулийн гадаа, талбайд",
  "Сургуулиас гадуур",
];

const TOTAL_QUESTIONS = 11;

const AVATAR = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"/><path d="M9 10h.01M15 10h.01"/></svg>`;
const ARROW = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`;
const PHONE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>`;

const bubble = (step: string, question: string, hint?: string): string =>
  `<div class="helper"><div class="avatar">${AVATAR}</div><div class="bubble"><h2 class="q" id="q-${step}" tabindex="-1">${escapeHtml(
    question,
  )}</h2>${hint ? `<p class="hint">${escapeHtml(hint)}</p>` : ""}</div></div>`;

const chip = (field: string, value: string, label: string, extra = ""): string =>
  `<button type="button" class="chip" data-pick="${field}" data-value="${escapeHtml(
    value,
  )}" aria-pressed="false"${extra}>${escapeHtml(label)}</button>`;

const chips = (step: string, body: string): string =>
  `<div class="chips" role="group" aria-labelledby="q-${step}">${body}</div>`;

const screen = (step: string, question: number | null, body: string): string =>
  `<section class="screen" data-step="${step}"${
    question ? ` data-n="${question}"` : ""
  } aria-labelledby="q-${step}" hidden>${body}</section>`;

const next = (label = "Үргэлжлүүлэх", id = ""): string =>
  `<button type="button" class="btn" data-action="continue"${id ? ` id="${id}"` : ""}>${escapeHtml(label)}</button>`;

export type IntakePageOptions = {
  // Server switch (AI_PUBLIC_PRIVACY_CHECK). When false the block is not
  // rendered at all, and the API refuses the check anyway.
  privacyCheck?: boolean;
};

// Optional anonymity check on the review screen, shown by the script only
// when the reporter chose to stay anonymous. Results are filled with
// textContent; the notice says the text goes to an AI model.
const PRIVACY_BLOCK = `
      <div class="privacy" id="privacy" hidden>
        <p class="privacy-note">Бичсэн зүйл чинь чамайг таниулчих вий гэж санаа зовж байна уу? Шалгуулж болно. Шалгахад текстийг AI загвар руу илгээнэ. Бид энэ шалгалтыг хадгалахгүй.</p>
        <button type="button" class="btn ghost" id="privacy-check" data-action="privacy-check">Намайг таниулах зүйл байна уу? Шалгах</button>
        <div class="privacy-result" id="privacy-result" hidden>
          <p class="privacy-summary" id="privacy-summary"></p>
          <ul class="privacy-list" id="privacy-list"></ul>
        </div>
        <p class="error" id="privacy-error" role="alert" hidden></p>
      </div>`;

const screens = (options: IntakePageOptions): string =>
  [
    screen(
      "welcome",
      null,
      `${bubble("welcome", "Сайн уу. Би чамд туслах болно.", "Хэдхэн асуулт асууна. Нэрээ хэлэх шаардлагагүй.")}
      <div class="info"><p>Чиний мэдэгдэл сургуулийн удирдлагад биш, боловсролын газарт шууд очно. Мэдэгдэл бүрт хариуцагч, шийдвэрлэх хугацаа өгөгдөнө.</p></div>
      <div class="info helpline" role="note"><div class="num">108</div><p><strong>108 — Хүүхдийн тусламжийн утас (24/7, үнэгүй)</strong><br>Яаралтай үед: 102 цагдаа · 103 түргэн тусламж</p></div>
      <div class="actions">
        <button type="button" class="btn" data-action="start">Эхлэх</button>
        <button type="button" class="btn link" data-action="track">Өмнө илгээсэн бол: явцаа шалгах</button>
      </div>
      <p class="fine">Энэ суваг гомдлыг шийдэх хүн буруутгагдаж буй хүнтэй холбоогүй байх зарчмаар ажилладаг.</p>`,
    ),
    screen(
      "safety",
      1,
      `${bubble("safety", "Чи одоо аюулгүй газар байна уу?", "Үнэнээ хэлээрэй. Чамайг хэн ч буруутгахгүй.")}
      ${chips("safety", chip("safety", "yes", "Тийм, аюулгүй") + chip("safety", "no", "Үгүй, айж байна"))}`,
    ),
    screen(
      "unsafe",
      null,
      `${bubble(
        "unsafe",
        "Чамайг аюулгүй байлгах нь хамгийн чухал.",
        "Одоо шууд 108 руу залга. Үнэгүй, 24 цаг ажилладаг. Аюул ойрхон байвал 102 руу залга.",
      )}
      <div class="actions">
        <a class="btn danger" href="tel:108">108 руу залгах</a>
        <a class="btn ghost" href="tel:102">102 — Цагдаа</a>
        <button type="button" class="btn link" data-action="continue">Дараа нь энд үргэлжлүүлэх</button>
      </div>`,
    ),
    screen(
      "reporter",
      2,
      `${bubble("reporter", "Чи хэн бэ?")}
      ${chips("reporter", REPORTER_ROLES.map((role) => chip("reporter", role, REPORTER_ROLE_LABELS_MN[role])).join(""))}`,
    ),
    screen(
      "victim",
      3,
      `${bubble("victim", "Энэ хэнд тохиолдсон бэ?")}
      ${chips(
        "victim",
        VICTIM_CHOICES.map((choice) =>
          chip("victim", choice.value, choice.label, choice.only ? ` data-only="${choice.only}"` : ""),
        ).join(""),
      )}`,
    ),
    screen(
      "category",
      4,
      `${bubble("category", "Юу болсон бэ?", "Хамгийн ойрыг нь сонго. Дараа нь өөрийнхөөрөө бичиж болно.")}
      ${chips(
        "category",
        CATEGORY_ORDER.map((category) =>
          chip(
            "category",
            category,
            CHILD_CATEGORY_LABELS[category],
            STAFF_ONLY_CATEGORIES.includes(category) ? " data-staff-only" : "",
          ),
        ).join(""),
      )}`,
    ),
    screen(
      "accused",
      5,
      `${bubble("accused", "Хэн ийм зүйл хийсэн бэ?", "Нэрийг нь хэлэх албагүй.")}
      ${chips("accused", ACCUSED_ROLES.map((role) => chip("accused", role, ACCUSED_LABELS[role], " data-stay")).join(""))}
      <div class="field">
        <label for="accused-description">Тухайн хүний тухай (заавал биш)</label>
        <input type="text" id="accused-description" maxlength="1000" autocomplete="off" placeholder="жишээ нь: орос хэлний багш">
      </div>
      <div class="actions">${next()}<button type="button" class="btn link" data-action="skip">Хэлэхийг хүсэхгүй байна</button></div>`,
    ),
    screen(
      "date",
      6,
      `${bubble("date", "Хэзээ болсон бэ?")}
      ${chips(
        "date",
        chip("date", "0", "Өнөөдөр") +
          chip("date", "1", "Өчигдөр") +
          chip("date", "3", "Сүүлийн долоо хоногт") +
          chip("date", "custom", "Өөр өдөр", ' data-reveal="date-custom"'),
      )}
      <div class="reveal" id="date-custom" hidden>
        <div class="field">
          <label for="incident-date">Огноо сонго</label>
          <input type="date" id="incident-date">
        </div>
        <div class="actions">${next()}</div>
      </div>`,
    ),
    screen(
      "school",
      7,
      `${bubble("school", "Аль сургууль дээр болсон бэ?")}
      <div class="field">
        <label for="school">Сургуулийн нэр, дүүрэг</label>
        <input type="text" id="school" maxlength="200" autocomplete="off" placeholder="жишээ нь: 12-р сургууль, Баянзүрх">
      </div>
      <div class="field">
        <label for="grade">Анги (заавал биш)</label>
        <input type="text" id="grade" maxlength="50" autocomplete="off" placeholder="жишээ нь: 5а">
      </div>
      <div class="actions">${next()}</div>`,
    ),
    screen(
      "location",
      8,
      `${bubble("location", "Хаана болсон бэ?")}
      ${chips(
        "location",
        LOCATION_CHOICES.map((place) => chip("location", place, place)).join("") +
          chip("location", "custom", "Өөр газар", ' data-reveal="location-custom"'),
      )}
      <div class="reveal" id="location-custom" hidden>
        <div class="field">
          <label for="incident-location">Хаана болсныг бичээрэй</label>
          <input type="text" id="incident-location" maxlength="200" autocomplete="off">
        </div>
        <div class="actions">${next()}</div>
      </div>
      <div class="actions"><button type="button" class="btn link" data-action="skip">Алгасах</button></div>`,
    ),
    screen(
      "severity",
      9,
      `${bubble("severity", "Хэр хүнд байна?", "Аль нь хамгийн ойр байна?")}
      ${chips("severity", SEVERITY_CHOICES.map((choice) => chip("severity", choice.value, choice.label)).join(""))}`,
    ),
    screen(
      "details",
      10,
      `${bubble(
        "details",
        "Юу болсныг өөрийнхөөрөө бичээрэй.",
        "Хэзээ, хаана, яаж болсон. Гэрч байсан бол дурдаарай. Алдаатай бичсэн ч зүгээр.",
      )}
      <div class="field">
        <label for="details" class="sr-only">Юу болсон</label>
        <textarea id="details" maxlength="5000" aria-describedby="details-count"></textarea>
        <p class="counter" id="details-count">Дор хаяж 10 үсэг бичээрэй.</p>
      </div>
      <div class="actions">${next()}</div>`,
    ),
    screen(
      "anonymity",
      11,
      `${bubble("anonymity", "Нэрээ нууцлах уу?", "Нууцалбал хэн ч чамайг мэдэхгүй. Явцаа код, PIN-ээр шалгана.")}
      ${chips(
        "anonymity",
        chip("anonymity", "yes", "Тийм, нууцлая") +
          chip("anonymity", "no", "Үгүй, надтай холбогдож болно", ' data-reveal="contact-wrap"'),
      )}
      <div class="reveal" id="contact-wrap" hidden>
        <div class="field">
          <label for="contact">Утас эсвэл и-мэйл</label>
          <input type="text" id="contact" maxlength="200" autocomplete="off">
          <p class="counter">Зөвхөн чамтай холбогдох шаардлагатай үед ашиглана.</p>
        </div>
        <div class="actions">${next()}</div>
      </div>`,
    ),
    screen(
      "review",
      null,
      `${bubble("review", "Зөв бөглөсөн эсэхийг шалгаарай.", "Засах бол мөрөн дээр нь дар.")}
      <div class="review" id="review-list"></div>${options.privacyCheck ? PRIVACY_BLOCK : ""}
      <p class="error" id="submit-error" role="alert" hidden></p>
      <div class="actions">
        <button type="button" class="btn" id="submit" data-action="submit">Илгээх</button>
        <p class="fine">Илгээснээр мэдэгдэл боловсролын газрын хэргийн бүртгэлд орж, хариуцагч томилогдоно.</p>
      </div>`,
    ),
    screen(
      "receipt",
      null,
      `${bubble("receipt", "Баярлалаа. Чи зөв зүйл хийлээ.", "Чиний мэдэгдэл бүртгэгдлээ. Удахгүй хариуцагч томилогдоно.")}
      <p class="case-no" id="receipt-number"></p>
      <div class="codes">
        <div class="code"><small>Хяналтын код</small><strong id="receipt-code"></strong></div>
        <div class="code"><small>PIN</small><strong id="receipt-pin"></strong></div>
      </div>
      <p class="warn">Эдгээрийг тэмдэглэж аваарай — дахин харуулахгүй</p>
      <div class="actions">
        <button type="button" class="btn ghost" id="copy" data-action="copy">Хуулж авах</button>
        <button type="button" class="btn" data-action="receipt-track">Явцаа шалгах</button>
      </div>
      <p class="fine">Дэлгэцийн зураг (screenshot) авч хадгалж болно.</p>`,
    ),
    screen(
      "track-code",
      null,
      `${bubble("track-code", "Хяналтын кодоо бичээрэй.", "Мэдэгдэл илгээхэд өгсөн 10 тэмдэгт.")}
      <div class="field">
        <label for="tracking-code" class="sr-only">Хяналтын код</label>
        <input type="text" id="tracking-code" maxlength="10" autocomplete="off" autocapitalize="characters" spellcheck="false" class="mono">
      </div>
      <div class="actions">${next()}</div>`,
    ),
    screen(
      "track-pin",
      null,
      `${bubble("track-pin", "Одоо PIN-ээ бичээрэй.", "6 оронтой тоо.")}
      <div class="field">
        <label for="pin" class="sr-only">PIN</label>
        <input type="text" id="pin" maxlength="6" inputmode="numeric" autocomplete="off" class="mono">
      </div>
      <p class="error" id="track-error" role="alert" hidden></p>
      <div class="actions">${next("Шалгах", "track-submit")}</div>`,
    ),
    screen(
      "track-result",
      null,
      `${bubble("track-result", "Чиний мэдэгдлийн явц", "Шинэ мэдээлэл гарвал энд харагдана.")}
      <div class="info">
        <p class="case-number" id="track-number"></p>
        <span class="status" id="track-status"></span>
        <div class="meta">
          <div><small>Бүртгэсэн</small><span id="track-created"></span></div>
          <div><small>Шийдвэрлэх хугацаа</small><span id="track-due"></span></div>
          <div><small>Шатлал</small><span id="track-level"></span></div>
        </div>
        <h3 class="section-title">Явц</h3>
        <ul class="timeline" id="track-updates"></ul>
      </div>`,
    ),
  ].join("\n");

// Values the browser script needs. `<` is escaped so the block can never
// close its own <script> element.
const pageData = (): string =>
  JSON.stringify({
    total: TOTAL_QUESTIONS,
    categoryTitles: CATEGORY_LABELS_MN,
    severityRank: CASE_SEVERITIES,
    severityFloor: SEVERITY_FLOOR,
    selfVictim: SELF_VICTIM_ROLE,
    staffReporters: STAFF_REPORTERS,
  }).replace(/</g, "\\u003c");

const css = `
  :root {
    --page: #dfe0f7; --bg: #eef0ff; --bg2: #f8f7ff; --card: #ffffff; --text: #25224a; --muted: #6d6aa8;
    --primary: #6c63ff; --primary-ink: #ffffff; --line: #d9d7ff; --chip-ink: #3a36a0; --frame: #16142e;
    --sos-bg: #ffe1e1; --sos-ink: #b3261e; --call: #d92d20; --call-ink: #ffffff;
    --danger: #b42318; --danger-bg: #fef3f2; --ok: #067647; --ok-bg: #ecfdf3; --warn-bg: #fff4e5; --warn-ink: #8a4b00;
    --shadow: rgba(80, 70, 200, 0.14);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --page: #0b0a1c; --bg: #15132e; --bg2: #1b1940; --card: #24225a; --text: #ecebff; --muted: #aeabe6;
      --primary: #8b84ff; --primary-ink: #0f0d2b; --line: #3d3a7a; --chip-ink: #dcd9ff; --frame: #000000;
      --sos-bg: #4a1c22; --sos-ink: #ffb4ab; --call: #ff6b5e; --call-ink: #1d0605;
      --danger: #ffb4ab; --danger-bg: #3b1a1f; --ok: #6ee7a8; --ok-bg: #12301f; --warn-bg: #3a2a10; --warn-ink: #f6c177;
      --shadow: rgba(0, 0, 0, 0.35);
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: var(--bg); color: var(--text);
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif;
    -webkit-text-size-adjust: 100%;
  }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .app { display: flex; flex-direction: column; height: 100vh; height: 100dvh; background: linear-gradient(var(--bg), var(--bg2)); }
  @media (min-width: 560px) {
    body { background: var(--page); display: grid; place-items: center; padding: 24px; }
    .app { width: 400px; height: min(820px, calc(100vh - 48px)); border: 10px solid var(--frame); border-radius: 44px;
      box-shadow: 0 24px 60px var(--shadow); overflow: hidden; }
  }

  .bar { display: flex; align-items: center; gap: 12px; padding: 14px 16px 8px; flex: none; }
  .back { width: 42px; height: 42px; border-radius: 50%; border: 0; background: var(--card); color: var(--chip-ink);
    display: grid; place-items: center; cursor: pointer; flex: none; box-shadow: 0 2px 8px var(--shadow); }
  .progress { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .progress span { font-size: 0.8rem; font-weight: 700; color: var(--muted); }
  .progress .track { height: 6px; border-radius: 6px; background: var(--line); overflow: hidden; }
  .progress b { display: block; height: 100%; width: 0; background: var(--primary); border-radius: 6px; transition: width 0.4s ease; }
  .is-hidden { visibility: hidden; }
  .sos { flex: none; margin-left: auto; display: flex; gap: 6px; align-items: center; background: var(--sos-bg); color: var(--sos-ink);
    border-radius: 999px; padding: 9px 14px; font-weight: 800; text-decoration: none; }

  .stage { position: relative; flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; }
  .screen { display: flex; flex-direction: column; min-height: 100%; padding: 8px 18px 26px; }
  .screen[hidden] { display: none; }
  .screen.in-fwd { animation: in-fwd 0.42s cubic-bezier(0.22, 0.8, 0.3, 1) both; }
  .screen.in-back { animation: in-back 0.42s cubic-bezier(0.22, 0.8, 0.3, 1) both; }
  .screen.out-fwd, .screen.out-back { position: absolute; top: 0; left: 0; right: 0; pointer-events: none; }
  .screen.out-fwd { animation: out-fwd 0.3s ease both; }
  .screen.out-back { animation: out-back 0.3s ease both; }
  @keyframes in-fwd { from { opacity: 0; transform: translateX(56px); } to { opacity: 1; transform: none; } }
  @keyframes in-back { from { opacity: 0; transform: translateX(-56px); } to { opacity: 1; transform: none; } }
  @keyframes out-fwd { to { opacity: 0; transform: translateX(-56px); } }
  @keyframes out-back { to { opacity: 0; transform: translateX(56px); } }
  @keyframes pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) {
    .screen.in-fwd, .screen.in-back, .bubble { animation: none; }
    .screen.out-fwd, .screen.out-back { display: none; }
    .progress b { transition: none; }
  }

  .helper { display: flex; gap: 12px; align-items: flex-end; margin: 6px 0 20px; }
  .avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--primary); color: var(--primary-ink);
    display: grid; place-items: center; flex: none; }
  .bubble { background: var(--card); border-radius: 22px 22px 22px 6px; padding: 14px 16px; box-shadow: 0 6px 18px var(--shadow);
    animation: pop 0.35s ease 0.08s both; }
  .q { margin: 0; font-size: 1.3rem; line-height: 1.3; font-weight: 800; outline: none; }
  .hint { margin: 6px 0 0; color: var(--muted); font-size: 0.92rem; }

  .chips { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
  .chip { font: inherit; font-weight: 600; text-align: right; max-width: 92%; padding: 11px 18px; cursor: pointer;
    background: var(--card); color: var(--chip-ink); border: 2px solid var(--line); border-radius: 999px;
    transition: transform 0.12s ease, background 0.2s ease, border-color 0.2s ease; }
  .chip:active { transform: scale(0.97); }
  .chip[aria-pressed="true"] { background: var(--primary); border-color: var(--primary); color: var(--primary-ink); }
  .chip[hidden] { display: none; }
  .chip:focus-visible, .btn:focus-visible, .back:focus-visible, .sos:focus-visible, .row:focus-visible {
    outline: 3px solid var(--primary); outline-offset: 2px; }

  .field { margin-top: 14px; }
  .field label { display: block; font-weight: 600; font-size: 0.92rem; margin-bottom: 6px; }
  .field input, .field textarea { width: 100%; padding: 13px 14px; font: inherit; color: var(--text); background: var(--card);
    border: 2px solid var(--line); border-radius: 16px; }
  .field textarea { min-height: 170px; resize: vertical; }
  .field input:focus, .field textarea:focus { outline: none; border-color: var(--primary); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 1.3rem; letter-spacing: 0.12em; text-transform: uppercase; }
  .counter { color: var(--muted); font-size: 0.85rem; margin: 6px 0 0; }
  .reveal[hidden] { display: none; }

  .actions { margin-top: auto; padding-top: 22px; display: flex; flex-direction: column; gap: 10px; }
  .reveal .actions { margin-top: 0; }
  .btn { display: block; width: 100%; padding: 15px 18px; font: inherit; font-weight: 800; text-align: center; text-decoration: none;
    border: 0; border-radius: 999px; background: var(--primary); color: var(--primary-ink); cursor: pointer; }
  .btn[disabled] { opacity: 0.45; cursor: not-allowed; }
  .btn.ghost { background: transparent; color: var(--chip-ink); border: 2px solid var(--line); }
  .btn.link { background: transparent; color: var(--muted); font-weight: 600; padding: 8px; }
  .btn.danger { background: var(--call); color: var(--call-ink); font-size: 1.1rem; }
  .btn[hidden] { display: none; }

  .info { background: var(--card); border-radius: 18px; padding: 14px 16px; margin-top: 12px; font-size: 0.93rem; }
  .info p { margin: 0; }
  .helpline { display: flex; gap: 14px; align-items: center; background: var(--warn-bg); color: var(--warn-ink); }
  .helpline .num { font-size: 1.9rem; font-weight: 800; line-height: 1; }
  .fine { color: var(--muted); font-size: 0.82rem; text-align: center; margin: 14px 0 0; }

  .review { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; padding: 12px 14px;
    font: inherit; text-align: left; color: var(--text); background: var(--card); border: 0; border-radius: 16px; cursor: pointer; }
  .row small { display: block; color: var(--muted); font-size: 0.78rem; font-weight: 600; }
  .row .v { display: block; font-weight: 600; overflow-wrap: anywhere; }
  .row .edit { flex: none; color: var(--primary); font-weight: 700; font-size: 0.85rem; }

  .case-no { text-align: center; font-weight: 800; color: var(--muted); margin: 0 0 10px; }
  .codes { display: grid; gap: 10px; margin-bottom: 12px; }
  .code { background: var(--card); border-radius: 18px; padding: 14px; text-align: center; }
  .code small { display: block; color: var(--muted); font-weight: 600; }
  .code strong { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 1.7rem; letter-spacing: 0.1em; }
  .warn { background: var(--warn-bg); color: var(--warn-ink); border-radius: 14px; padding: 10px 12px; font-weight: 700; text-align: center; margin: 0; }
  .error { background: var(--danger-bg); color: var(--danger); border-radius: 14px; padding: 12px 14px; margin: 14px 0 0; white-space: pre-wrap; }
  .error[hidden] { display: none; }

  .privacy { background: var(--card); border-radius: 18px; padding: 14px 16px; margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
  .privacy[hidden], .privacy-result[hidden] { display: none; }
  .privacy-note { margin: 0; color: var(--muted); font-size: 0.88rem; }
  .privacy-summary { margin: 0; font-weight: 700; }
  .privacy-list { margin: 6px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 0.92rem; }
  .privacy-list strong { overflow-wrap: anywhere; }

  .case-number { font-weight: 800; font-size: 1.3rem; margin: 0 0 6px; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 0.9rem; background: var(--bg); }
  .status.ok { background: var(--ok-bg); color: var(--ok); }
  .status.bad { background: var(--danger-bg); color: var(--danger); }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
  .meta div { background: var(--bg); border-radius: 12px; padding: 10px 12px; }
  .meta small { display: block; color: var(--muted); font-size: 0.78rem; }
  .section-title { margin: 12px 0 10px; font-size: 1rem; }
  .timeline { list-style: none; padding: 0; margin: 0; }
  .timeline li { position: relative; padding: 0 0 14px 22px; border-left: 2px solid var(--line); margin-left: 6px; }
  .timeline li::before { content: ""; position: absolute; left: -7px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--primary); }
  .timeline time { display: block; color: var(--muted); font-size: 0.85rem; }
`;

// Plain ES5-style browser script. String.raw keeps backslashes literal; the
// script must not contain backticks or "${" because it lives in a template.
const js = String.raw`
  (function () {
    "use strict";
    var base = location.pathname.replace(/intake\/?$/, "");
    var endpoint = base + "graphql";
    var DATA = JSON.parse(document.getElementById("intake-data").textContent);

    var ORDER = ["safety", "reporter", "victim", "category", "accused", "date", "school", "location", "severity", "details", "anonymity", "review"];
    var REQUIRED = ["reporter", "victim", "category", "date", "school", "severity", "details", "anonymity"];
    var SUBMIT = "mutation EduTechBraveIntakeSubmit($input: EduTechBraveReportInput!) { eduTechBraveSubmitReport(input: $input) { caseNumber trackingCode pin } }";
    var PRIVACY = "mutation EduTechBraveIntakePrivacy($input: EduTechBravePrivacyCheckInput!) { eduTechBravePublicPrivacyCheck(input: $input) { risks { quote reason } aiChecked } }";
    var TRACK = "query EduTechBraveIntakeTrack($trackingCode: String!, $pin: String!) { eduTechBraveTrackReport(trackingCode: $trackingCode, pin: $pin) { caseNumber status statusLabel createdAt dueAt isOverdue escalationLevel updates { message createdAt } } }";

    var answers = {};
    var unsafe = false;
    var editing = false;
    var busy = false;
    var gen = Date.now();
    var stack = [];
    var current = null;

    function $(id) { return document.getElementById(id); }
    function each(list, fn) { Array.prototype.forEach.call(list, fn); }
    function screenOf(step) { return document.querySelector('.screen[data-step="' + step + '"]'); }
    function stepOf(el) { var s = el.closest(".screen"); return s ? s.getAttribute("data-step") : ""; }
    function val(id) { return $(id).value.trim(); }
    var stage = $("stage");
    var backBtn = $("back");
    var progress = $("progress");

    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    function localDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return localDate(d); }
    function day(ymd) { return ymd.split("-").join("."); }
    function fmt(iso) {
      var d = new Date(iso);
      if (isNaN(d.getTime())) { return ""; }
      return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }
    function validDay(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= "1900-01-01" && v <= localDate(new Date()); }

    function gql(query, variables) {
      return fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ query: query, variables: variables })
      }).then(function (response) { return response.json(); }).then(function (json) {
        if (json.errors && json.errors.length) { throw new Error(json.errors[0].message); }
        return json.data;
      });
    }
    function showError(id, message) { var el = $(id); el.textContent = message; el.hidden = false; }
    function hideError(id) { $(id).hidden = true; }

    // ---------- screens and history ----------
    function show(step, dir) {
      var target = screenOf(step);
      if (!target || target === current) { return; }
      var prev = current;
      current = target;
      stage.scrollTop = 0;
      if (prev) {
        prev.classList.remove("in-fwd", "in-back");
        prev.classList.add(dir === "back" ? "out-back" : "out-fwd");
        setTimeout(function () {
          prev.classList.remove("out-fwd", "out-back");
          if (prev !== current) { prev.hidden = true; }
        }, 320);
      }
      target.classList.remove("out-fwd", "out-back", "in-fwd", "in-back");
      target.hidden = false;
      if (prev) {
        void target.offsetWidth;
        target.classList.add(dir === "back" ? "in-back" : "in-fwd");
      }
      var n = Number(target.getAttribute("data-n") || 0);
      progress.classList.toggle("is-hidden", !n);
      if (n) {
        $("progress-text").textContent = n + " / " + DATA.total;
        $("progress-fill").style.width = (100 * n / DATA.total) + "%";
      }
      backBtn.classList.toggle("is-hidden", stack.length < 2);
      onEnter(step);
      var heading = target.querySelector(".q");
      if (heading) { heading.focus({ preventScroll: true }); }
    }
    function forward(step) {
      stack.push(step);
      history.pushState({ gen: gen, n: stack.length }, "");
      show(step, "fwd");
    }
    // Starts a new history generation: older entries no longer lead back
    // into the form (used after a successful submit).
    function restart(step) {
      gen += 1;
      stack = [step];
      history.replaceState({ gen: gen, n: 1 }, "");
      show(step, "fwd");
    }
    window.addEventListener("popstate", function (event) {
      var state = event.state;
      if (!state || state.gen !== gen || state.n >= stack.length) { return; }
      stack.length = Math.max(1, state.n);
      show(stack[stack.length - 1], "back");
    });
    backBtn.addEventListener("click", function () { if (stack.length > 1) { history.back(); } });

    function later(fn) {
      var at = current;
      busy = true;
      setTimeout(function () { busy = false; if (current === at) { fn(); } }, 260);
    }

    // ---------- answers ----------
    function complete(field) {
      if (field === "anonymity") {
        return !!answers.anonymity && (answers.anonymity.value === "yes" || !!answers.contact);
      }
      return !!answers[field];
    }
    function firstMissing() {
      for (var i = 0; i < REQUIRED.length; i += 1) { if (!complete(REQUIRED[i])) { return REQUIRED[i]; } }
      return null;
    }
    function nextOf(step) {
      if (editing) { return firstMissing() || "review"; }
      if (step === "unsafe") { return "reporter"; }
      return ORDER[ORDER.indexOf(step) + 1] || "review";
    }
    function advance(step) { forward(nextOf(step)); }

    function unpress(step) { each(screenOf(step).querySelectorAll(".chip"), function (c) { c.setAttribute("aria-pressed", "false"); }); }
    function hideReveals(step, keep) { each(screenOf(step).querySelectorAll(".reveal"), function (r) { r.hidden = r.id !== keep; }); }

    function applyReporter() {
      var role = answers.reporter ? answers.reporter.value : "";
      var parent = role === "parent";
      var staff = DATA.staffReporters.indexOf(role) >= 0;
      each(screenOf("victim").querySelectorAll(".chip[data-only]"), function (c) {
        var only = c.getAttribute("data-only");
        var hide = only === "parent" ? !parent : parent;
        c.hidden = hide;
        if (hide && c.getAttribute("aria-pressed") === "true") { c.setAttribute("aria-pressed", "false"); answers.victim = null; }
      });
      each(screenOf("category").querySelectorAll(".chip[data-staff-only]"), function (c) {
        c.hidden = !staff;
        if (!staff && c.getAttribute("aria-pressed") === "true") { c.setAttribute("aria-pressed", "false"); answers.category = null; }
      });
    }

    function pick(chipEl) {
      if (busy) { return; }
      var field = chipEl.getAttribute("data-pick");
      var value = chipEl.getAttribute("data-value");
      var step = stepOf(chipEl);
      var label = chipEl.textContent;
      each(chipEl.parentNode.querySelectorAll(".chip"), function (c) { c.setAttribute("aria-pressed", c === chipEl ? "true" : "false"); });
      var reveal = chipEl.getAttribute("data-reveal");
      hideReveals(step, reveal);
      if (reveal) {
        answers[field] = field === "anonymity" ? { value: "no", label: label } : null;
        var input = $(reveal).querySelector("input, textarea");
        if (input) { input.focus(); }
        refresh(step);
        return;
      }
      if (field === "date") {
        var ymd = daysAgo(Number(value));
        answers.date = { value: ymd, label: label + " (" + day(ymd) + ")" };
      } else {
        answers[field] = { value: value, label: label };
      }
      if (field === "anonymity") { answers.contact = null; }
      if (field === "reporter") { applyReporter(); }
      if (chipEl.hasAttribute("data-stay")) { return; }
      if (field === "safety") {
        unsafe = value === "no";
        later(function () { forward(unsafe ? "unsafe" : nextOf("safety")); });
        return;
      }
      later(function () { advance(step); });
    }

    function valid(step) {
      switch (step) {
        case "date": return validDay($("incident-date").value);
        case "location": return val("incident-location").length > 0;
        case "school": return val("school").length > 0;
        case "details": return val("details").length >= 10;
        case "anonymity": return val("contact").length >= 3;
        case "track-code": return val("tracking-code").length === 10;
        case "track-pin": return val("pin").length === 6;
        default: return true;
      }
    }
    function refresh(step) {
      var target = screenOf(step);
      if (!target) { return; }
      each(target.querySelectorAll('[data-action="continue"]'), function (b) { b.disabled = !valid(step); });
    }

    function commit(step) {
      if (step === "accused") {
        answers.accusedDescription = val("accused-description") || null;
      } else if (step === "date") {
        var v = $("incident-date").value;
        answers.date = { value: v, label: day(v) };
      } else if (step === "location") {
        var place = val("incident-location");
        answers.location = { value: place, label: place };
      } else if (step === "school") {
        var school = val("school");
        answers.school = school ? { value: school, label: school } : null;
        answers.grade = val("grade") || null;
      } else if (step === "details") {
        var text = val("details");
        answers.details = { value: text, label: text };
      } else if (step === "anonymity") {
        answers.contact = val("contact") || null;
      }
    }
    function skip(step) {
      unpress(step);
      hideReveals(step, null);
      if (step === "accused") {
        answers.accused = null;
        answers.accusedDescription = null;
        $("accused-description").value = "";
      } else if (step === "location") {
        answers.location = null;
        $("incident-location").value = "";
      }
      advance(step);
    }

    // ---------- review and submit ----------
    function row(label, value, step) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "row";
      b.setAttribute("data-action", "edit");
      b.setAttribute("data-edit", step);
      var text = document.createElement("span");
      var small = document.createElement("small");
      small.textContent = label;
      var v = document.createElement("span");
      v.className = "v";
      v.textContent = value;
      text.appendChild(small);
      text.appendChild(v);
      var edit = document.createElement("span");
      edit.className = "edit";
      edit.textContent = "засах";
      b.appendChild(text);
      b.appendChild(edit);
      return b;
    }
    function label(field, fallback) { return answers[field] ? answers[field].label : fallback; }
    function renderReview() {
      var list = $("review-list");
      list.textContent = "";
      var who = label("accused", "");
      if (answers.accusedDescription) { who = who ? who + ", " + answers.accusedDescription : answers.accusedDescription; }
      var school = label("school", "");
      if (answers.grade) { school += ", " + answers.grade + " анги"; }
      var details = label("details", "");
      if (details.length > 140) { details = details.slice(0, 140) + "…"; }
      var privacy = answers.anonymity && answers.anonymity.value === "yes" ? "Нэрээ нууцалсан" : "Холбоо барих: " + (answers.contact || "");
      [
        ["Чи", label("reporter", ""), "reporter"],
        ["Хэнд тохиолдсон", label("victim", ""), "victim"],
        ["Юу болсон", label("category", ""), "category"],
        ["Хэн хийсэн", who || "Хэлээгүй", "accused"],
        ["Хэзээ", label("date", ""), "date"],
        ["Сургууль", school, "school"],
        ["Хаана", label("location", "Хэлээгүй"), "location"],
        ["Хэр хүнд", label("severity", ""), "severity"],
        ["Дэлгэрэнгүй", details, "details"],
        ["Нууцлал", privacy, "anonymity"]
      ].forEach(function (r) { list.appendChild(row(r[0], r[1], r[2])); });
    }
    function rank(severity) { return DATA.severityRank.indexOf(severity); }
    function buildInput() {
      var reporter = answers.reporter.value;
      var category = answers.category.value;
      var severity = unsafe ? "critical" : answers.severity.value;
      var floor = DATA.severityFloor[category];
      if (floor && rank(floor) > rank(severity)) { severity = floor; }
      var anonymous = answers.anonymity.value === "yes";
      var school = answers.school.value;
      return {
        title: (DATA.categoryTitles[category] + " — " + school).slice(0, 200),
        description: answers.details.value,
        category: category,
        severity: severity,
        reporterRole: reporter,
        isAnonymous: anonymous,
        reporterContact: anonymous ? null : answers.contact,
        victimRole: answers.victim.value === "self" ? DATA.selfVictim[reporter] : answers.victim.value,
        schoolName: school,
        grade: answers.grade || null,
        incidentDate: answers.date.value,
        incidentLocation: answers.location ? answers.location.value : null,
        accusedRole: answers.accused ? answers.accused.value : null,
        accusedDescription: answers.accusedDescription || null
      };
    }
    function submit() {
      var missing = firstMissing();
      if (missing) { editing = true; forward(missing); return; }
      var button = $("submit");
      button.disabled = true;
      button.textContent = "Илгээж байна…";
      hideError("submit-error");
      gql(SUBMIT, { input: buildInput() })
        .then(function (data) {
          var receipt = data.eduTechBraveSubmitReport;
          $("receipt-number").textContent = receipt.caseNumber;
          $("receipt-code").textContent = receipt.trackingCode;
          $("receipt-pin").textContent = receipt.pin;
          restart("receipt");
        })
        .catch(function (error) { showError("submit-error", error.message || "Алдаа гарлаа. Дахин оролдоно уу."); })
        .then(function () { button.disabled = false; button.textContent = "Илгээх"; });
    }

    // ---------- anonymity check (optional) ----------
    // Three outcomes, never shown as "safe": findings; AI found nothing but
    // read it again yourself; AI did not run, only phones/e-mails checked.
    function renderPrivacy() {
      var box = $("privacy");
      if (!box) { return; }
      box.hidden = !(answers.anonymity && answers.anonymity.value === "yes");
      $("privacy-result").hidden = true;
      $("privacy-list").textContent = "";
      $("privacy-check").textContent = "Намайг таниулах зүйл байна уу? Шалгах";
      hideError("privacy-error");
    }
    function checkPrivacy() {
      if (firstMissing()) { return; }
      var input = buildInput();
      var button = $("privacy-check");
      button.disabled = true;
      button.textContent = "Шалгаж байна…";
      hideError("privacy-error");
      $("privacy-result").hidden = true;
      gql(PRIVACY, { input: {
        title: input.title,
        description: input.description,
        incidentLocation: input.incidentLocation,
        accusedDescription: input.accusedDescription
      } })
        .then(function (data) {
          var result = data.eduTechBravePublicPrivacyCheck;
          var list = $("privacy-list");
          list.textContent = "";
          result.risks.forEach(function (risk) {
            var li = document.createElement("li");
            var quote = document.createElement("strong");
            quote.textContent = "«" + risk.quote + "»";
            var reason = document.createElement("span");
            reason.textContent = " — " + risk.reason;
            li.appendChild(quote);
            li.appendChild(reason);
            list.appendChild(li);
          });
          var summary;
          if (result.risks.length) {
            summary = "Эдгээр нь чамайг таниулж магадгүй. Засах бол дээрх мөрөн дээр дар.";
            if (!result.aiChecked) { summary += " AI шалгалт ажиллаагүй тул зөвхөн утас, и-мэйл шалгасан."; }
          } else if (result.aiChecked) {
            summary = "AI чамайг таниулах зүйл олсонгүй. Гэхдээ өөрөө дахин нэг уншаад шалгаарай.";
          } else {
            summary = "AI шалгалт одоо ажиллахгүй байна. Утас, и-мэйл олдсонгүй. Нэр, анги зэргийг өөрөө шалгаарай.";
          }
          $("privacy-summary").textContent = summary;
          $("privacy-result").hidden = false;
        })
        .catch(function (error) { showError("privacy-error", error.message || "Шалгаж чадсангүй. Өөрөө нэг уншаад шалгаарай."); })
        .then(function () { button.disabled = false; button.textContent = "Дахин шалгах"; });
    }

    // ---------- tracking ----------
    function renderTrack(item) {
      $("track-number").textContent = item.caseNumber;
      var status = $("track-status");
      status.textContent = item.statusLabel;
      status.className = "status " + (item.status === "resolved" ? "ok" : item.isOverdue ? "bad" : "");
      $("track-created").textContent = fmt(item.createdAt);
      $("track-due").textContent = fmt(item.dueAt) + (item.isOverdue ? " (хэтэрсэн)" : "");
      $("track-level").textContent = item.escalationLevel === 0 ? "Хариуцагч" : item.escalationLevel + "-р шат";
      var list = $("track-updates");
      list.textContent = "";
      item.updates.forEach(function (update) {
        var li = document.createElement("li");
        var span = document.createElement("span");
        span.textContent = update.message;
        var time = document.createElement("time");
        time.textContent = fmt(update.createdAt);
        li.appendChild(span);
        li.appendChild(time);
        list.appendChild(li);
      });
    }
    function lookup() {
      var button = $("track-submit");
      button.disabled = true;
      hideError("track-error");
      gql(TRACK, { trackingCode: val("tracking-code").toUpperCase(), pin: val("pin") })
        .then(function (data) { renderTrack(data.eduTechBraveTrackReport); forward("track-result"); })
        .catch(function (error) {
          if (current !== screenOf("track-pin")) { forward("track-pin"); }
          showError("track-error", error.message || "Алдаа гарлаа. Дахин оролдоно уу.");
        })
        .then(function () { refresh("track-pin"); });
    }

    var copyBtn = $("copy");
    if (!(navigator.clipboard && window.isSecureContext)) { copyBtn.hidden = true; }
    function copy() {
      var text = "Хяналтын код: " + $("receipt-code").textContent + "\nPIN: " + $("receipt-pin").textContent;
      navigator.clipboard.writeText(text).then(
        function () { copyBtn.textContent = "Хуулсан ✓"; },
        function () { copyBtn.textContent = "Хуулж чадсангүй. Гараар тэмдэглээрэй"; }
      );
    }

    // ---------- events ----------
    function onEnter(step) {
      if (step === "review") { editing = false; renderReview(); renderPrivacy(); }
      refresh(step);
    }
    function act(name, el) {
      var step = stepOf(el);
      if (name === "start") { forward("safety"); }
      else if (name === "track") { forward("track-code"); }
      else if (name === "continue") {
        if (!valid(step)) { return; }
        commit(step);
        if (step === "track-code") { forward("track-pin"); }
        else if (step === "track-pin") { lookup(); }
        else { advance(step); }
      }
      else if (name === "skip") { skip(step); }
      else if (name === "edit") { editing = true; forward(el.getAttribute("data-edit")); }
      else if (name === "submit") { submit(); }
      else if (name === "privacy-check") { checkPrivacy(); }
      else if (name === "copy") { copy(); }
      else if (name === "receipt-track") {
        $("tracking-code").value = $("receipt-code").textContent;
        $("pin").value = $("receipt-pin").textContent;
        lookup();
      }
    }
    stage.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Element)) { return; }
      var chipEl = target.closest(".chip");
      if (chipEl) { pick(chipEl); return; }
      var action = target.closest("[data-action]");
      if (action && !action.disabled) { act(action.getAttribute("data-action"), action); }
    });
    stage.addEventListener("input", function (event) {
      var t = event.target;
      if (t.id === "tracking-code") { t.value = t.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); }
      if (t.id === "pin") { t.value = t.value.replace(/[^0-9]/g, ""); }
      if (t.id === "details") {
        var count = t.value.trim().length;
        $("details-count").textContent = count >= 10 ? count + " үсэг" : "Дор хаяж 10 үсэг бичээрэй (одоо " + count + ").";
      }
      refresh(stepOf(t));
    });
    stage.addEventListener("keydown", function (event) {
      var t = event.target;
      if (event.key !== "Enter" || !(t instanceof HTMLInputElement)) { return; }
      event.preventDefault();
      var scope = t.closest(".reveal") || t.closest(".screen");
      var button = scope && scope.querySelector('[data-action="continue"]');
      if (button && !button.disabled) { button.click(); }
    });

    // ---------- start ----------
    $("incident-date").max = localDate(new Date());
    applyReporter();
    stack = ["welcome"];
    history.replaceState({ gen: gen, n: 1 }, "");
    show("welcome", "fwd");
    if (location.hash === "#track") { forward("track-code"); }
  })();
`;

export const renderIntakePage = (nonce = "", options: IntakePageOptions = {}): string => `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#eef0ff">
<link rel="icon" href="data:,">
<title>Эрх хамгаалал — Мэдэгдэл илгээх</title>
<style nonce="${escapeHtml(nonce)}">${css}</style>
</head>
<body>
<div class="app">
  <header class="bar">
    <button type="button" class="back is-hidden" id="back" aria-label="Буцах">${ARROW}</button>
    <div class="progress is-hidden" id="progress" aria-hidden="true">
      <span id="progress-text"></span>
      <div class="track"><b id="progress-fill"></b></div>
    </div>
    <a class="sos" href="tel:108" aria-label="108 руу залгах. Хүүхдийн тусламжийн утас, үнэгүй">${PHONE}<span>108</span></a>
  </header>
  <main class="stage" id="stage">
${screens(options)}
  </main>
</div>
<script type="application/json" id="intake-data">${pageData()}</script>
<script nonce="${escapeHtml(nonce)}">${js}</script>
</body>
</html>
`;
