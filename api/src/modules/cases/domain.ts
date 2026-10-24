import { createHash, randomInt, timingSafeEqual } from "node:crypto";

// Pure domain rules for rights-violation cases. No framework imports: this
// module is unit-tested with `node --test` through Node's native type
// stripping, so it only uses erasable TypeScript (no enums).

export const CASE_CATEGORIES = [
  "physical_violence",
  "psychological_violence",
  "bullying",
  "sexual_harassment",
  "discrimination",
  "neglect_of_duty",
  "teacher_labor_rights",
  "unfair_assessment",
  "privacy_breach",
  "other",
] as const;
export type CaseCategory = (typeof CASE_CATEGORIES)[number];

export const CASE_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type CaseSeverity = (typeof CASE_SEVERITIES)[number];

export const CASE_STATUSES = [
  "new",
  "under_review",
  "investigating",
  "resolved",
  "dismissed",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const REPORTER_ROLES = ["student", "parent", "teacher", "staff", "other"] as const;
export type ReporterRole = (typeof REPORTER_ROLES)[number];

export const VICTIM_ROLES = ["student", "teacher", "staff", "other"] as const;
export type VictimRole = (typeof VICTIM_ROLES)[number];

export const ACCUSED_ROLES = ["teacher", "administrator", "student", "staff", "other"] as const;
export type AccusedRole = (typeof ACCUSED_ROLES)[number];

export const EVIDENCE_KINDS = [
  "photo",
  "medical_record",
  "witness_statement",
  "document",
  "other",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVENT_TYPES = [
  "created",
  "status_changed",
  "assigned",
  "note",
  "evidence_added",
  "escalated",
  "protocol_step",
  "conflict_declared",
  "reclassified",
  "ai_assist",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const PROTOCOL_STEP_KEYS = [
  "medical_aid",
  "notify_guardian",
  "separate_accused",
  "report_authority",
] as const;
export type ProtocolStepKey = (typeof PROTOCOL_STEP_KEYS)[number];

export const CASE_SOURCES = ["public", "staff"] as const;
export type CaseSource = (typeof CASE_SOURCES)[number];

export const PROTOCOL_CATEGORIES: readonly CaseCategory[] = [
  "physical_violence",
  "sexual_harassment",
];
export const OPEN_STATUSES: readonly CaseStatus[] = ["new", "under_review", "investigating"];
export const MAX_ESCALATION_LEVEL = 2;
export const ESCALATION_GRACE_HOURS = 24;

export type SlaHours = Record<CaseSeverity, number>;
export const DEFAULT_SLA_HOURS: SlaHours = { critical: 24, high: 72, medium: 168, low: 336 };

export const STATUS_LABELS_MN: Record<CaseStatus, string> = {
  new: "Шинэ",
  under_review: "Хянагдаж байна",
  investigating: "Шалгагдаж байна",
  resolved: "Шийдвэрлэгдсэн",
  dismissed: "Хэрэгсэхгүй болсон",
};

export const SEVERITY_LABELS_MN: Record<CaseSeverity, string> = {
  low: "Бага",
  medium: "Дунд",
  high: "Өндөр",
  critical: "Онц ноцтой",
};

export const CATEGORY_LABELS_MN: Record<CaseCategory, string> = {
  physical_violence: "Бие махбодийн хүчирхийлэл",
  psychological_violence: "Сэтгэл зүйн хүчирхийлэл",
  bullying: "Дээрэлхэлт",
  sexual_harassment: "Бэлгийн дарамт",
  discrimination: "Ялгаварлан гадуурхалт",
  neglect_of_duty: "Удирдлагын үл хайхрал, нуун дарагдуулалт",
  teacher_labor_rights: "Багшийн хөдөлмөрийн эрх",
  unfair_assessment: "Шударга бус үнэлгээ",
  privacy_breach: "Хувийн мэдээлэл задруулалт",
  other: "Бусад",
};

export const REPORTER_ROLE_LABELS_MN: Record<ReporterRole, string> = {
  student: "Сурагч",
  parent: "Эцэг эх, асран хамгаалагч",
  teacher: "Багш",
  staff: "Ажилтан",
  other: "Бусад",
};

export const VICTIM_ROLE_LABELS_MN: Record<VictimRole, string> = {
  student: "Сурагч",
  teacher: "Багш",
  staff: "Ажилтан",
  other: "Бусад",
};

export const ACCUSED_ROLE_LABELS_MN: Record<AccusedRole, string> = {
  teacher: "Багш",
  administrator: "Удирдлага",
  student: "Сурагч",
  staff: "Ажилтан",
  other: "Бусад",
};

export const EVIDENCE_KIND_LABELS_MN: Record<EvidenceKind, string> = {
  photo: "Зураг",
  medical_record: "Эмчийн үзлэг, эмнэлгийн бичиг",
  witness_statement: "Гэрчийн мэдүүлэг",
  document: "Баримт бичиг",
  other: "Бусад",
};

export const PROTOCOL_STEP_LABELS_MN: Record<ProtocolStepKey, string> = {
  medical_aid: "Эмнэлгийн тусламж үзүүлэх",
  notify_guardian: "Эцэг эх, асран хамгаалагчид мэдэгдэх",
  separate_accused: "Буруутгагдагчийг хохирогчоос түр тусгаарлах",
  report_authority: "Эрх бүхий байгууллагад мэдээлэх (108 / цагдаа / БСУГ)",
};

export const isOpenStatus = (status: CaseStatus): boolean => OPEN_STATUSES.includes(status);

const HOUR_MS = 60 * 60 * 1000;

export const computeDueAt = (from: Date, severity: CaseSeverity, sla: SlaHours): Date =>
  new Date(from.getTime() + sla[severity] * HOUR_MS);

export const requiresProtocol = (category: CaseCategory): boolean =>
  PROTOCOL_CATEGORIES.includes(category);

export type ProtocolStep = {
  key: ProtocolStepKey;
  doneAt?: Date | null;
  doneBy?: string | null;
};

export const initialProtocolSteps = (category: CaseCategory): ProtocolStep[] =>
  requiresProtocol(category) ? PROTOCOL_STEP_KEYS.map((key) => ({ key })) : [];

export const protocolComplete = (steps: ProtocolStep[]): boolean =>
  steps.every((step) => Boolean(step.doneAt));

const TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  new: ["under_review", "dismissed"],
  under_review: ["investigating", "dismissed"],
  investigating: ["resolved", "dismissed"],
  resolved: ["investigating"],
  dismissed: ["under_review"],
};

export const canTransition = (from: CaseStatus, to: CaseStatus): boolean =>
  TRANSITIONS[from].includes(to);

export const assertTransition = (
  from: CaseStatus,
  to: CaseStatus,
  steps: ProtocolStep[],
): string | null => {
  if (!canTransition(from, to)) {
    return "Энэ төлөвт шилжүүлэх боломжгүй";
  }
  if (to === "resolved" && !protocolComplete(steps)) {
    return "Яаралтай протоколын бүх алхам дуусаагүй байна";
  }
  return null;
};

export const formatCaseNumber = (year: number, seq: number): string =>
  `ЭХ-${year}-${String(seq).padStart(4, "0")}`;

export type EscalationPlan =
  | { shouldEscalate: false }
  | { shouldEscalate: true; level: number; dueAt: Date };

export const planEscalation = (input: {
  now: Date;
  dueAt: Date;
  status: CaseStatus;
  level: number;
}): EscalationPlan => {
  const { now, dueAt, status, level } = input;
  if (!isOpenStatus(status) || level >= MAX_ESCALATION_LEVEL || now.getTime() <= dueAt.getTime()) {
    return { shouldEscalate: false };
  }
  return {
    shouldEscalate: true,
    level: level + 1,
    dueAt: new Date(now.getTime() + ESCALATION_GRACE_HOURS * HOUR_MS),
  };
};

const TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const pick = (alphabet: string, random: () => number): string => {
  const index = Math.min(alphabet.length - 1, Math.floor(random() * alphabet.length));
  return alphabet.charAt(index);
};

// The tracking code and PIN are the only credential for the public case view,
// so they come from the OS CSPRNG; Math.random's state can be reconstructed
// from a few outputs. The parameter exists only so tests can be deterministic.
const RANDOM_RANGE = 2 ** 32;
const secureRandom = (): number => randomInt(0, RANDOM_RANGE) / RANDOM_RANGE;

export const generateTrackingCode = (random: () => number = secureRandom): string =>
  Array.from({ length: 10 }, () => pick(TRACKING_ALPHABET, random)).join("");

export const generatePin = (random: () => number = secureRandom): string =>
  Array.from({ length: 6 }, () => pick("0123456789", random)).join("");

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

export const hashPin = (trackingCode: string, pin: string): string =>
  sha256(`${trackingCode}:${pin}`);

export const verifyPin = (trackingCode: string, pin: string, hash: string): boolean => {
  const expected = Buffer.from(hashPin(trackingCode, pin), "utf8");
  const actual = Buffer.from(hash, "utf8");
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
};

export type ReportInput = {
  title: string;
  description: string;
  category: CaseCategory;
  severity: CaseSeverity;
  reporterRole: ReporterRole;
  isAnonymous: boolean;
  reporterContact?: string | null;
  victimRole: VictimRole;
  schoolName: string;
  grade?: string | null;
  incidentDate: string | Date;
  incidentLocation?: string | null;
  accusedRole?: AccusedRole | null;
  accusedDescription?: string | null;
};

const lengthBetween = (value: string | null | undefined, min: number, max: number): boolean => {
  const length = (value ?? "").trim().length;
  return length >= min && length <= max;
};

const oneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (values as readonly string[]).includes(value);

const LATEST_UTC_OFFSET_HOURS = 14;

const isDateOnly = (value: string | Date): boolean =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

export const parseIncidentDate = (value: string | Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const validateReportInput = (input: ReportInput, now: Date): string[] => {
  const errors: string[] = [];
  if (!lengthBetween(input.title, 3, 200)) {
    errors.push("Гарчиг 3–200 тэмдэгт байх ёстой");
  }
  if (!lengthBetween(input.description, 10, 5000)) {
    errors.push("Тайлбар 10–5000 тэмдэгт байх ёстой");
  }
  if (!oneOf(CASE_CATEGORIES, input.category)) {
    errors.push("Зөрчлийн төрөл буруу");
  }
  if (!oneOf(CASE_SEVERITIES, input.severity)) {
    errors.push("Ноцтой байдлын түвшин буруу");
  }
  if (!oneOf(REPORTER_ROLES, input.reporterRole)) {
    errors.push("Мэдэгдэгчийн төрөл буруу");
  }
  if (!oneOf(VICTIM_ROLES, input.victimRole)) {
    errors.push("Хохирогчийн төрөл буруу");
  }
  if (input.accusedRole != null && !oneOf(ACCUSED_ROLES, input.accusedRole)) {
    errors.push("Буруутгагдагчийн төрөл буруу");
  }
  if (!lengthBetween(input.schoolName, 1, 200)) {
    errors.push("Сургуулийн нэр заавал");
  }
  const incidentDate = parseIncidentDate(input.incidentDate);
  // A date-only value ("2026-10-24", from <input type="date">) parses as UTC
  // midnight, but the reporter means their local day. Accept it once that day
  // has begun anywhere (UTC+14), so "today" works in Ulaanbaatar before 08:00.
  const latestAllowed = isDateOnly(input.incidentDate)
    ? now.getTime() + LATEST_UTC_OFFSET_HOURS * HOUR_MS
    : now.getTime();
  if (!incidentDate || incidentDate.getTime() > latestAllowed) {
    errors.push("Хэрэг болсон огноо буруу эсвэл ирээдүйд байна");
  }
  if (!lengthBetween(input.reporterContact, 0, 200)) {
    errors.push("Холбоо барих мэдээлэл 200 тэмдэгтээс хэтрэхгүй");
  }
  if (!lengthBetween(input.accusedDescription, 0, 1000)) {
    errors.push("Буруутгагдагчийн тайлбар 1000 тэмдэгтээс хэтрэхгүй");
  }
  return errors;
};

const cleanOptional = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
};

export const sanitizeReportInput = (input: ReportInput): ReportInput => ({
  title: input.title.trim(),
  description: input.description.trim(),
  category: input.category,
  severity: input.severity,
  reporterRole: input.reporterRole,
  isAnonymous: Boolean(input.isAnonymous),
  reporterContact: input.isAnonymous ? null : cleanOptional(input.reporterContact),
  victimRole: input.victimRole,
  schoolName: input.schoolName.trim(),
  grade: cleanOptional(input.grade),
  incidentDate: input.incidentDate,
  incidentLocation: cleanOptional(input.incidentLocation),
  accusedRole: input.accusedRole ?? null,
  accusedDescription: cleanOptional(input.accusedDescription),
});

export const evidenceChecksum = (fields: {
  caseId: string;
  kind: EvidenceKind;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  recordedAt: Date;
  createdAt: Date;
}): string =>
  sha256(
    [
      fields.caseId,
      fields.kind,
      fields.title,
      fields.description ?? "",
      fields.fileUrl ?? "",
      fields.recordedAt.toISOString(),
      fields.createdAt.toISOString(),
    ].join("|"),
  );

export type ConflictDeclaration = {
  userId: string;
  hasConflict: boolean;
  note?: string | null;
  declaredAt: Date;
};

export const latestDeclaration = (
  declarations: ConflictDeclaration[],
  userId: string,
): ConflictDeclaration | undefined =>
  declarations
    .filter((declaration) => declaration.userId === userId)
    .sort((a, b) => b.declaredAt.getTime() - a.declaredAt.getTime())[0];

// Assigning is a decision about the case, so the person assigning must have
// declared no conflict themselves, and the assignee must not have declared one.
export const assignmentGate = (
  declarations: ConflictDeclaration[],
  actorId: string,
  assigneeId: string,
): string | null => {
  const actorProblem = conflictGate(declarations, actorId);
  if (actorProblem) {
    return actorProblem;
  }
  if (latestDeclaration(declarations, assigneeId)?.hasConflict) {
    return "Энэ хэрэглэгч ашиг сонирхлын зөрчил мэдүүлсэн тул хариуцагчаар томилох боломжгүй";
  }
  return null;
};

export const conflictGate = (
  declarations: ConflictDeclaration[],
  userId: string,
): string | null => {
  const latest = latestDeclaration(declarations, userId);
  if (!latest) {
    return "Эхлээд ашиг сонирхлын зөрчилгүй гэдгээ мэдүүлнэ үү";
  }
  if (latest.hasConflict) {
    return "Ашиг сонирхлын зөрчил мэдүүлсэн хэрэглэгч энэ хэрэг дээр ажиллах боломжгүй";
  }
  return null;
};

export const RECLASSIFY_NOTE_MIN = 3;
export const RECLASSIFY_NOTE_MAX = 2000;

export type ReclassifyPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      category: CaseCategory;
      severity: CaseSeverity;
      dueAt: Date;
      protocolSteps: ProtocolStep[];
      addedProtocol: boolean;
      note: string;
    };

// Fixing a wrong category or severity may only tighten a case, never loosen
// it: the emergency protocol is added when the new category needs it and is
// never removed, and the deadline can move earlier but never later. A case
// filed as «Бусад» that turns out to be a beating gets the protocol; nobody
// can reclassify a case to escape its deadline or its checklist.
export const planReclassify = (input: {
  status: CaseStatus;
  category: CaseCategory;
  severity: CaseSeverity;
  createdAt: Date;
  dueAt: Date;
  protocolSteps: ProtocolStep[];
  nextCategory: CaseCategory;
  nextSeverity: CaseSeverity;
  note: string | null | undefined;
  sla: SlaHours;
}): ReclassifyPlan => {
  if (!isOpenStatus(input.status)) {
    return { ok: false, error: "Хаагдсан хэргийн ангиллыг өөрчлөх боломжгүй. Эхлээд дахин нээнэ үү" };
  }
  if (!oneOf(CASE_CATEGORIES, input.nextCategory)) {
    return { ok: false, error: "Зөрчлийн төрөл буруу" };
  }
  if (!oneOf(CASE_SEVERITIES, input.nextSeverity)) {
    return { ok: false, error: "Ноцтой байдлын түвшин буруу" };
  }
  const note = (input.note ?? "").trim();
  if (note.length < RECLASSIFY_NOTE_MIN || note.length > RECLASSIFY_NOTE_MAX) {
    return {
      ok: false,
      error: `Ангилал өөрчлөх шалтгаанаа ${RECLASSIFY_NOTE_MIN}–${RECLASSIFY_NOTE_MAX} тэмдэгтээр бичнэ үү`,
    };
  }
  if (input.nextCategory === input.category && input.nextSeverity === input.severity) {
    return { ok: false, error: "Ангилал, ноцтой байдал өөрчлөгдөөгүй байна" };
  }
  const addedProtocol = input.protocolSteps.length === 0 && requiresProtocol(input.nextCategory);
  const candidateDue = computeDueAt(input.createdAt, input.nextSeverity, input.sla);
  const dueAt =
    candidateDue.getTime() < input.dueAt.getTime() ? candidateDue : new Date(input.dueAt.getTime());
  return {
    ok: true,
    category: input.nextCategory,
    severity: input.nextSeverity,
    dueAt,
    protocolSteps: addedProtocol ? initialProtocolSteps(input.nextCategory) : input.protocolSteps,
    addedProtocol,
    note,
  };
};

const CONTACT_PATTERNS: readonly RegExp[] = [
  // e-mail addresses
  /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu,
  // Mongolian phone numbers: 8 digits, optionally +976, optional space/dash
  /(?<!\d)(?:\+?976[\s-]?)?\d{4}[\s-]?\d{4}(?!\d)/g,
  // social media handles (@bat_99), not the middle of an e-mail address
  /(?<![\p{L}\p{N}._%+-])@[A-Za-z0-9_.]{3,30}/gu,
];

const MAX_CONTACT_MATCHES = 10;

// Deterministic part of the anonymity check: contact details are found by
// pattern, without any model, so this part works even when AI is off and
// cannot be talked out of a finding by the text it scans.
export const detectContactDetails = (text: string): string[] => {
  const found = new Set<string>();
  for (const pattern of CONTACT_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      // A handle at the end of a sentence must not keep the full stop.
      const value = match[0].trim().replace(/[.,;:!?]+$/u, "");
      if (value) {
        found.add(value);
      }
    }
  }
  return [...found].slice(0, MAX_CONTACT_MATCHES);
};
