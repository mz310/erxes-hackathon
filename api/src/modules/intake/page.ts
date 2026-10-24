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

// The helper: a liquid orb that breathes, blinks and changes mood (CSS only).
const ORB = `<div class="orb" aria-hidden="true"><span class="orb-body"></span><span class="eye l"></span><span class="eye r"></span><span class="mouth"></span></div>`;
const DOTS = `<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
const ARROW = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`;
const PHONE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>`;

// `hero` centres a large orb above the bubble (welcome, safety help, receipt).
const bubble = (step: string, question: string, hint?: string, hero = false): string =>
  `<div class="helper${hero ? " hero" : ""}">${ORB}<div class="bubble">${DOTS}<h2 class="q" id="q-${step}" tabindex="-1">${escapeHtml(
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
      `${bubble("welcome", "Сайн уу. Би чамд туслах болно.", "Хэдхэн асуулт асууна. Нэрээ хэлэх шаардлагагүй.", true)}
      <div class="info"><p>Чиний мэдэгдэл сургуулийн удирдлагад биш, боловсролын газарт шууд очно. Мэдэгдэл бүрт хариуцагч, шийдвэрлэх хугацаа өгөгдөнө.</p></div>
      <div class="info helpline" role="note"><div class="num">108</div><p><strong>108 — Хүүхдийн тусламжийн утас (24/7, үнэгүй)</strong><br>Яаралтай үед: 102 цагдаа · 103 түргэн тусламж</p></div>
      <p class="fine">Энэ суваг гомдлыг шийдэх хүн буруутгагдаж буй хүнтэй холбоогүй байх зарчмаар ажилладаг.</p>
      <div class="actions">
        <button type="button" class="btn" data-action="start">Эхлэх</button>
        <button type="button" class="btn link" data-action="track">Өмнө илгээсэн бол: явцаа шалгах</button>
      </div>`,
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
        true,
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
      `<div class="float" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      ${bubble("receipt", "Баярлалаа. Чи зөв зүйл хийлээ.", "Чиний мэдэгдэл бүртгэгдлээ. Удахгүй хариуцагч томилогдоно.", true)}
      <p class="case-no" id="receipt-number"></p>
      <p class="warn">Эдгээрийг тэмдэглэж аваарай — дахин харуулахгүй</p>
      <div class="codes">
        <div class="code"><small>Хяналтын код</small><strong id="receipt-code"></strong></div>
        <div class="code"><small>PIN</small><strong id="receipt-pin"></strong></div>
      </div>
      <p class="fine">Дэлгэцийн зураг (screenshot) авч хадгалж болно.</p>
      <div class="actions">
        <button type="button" class="btn ghost" id="copy" data-action="copy">Хуулж авах</button>
        <button type="button" class="btn" data-action="receipt-track">Явцаа шалгах</button>
      </div>`,
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
  /* Liquid glass, tuned for a frightened child on a cheap phone.
     One bold thing: the living helper orb and the sky behind it, which
     both change mood with the conversation. Everything else stays quiet.
     backdrop-filter is used only where content scrolls underneath (the
     floating controls and the bottom dock); other glass is a translucent
     fill with a highlight, which is cheap on low-end Android. */
  @property --orb-1 { syntax: "<color>"; inherits: true; initial-value: #8fb8ff; }
  @property --orb-2 { syntax: "<color>"; inherits: true; initial-value: #7a5cff; }
  @property --orb-3 { syntax: "<color>"; inherits: true; initial-value: #9be3c9; }

  :root {
    --base: #eef0fb; --ink: #1d1a3f; --ink-2: #4f4b7a; --sep: rgba(29, 26, 63, 0.08);
    --sky: #8ec5ff; --dawn: #ffb38a; --mint: #9be3c9; --lilac: #c7b8ff;
    --glass: rgba(255, 255, 255, 0.62); --glass-strong: rgba(255, 255, 255, 0.8); --glass-line: rgba(255, 255, 255, 0.85);
    --glass-shine: rgba(255, 255, 255, 0.9); --glass-shadow: rgba(40, 36, 110, 0.12); --dock: rgba(246, 246, 255, 0.72);
    --action-1: #3346e0; --action-2: #6a4dff; --action-ink: #ffffff; --action-glow: rgba(70, 60, 230, 0.32);
    --sos-glass: rgba(255, 226, 226, 0.78); --sos-ink: #a3191e; --call: #d6353b; --call-ink: #ffffff;
    --warn-bg: rgba(255, 236, 214, 0.86); --warn-ink: #6e3b00;
    --danger-bg: rgba(255, 228, 228, 0.9); --danger: #a3191e; --ok-bg: rgba(220, 247, 233, 0.9); --ok: #05603a;
    --face: #1d1a3f; --frame-line: rgba(255, 255, 255, 0.7); --page: #e4e6f6;
    --ease-push: cubic-bezier(0.32, 0.72, 0, 1); --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1); --spring: cubic-bezier(0.34, 1.45, 0.5, 1);
    --font: ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI Variable Text", "Segoe UI", Roboto, "Noto Sans", sans-serif;
    color-scheme: light dark;
  }
  @supports (transition-timing-function: linear(0, 1)) {
    :root { --spring: linear(0, 0.05 1.2%, 0.2 2.6%, 0.43 4.4%, 0.79 7.4%, 1.016 10.3%, 1.096 12.4%, 1.123 14.4%, 1.112 16.3%, 1.058 19.6%, 1.002 23.5%, 0.983 26.7%, 0.987 31.4%, 1.002 38.5%, 1); }
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --base: #0d0b22; --ink: #f1efff; --ink-2: #c3bff0; --sep: rgba(255, 255, 255, 0.08);
      --sky: #2b4fb8; --dawn: #8a3d5c; --mint: #136a6e; --lilac: #4b3aa8;
      --glass: rgba(34, 31, 78, 0.6); --glass-strong: rgba(30, 28, 72, 0.84); --glass-line: rgba(255, 255, 255, 0.12);
      --glass-shine: rgba(255, 255, 255, 0.14); --glass-shadow: rgba(0, 0, 0, 0.35); --dock: rgba(18, 16, 46, 0.72);
      --action-1: #7d8cff; --action-2: #a487ff; --action-ink: #0d0b22; --action-glow: rgba(140, 120, 255, 0.32);
      --sos-glass: rgba(92, 24, 34, 0.7); --sos-ink: #ffc2bf; --call: #ff6b63; --call-ink: #1d0605;
      --warn-bg: rgba(74, 52, 16, 0.85); --warn-ink: #ffd89a;
      --danger-bg: rgba(80, 22, 30, 0.9); --danger: #ffc2bf; --ok-bg: rgba(16, 58, 40, 0.9); --ok: #8ff0c0;
      --face: #1d1a3f; --frame-line: rgba(255, 255, 255, 0.1); --page: #07061a;
    }
  }

  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body { background: var(--base); color: var(--ink); font: 16px/1.5 var(--font); -webkit-text-size-adjust: 100%; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  .app { position: relative; isolation: isolate; display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; background: var(--base); }
  @media (min-width: 560px) {
    body { display: grid; place-items: center; padding: 24px;
      background: radial-gradient(60% 50% at 20% 20%, var(--lilac), transparent 70%), radial-gradient(50% 50% at 85% 80%, var(--dawn), transparent 70%), var(--page); }
    .app { width: 400px; height: min(860px, calc(100vh - 48px)); border-radius: 44px; border: 1px solid var(--frame-line);
      box-shadow: 0 30px 80px var(--glass-shadow), 0 2px 0 var(--glass-shine) inset; }
  }

  /* The sky. Soft gradients only (no blur filter); drift uses translate
     and mood uses scale/opacity, so the two never fight. */
  .aurora { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
  .aurora i { position: absolute; width: 90%; aspect-ratio: 1; border-radius: 50%; opacity: 0.9;
    transition: opacity 1.6s var(--ease-out), scale 1.6s var(--ease-out); }
  .aurora .a1 { left: -30%; top: -18%; background: radial-gradient(closest-side, var(--sky), transparent); animation: drift-1 26s ease-in-out infinite alternate; }
  .aurora .a2 { right: -35%; top: 12%; background: radial-gradient(closest-side, var(--lilac), transparent); animation: drift-2 31s ease-in-out infinite alternate; }
  .aurora .a3 { left: -20%; bottom: -25%; background: radial-gradient(closest-side, var(--mint), transparent); animation: drift-3 29s ease-in-out infinite alternate; }
  .aurora .a4 { right: -30%; bottom: -30%; background: radial-gradient(closest-side, var(--dawn), transparent); opacity: 0.55; animation: drift-1 35s ease-in-out infinite alternate-reverse; }
  [data-mood="care"] .aurora .a4 { opacity: 1; scale: 1.5; }
  [data-mood="care"] .aurora .a1 { opacity: 0.5; }
  [data-mood="happy"] .aurora .a3 { opacity: 1; scale: 1.45; }
  [data-mood="happy"] .aurora .a2 { scale: 1.2; }
  @keyframes drift-1 { from { translate: 0 0; } to { translate: 18% 14%; } }
  @keyframes drift-2 { from { translate: 0 0; } to { translate: -16% 18%; } }
  @keyframes drift-3 { from { translate: 0 0; } to { translate: 20% -12%; } }

  /* Floating controls over the scrolling stage. */
  .bar { position: absolute; z-index: 5; top: 0; left: 0; right: 0; display: flex; align-items: center; gap: 10px;
    padding: calc(env(safe-area-inset-top) + 12px) 14px 8px; pointer-events: none; }
  .bar > * { pointer-events: auto; }
  .back, .progress, .sos {
    background: var(--glass); border: 1px solid var(--glass-line);
    box-shadow: 0 6px 20px var(--glass-shadow), inset 0 1px 0 var(--glass-shine);
    -webkit-backdrop-filter: blur(18px) saturate(170%); backdrop-filter: blur(18px) saturate(170%);
  }
  .back { width: 44px; height: 44px; flex: none; border-radius: 50%; color: var(--ink); display: grid; place-items: center; cursor: pointer;
    transition: scale 0.35s var(--spring), opacity 0.25s ease; }
  .back:active { scale: 0.9; }
  .progress { flex: 1; height: 44px; border-radius: 999px; padding: 0 16px; display: flex; align-items: center; gap: 12px; transition: opacity 0.3s ease; }
  .progress span { font-size: 0.82rem; font-weight: 700; color: var(--ink-2); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .progress .track { flex: 1; height: 8px; border-radius: 8px; background: var(--sep); overflow: hidden; }
  .progress b { display: block; height: 100%; width: 0; border-radius: 8px;
    background: linear-gradient(90deg, var(--action-1), var(--action-2)); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
    transition: width 0.7s var(--spring); }
  .is-hidden { visibility: hidden; opacity: 0; }
  .sos { flex: none; margin-left: auto; height: 44px; display: flex; gap: 6px; align-items: center; padding: 0 15px;
    border-radius: 999px; background: var(--sos-glass); color: var(--sos-ink); font-weight: 800; text-decoration: none;
    transition: scale 0.35s var(--spring); }
  .sos:active { scale: 0.94; }

  /* Screens. Only transform animates on the incoming screen, so glass
     inside it keeps sampling the sky during the slide. */
  .stage { position: relative; z-index: 1; flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain;
    scrollbar-width: none; }
  .stage::-webkit-scrollbar { display: none; }
  .screen { position: relative; z-index: 2; display: flex; flex-direction: column; min-height: 100%;
    padding: calc(env(safe-area-inset-top) + 72px) 18px 24px; }
  .screen[hidden] { display: none; }
  .screen.in-fwd { animation: in-fwd 0.52s var(--ease-push) both; }
  .screen.in-back { animation: in-back 0.48s var(--ease-push) both; }
  .screen.out-fwd, .screen.out-back { position: absolute; top: 0; left: 0; right: 0; pointer-events: none; }
  .screen.out-fwd { z-index: 1; animation: out-fwd 0.42s var(--ease-push) both; }
  .screen.out-back { z-index: 3; animation: out-back 0.36s var(--ease-out) both; }
  @keyframes in-fwd { from { transform: translateX(100%); } to { transform: none; } }
  @keyframes in-back { from { transform: translateX(-28%); } to { transform: none; } }
  @keyframes out-fwd { 55% { opacity: 0; } to { transform: translateX(-28%); opacity: 0; } }
  @keyframes out-back { to { transform: translateX(100%); opacity: 0; } }

  /* The helper: a breathing, blinking orb beside a glass speech bubble. */
  .helper { display: flex; gap: 12px; align-items: flex-end; margin: 6px 0 22px; }
  .helper.hero { flex-direction: column; align-items: center; text-align: center; gap: 18px; margin: 18px 0 20px; }
  .orb { --o: 52px; position: relative; flex: none; width: var(--o); height: var(--o); animation: breathe 5.5s ease-in-out infinite;
    --orb-1: #8fb8ff; --orb-2: #7a5cff; --orb-3: #9be3c9; transition: --orb-1 1.2s ease, --orb-2 1.2s ease, --orb-3 1.2s ease; }
  .hero .orb { --o: 128px; }
  .screen[data-step="receipt"] .helper.hero { margin-top: 0; gap: 14px; }
  .screen[data-step="receipt"] .hero .orb { --o: 92px; }
  .screen[data-step="receipt"] .warn { margin-bottom: 12px; }
  [data-mood="care"] .orb { --orb-1: #ffc7a8; --orb-2: #ff8e8e; --orb-3: #ffe0b0; }
  [data-mood="happy"] .orb { --orb-1: #a6f0d3; --orb-2: #4fb8ff; --orb-3: #ffe58f; }
  .orb-body { position: absolute; inset: 0; border-radius: 46% 54% 52% 48% / 52% 46% 54% 48%;
    background:
      radial-gradient(circle at 30% 26%, rgba(255, 255, 255, 0.95) 0 5%, rgba(255, 255, 255, 0) 28%),
      radial-gradient(circle at 72% 78%, var(--orb-3), transparent 62%),
      linear-gradient(150deg, var(--orb-1), var(--orb-2));
    box-shadow: inset 0 calc(var(--o) * -0.1) calc(var(--o) * 0.22) rgba(30, 14, 110, 0.28),
      inset 0 calc(var(--o) * 0.06) calc(var(--o) * 0.14) rgba(255, 255, 255, 0.6),
      0 calc(var(--o) * 0.18) calc(var(--o) * 0.45) color-mix(in srgb, var(--orb-2) 40%, transparent);
    animation: morph 9s ease-in-out infinite; }
  .eye { position: absolute; top: 39%; width: 11%; height: 17%; border-radius: 50%; background: var(--face);
    animation: blink 5.2s infinite; transition: translate 0.4s var(--ease-out); }
  .eye.l { left: 32%; }
  .eye.r { right: 32%; }
  .mouth { position: absolute; left: 50%; top: 61%; width: 22%; height: 11%; translate: -50% 0;
    border: calc(var(--o) * 0.045) solid var(--face); border-top: 0; border-radius: 0 0 999px 999px; transition: all 0.4s var(--ease-out); }
  .listening .eye { translate: 0 22%; }
  [data-mood="happy"] .eye { height: 9%; top: 41%; background: transparent; border: calc(var(--o) * 0.045) solid var(--face);
    border-bottom: 0; border-radius: 999px 999px 0 0; animation: none; }
  [data-mood="happy"] .mouth { height: 15%; width: 28%; }
  [data-mood="care"] .mouth { height: 5%; width: 16%; top: 64%; }
  .nod .orb { animation: breathe 5.5s ease-in-out infinite, nod 0.5s var(--spring); }
  @keyframes breathe { 0%, 100% { scale: 1; } 50% { scale: 1.045; } }
  @keyframes morph {
    0%, 100% { border-radius: 46% 54% 52% 48% / 52% 46% 54% 48%; }
    33% { border-radius: 54% 46% 44% 56% / 46% 56% 44% 54%; }
    66% { border-radius: 50% 50% 56% 44% / 56% 50% 50% 44%; }
  }
  @keyframes blink { 0%, 91%, 100% { scale: 1 1; } 94% { scale: 1 0.1; } }
  @keyframes nod { 0%, 100% { translate: 0 0; } 40% { translate: 0 12%; } }

  .bubble { position: relative; min-width: 0; padding: 15px 17px; border-radius: 24px 24px 24px 8px;
    background: linear-gradient(180deg, var(--glass-shine), transparent 42%), var(--glass-strong);
    border: 1px solid var(--glass-line); box-shadow: 0 10px 30px var(--glass-shadow); }
  .hero .bubble { border-radius: 24px; padding: 18px 20px; }
  .q { margin: 0; font-size: 1.42rem; line-height: 1.22; font-weight: 800; letter-spacing: -0.015em; outline: none; text-wrap: balance; }
  .hero .q { font-size: 1.6rem; }
  .hint { margin: 7px 0 0; color: var(--ink-2); font-size: 0.95rem; line-height: 1.45; text-wrap: pretty; }
  .dots { display: none; position: absolute; left: 18px; top: 50%; translate: 0 -50%; gap: 5px; }
  .hero .dots { left: 50%; translate: -50% -50%; }
  .dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-2); animation: dot 0.9s ease-in-out infinite; }
  .dots i:nth-child(2) { animation-delay: 0.15s; }
  .dots i:nth-child(3) { animation-delay: 0.3s; }
  @keyframes dot { 0%, 100% { opacity: 0.3; translate: 0 0; } 50% { opacity: 1; translate: 0 -3px; } }

  /* "Typing", then the answers rise in. Both classes come from the script,
     so without it (or with reduced motion) everything is simply visible. */
  .screen.typing .dots { display: flex; }
  .screen.typing .bubble > :not(.dots) { opacity: 0; }
  .screen.typing .chips, .screen.typing .field, .screen.typing .actions, .screen.typing .info,
  .screen.typing .review, .screen.typing .codes, .screen.typing .warn, .screen.typing .case-no, .screen.typing .fine {
    opacity: 0; pointer-events: none; }
  .screen.shown .bubble > :not(.dots) { transition: opacity 0.25s ease; }
  .screen.shown .chip, .screen.shown .field, .screen.shown .info, .screen.shown .review, .screen.shown .codes,
  .screen.shown .warn, .screen.shown .case-no, .screen.shown .fine { animation: rise 0.55s var(--spring) both; }
  .screen.shown .actions { animation: fade 0.4s ease both; }
  .screen.shown .chip:nth-child(2), .screen.shown .info + .info { animation-delay: 0.035s; }
  .screen.shown .chip:nth-child(3) { animation-delay: 0.07s; }
  .screen.shown .chip:nth-child(4) { animation-delay: 0.105s; }
  .screen.shown .chip:nth-child(5) { animation-delay: 0.14s; }
  .screen.shown .chip:nth-child(6) { animation-delay: 0.175s; }
  .screen.shown .chip:nth-child(n + 7) { animation-delay: 0.21s; }
  @keyframes rise { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: none; } }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }

  /* Answers: glass capsules aligned like replies. The selected one fills
     with liquid from the point that was touched. */
  .chips { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
  .chip { position: relative; isolation: isolate; overflow: hidden; max-width: 92%; padding: 13px 19px; cursor: pointer;
    font: inherit; font-size: 1rem; font-weight: 650; line-height: 1.3; text-align: right; color: var(--ink);
    background: linear-gradient(180deg, var(--glass-shine), transparent 60%), var(--glass);
    border: 1px solid var(--glass-line); border-radius: 999px; box-shadow: 0 6px 18px var(--glass-shadow);
    touch-action: manipulation; user-select: none; -webkit-user-select: none;
    transition: scale 0.4s var(--spring), color 0.3s ease, box-shadow 0.4s ease, border-color 0.3s ease; }
  .chip::before { content: ""; position: absolute; z-index: -1; left: var(--x, 50%); top: var(--y, 50%); width: 12px; height: 12px;
    margin: -6px 0 0 -6px; border-radius: 50%; background: linear-gradient(135deg, var(--action-1), var(--action-2));
    transform: scale(0); transition: transform 0.6s var(--ease-out); }
  .chip:active { scale: 0.96; }
  .chip[aria-pressed="true"] { color: var(--action-ink); border-color: transparent; box-shadow: 0 10px 26px var(--action-glow); }
  .chip[aria-pressed="true"]::before { transform: scale(var(--s, 60)); }
  .chip[hidden] { display: none; }
  .chip:focus-visible, .btn:focus-visible, .back:focus-visible, .sos:focus-visible, .row:focus-visible {
    outline: 3px solid var(--action-2); outline-offset: 3px; }

  .field { margin-top: 14px; }
  .field label { display: block; font-weight: 650; font-size: 0.95rem; margin: 0 0 7px 4px; }
  .field input, .field textarea { width: 100%; padding: 15px 17px; font: inherit; font-size: 17px; color: var(--ink);
    background: var(--glass-strong); border: 1px solid var(--glass-line); border-radius: 20px;
    box-shadow: 0 6px 18px var(--glass-shadow), inset 0 1px 0 var(--glass-shine);
    transition: border-color 0.2s ease, box-shadow 0.3s ease; }
  .field input::placeholder, .field textarea::placeholder { color: var(--ink-2); opacity: 0.75; }
  .field textarea { min-height: 180px; resize: vertical; line-height: 1.5; }
  .field input:focus, .field textarea:focus { outline: none; border-color: var(--action-2);
    box-shadow: 0 0 0 4px var(--action-glow), 0 6px 18px var(--glass-shadow); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 1.35rem !important; letter-spacing: 0.14em; text-transform: uppercase; text-align: center; }
  .counter { color: var(--ink-2); font-size: 0.86rem; margin: 8px 4px 0; }
  .reveal[hidden] { display: none; }

  /* Bottom dock: frosted, stays reachable for thumbs while the list scrolls. */
  .actions { position: sticky; bottom: 0; z-index: 4; margin: auto -18px -24px; padding: 14px 18px calc(env(safe-area-inset-bottom) + 18px);
    display: flex; flex-direction: column; gap: 10px; background: var(--dock); border-top: 1px solid var(--glass-line);
    -webkit-backdrop-filter: blur(22px) saturate(170%); backdrop-filter: blur(22px) saturate(170%); }
  .reveal .actions { position: static; margin: 16px 0 0; padding: 0; background: none; border: 0;
    -webkit-backdrop-filter: none; backdrop-filter: none; }
  .btn { position: relative; overflow: hidden; display: block; width: 100%; padding: 16px 18px; cursor: pointer;
    font: inherit; font-size: 1.05rem; font-weight: 750; text-align: center; text-decoration: none; color: var(--action-ink);
    border: 0; border-radius: 999px; background: linear-gradient(135deg, var(--action-1), var(--action-2));
    box-shadow: 0 12px 28px var(--action-glow), inset 0 1px 0 rgba(255, 255, 255, 0.35);
    touch-action: manipulation; user-select: none; -webkit-user-select: none;
    transition: scale 0.4s var(--spring), opacity 0.25s ease, filter 0.25s ease; }
  .btn::before { content: ""; position: absolute; inset: 0 0 52% 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0)); }
  .btn:active { scale: 0.97; }
  .btn[disabled] { opacity: 0.42; filter: saturate(0.4); cursor: not-allowed; box-shadow: none; }
  .btn.ghost { color: var(--ink); background: var(--glass-strong); border: 1px solid var(--glass-line); box-shadow: 0 6px 18px var(--glass-shadow); }
  .btn.link { color: var(--ink-2); background: none; box-shadow: none; font-weight: 650; font-size: 0.98rem; padding: 10px; }
  .btn.ghost::before, .btn.link::before { display: none; }
  .btn.danger { background: var(--call); color: var(--call-ink); font-size: 1.15rem; box-shadow: 0 12px 30px color-mix(in srgb, var(--call) 40%, transparent); }
  .btn.danger::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--call) 55%, transparent); animation: ring 2.4s ease-out infinite; }
  @keyframes ring { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--call) 55%, transparent); } 80%, 100% { box-shadow: 0 0 0 14px transparent; } }
  .btn[hidden] { display: none; }

  .info { margin-top: 12px; padding: 15px 17px; border-radius: 22px; font-size: 0.95rem;
    background: var(--glass-strong); border: 1px solid var(--glass-line); box-shadow: 0 8px 24px var(--glass-shadow); }
  .info p { margin: 0; }
  .helpline { display: flex; gap: 14px; align-items: center; background: var(--warn-bg); color: var(--warn-ink); }
  .helpline .num { font-size: 2rem; font-weight: 850; line-height: 1; letter-spacing: -0.02em; }
  .fine { color: var(--ink-2); font-size: 0.84rem; text-align: center; margin: 16px 8px 4px; text-wrap: pretty; }
  .actions .fine { margin: 2px 8px 0; }

  /* Review: one grouped glass list, like a settings page. */
  .review { display: flex; flex-direction: column; border-radius: 24px; overflow: hidden;
    background: var(--glass-strong); border: 1px solid var(--glass-line); box-shadow: 0 10px 28px var(--glass-shadow); }
  .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; padding: 13px 16px;
    font: inherit; text-align: left; color: var(--ink); background: none; border: 0; cursor: pointer; transition: background 0.2s ease; }
  .row + .row { box-shadow: inset 0 1px 0 var(--sep); }
  .row:active { background: var(--sep); }
  .row small { display: block; color: var(--ink-2); font-size: 0.8rem; font-weight: 650; }
  .row .v { display: block; font-weight: 650; overflow-wrap: anywhere; }
  .row .edit { flex: none; color: var(--action-2); font-weight: 700; font-size: 0.85rem; }
  .row .edit::after { content: " ›"; font-size: 1.1rem; }

  .case-no { text-align: center; font-weight: 800; color: var(--ink-2); margin: 0 0 12px; font-variant-numeric: tabular-nums; }
  .codes { display: grid; gap: 10px; margin-bottom: 12px; }
  .code { padding: 16px; text-align: center; border-radius: 24px; background: linear-gradient(180deg, var(--glass-shine), transparent 50%), var(--glass-strong);
    border: 1px solid var(--glass-line); box-shadow: 0 10px 28px var(--glass-shadow); }
  .code small { display: block; color: var(--ink-2); font-weight: 650; }
  .code strong { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 1.85rem; letter-spacing: 0.12em; }
  .warn { margin: 0; padding: 12px 14px; border-radius: 18px; background: var(--warn-bg); color: var(--warn-ink); font-weight: 700; text-align: center; }
  .error { margin: 14px 0 0; padding: 13px 15px; border-radius: 18px; background: var(--danger-bg); color: var(--danger); white-space: pre-wrap; font-weight: 600; }
  .error[hidden] { display: none; }

  /* A few soap bubbles float up once when the report is in. */
  .float { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: -1; }
  .float i { position: absolute; bottom: -40px; width: 22px; height: 22px; border-radius: 50%; opacity: 0;
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.95) 0 12%, transparent 40%), color-mix(in srgb, var(--mint) 70%, transparent);
    box-shadow: inset 0 0 0 1px var(--glass-line); }
  .float i:nth-child(1) { left: 12%; } .float i:nth-child(2) { left: 28%; width: 14px; height: 14px; }
  .float i:nth-child(3) { left: 46%; width: 30px; height: 30px; } .float i:nth-child(4) { left: 63%; width: 16px; height: 16px; }
  .float i:nth-child(5) { left: 78%; } .float i:nth-child(6) { left: 88%; width: 12px; height: 12px; }
  .screen.shown .float i { animation: up 3.2s var(--ease-out) both; }
  .screen.shown .float i:nth-child(2) { animation-delay: 0.25s; } .screen.shown .float i:nth-child(3) { animation-delay: 0.1s; }
  .screen.shown .float i:nth-child(4) { animation-delay: 0.45s; } .screen.shown .float i:nth-child(5) { animation-delay: 0.3s; }
  .screen.shown .float i:nth-child(6) { animation-delay: 0.6s; }
  @keyframes up { 0% { opacity: 0; translate: 0 0; } 15% { opacity: 0.9; } 100% { opacity: 0; translate: 10px -78vh; } }

  .privacy { margin-top: 12px; padding: 15px 17px; border-radius: 22px; display: flex; flex-direction: column; gap: 10px;
    background: var(--glass-strong); border: 1px solid var(--glass-line); box-shadow: 0 8px 24px var(--glass-shadow); }
  .privacy[hidden], .privacy-result[hidden] { display: none; }
  .privacy-note { margin: 0; color: var(--ink-2); font-size: 0.9rem; }
  .privacy-summary { margin: 0; font-weight: 700; }
  .privacy-list { margin: 6px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 0.94rem; }
  .privacy-list strong { overflow-wrap: anywhere; }

  .case-number { font-weight: 800; font-size: 1.35rem; margin: 0 0 8px; font-variant-numeric: tabular-nums; }
  .status { display: inline-block; padding: 5px 13px; border-radius: 999px; font-weight: 700; font-size: 0.9rem; background: var(--sep); }
  .status.ok { background: var(--ok-bg); color: var(--ok); }
  .status.bad { background: var(--danger-bg); color: var(--danger); }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 14px 0; }
  .meta div { padding: 10px 12px; border-radius: 16px; background: var(--sep); }
  .meta small { display: block; color: var(--ink-2); font-size: 0.8rem; }
  .section-title { margin: 14px 0 10px; font-size: 1rem; }
  .timeline { list-style: none; padding: 0; margin: 0; }
  .timeline li { position: relative; padding: 0 0 14px 22px; margin-left: 6px; border-left: 2px solid var(--sep); }
  .timeline li::before { content: ""; position: absolute; left: -7px; top: 4px; width: 12px; height: 12px; border-radius: 50%;
    background: linear-gradient(135deg, var(--action-1), var(--action-2)); }
  .timeline time { display: block; color: var(--ink-2); font-size: 0.85rem; }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .back, .progress, .sos, .actions { background: var(--glass-strong); }
  }
  @media (prefers-reduced-motion: reduce) {
    .aurora i, .orb, .orb-body, .eye, .btn.danger::after { animation: none !important; }
    .screen.in-fwd, .screen.in-back, .screen.shown .chip, .screen.shown .field, .screen.shown .info, .screen.shown .review,
    .screen.shown .codes, .screen.shown .warn, .screen.shown .case-no, .screen.shown .fine, .screen.shown .actions { animation: none; }
    .screen.out-fwd, .screen.out-back, .float { display: none; }
    .progress b, .chip::before { transition: none; }
  }
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

    // ---------- presentation: mood, "typing", haptics ----------
    var app = document.querySelector(".app");
    var still = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
    // A short tap of haptics on Android; browsers only allow it after a real tap.
    function buzz(pattern) {
      var active = !navigator.userActivation || navigator.userActivation.hasBeenActive;
      if (navigator.vibrate && active) { try { navigator.vibrate(pattern); } catch (e) { return; } }
    }
    function nod() {
      app.classList.remove("nod");
      void app.offsetWidth;
      app.classList.add("nod");
      setTimeout(function () { app.classList.remove("nod"); }, 520);
    }
    // The helper "types" for a moment on forward moves, then the answers
    // rise in. Both states are classes added here, so content stays visible
    // when motion is reduced or the script fails.
    function present(target, step, animate) {
      app.setAttribute("data-mood", step === "unsafe" ? "care" : step === "receipt" ? "happy" : "calm");
      target.classList.remove("typing", "shown");
      if (!animate || still.matches) { return; }
      target.classList.add("typing");
      setTimeout(function () {
        target.classList.remove("typing");
        if (current === target) { target.classList.add("shown"); }
      }, 380);
    }

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
      present(target, step, dir !== "back");
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
      buzz(8);
      nod();
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
          buzz([12, 60, 12]);
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
    // The selected answer fills with colour from the point that was touched.
    stage.addEventListener("pointerdown", function (event) {
      var t = event.target;
      if (!(t instanceof Element)) { return; }
      var chipEl = t.closest(".chip");
      if (!chipEl) { return; }
      var r = chipEl.getBoundingClientRect();
      chipEl.style.setProperty("--x", (event.clientX - r.left) + "px");
      chipEl.style.setProperty("--y", (event.clientY - r.top) + "px");
      chipEl.style.setProperty("--s", String(Math.ceil(Math.max(r.width, r.height) / 6) + 2));
    });
    // The helper looks down at the keyboard while the child is writing.
    stage.addEventListener("focusin", function (event) {
      var t = event.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) { app.classList.add("listening"); }
    });
    stage.addEventListener("focusout", function () { app.classList.remove("listening"); });
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
<meta name="theme-color" content="#eef0fb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0b22" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:,">
<title>Эрх хамгаалал — Мэдэгдэл илгээх</title>
<style nonce="${escapeHtml(nonce)}">${css}</style>
</head>
<body>
<div class="app" data-mood="calm">
  <div class="aurora" aria-hidden="true"><i class="a1"></i><i class="a2"></i><i class="a3"></i><i class="a4"></i></div>
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
