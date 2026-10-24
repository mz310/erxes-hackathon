import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SLA_HOURS,
  assertTransition,
  assignmentGate,
  canTransition,
  computeDueAt,
  conflictGate,
  evidenceChecksum,
  formatCaseNumber,
  generatePin,
  generateTrackingCode,
  hashPin,
  initialProtocolSteps,
  planEscalation,
  sanitizeReportInput,
  validateReportInput,
  verifyPin,
  type ReportInput,
} from "./domain.ts";

const valid: ReportInput = {
  title: "Багш сурагчийг зодсон",
  description: "Ширээн дээрээс сандал унагаасан гэж цохиж, өшиглөсөн.",
  category: "physical_violence",
  severity: "critical",
  reporterRole: "parent",
  isAnonymous: false,
  victimRole: "student",
  schoolName: "X сургууль",
  incidentDate: "2026-03-09",
};

test("computeDueAt adds the severity SLA", () => {
  const from = new Date("2026-03-09T08:00:00Z");
  assert.equal(
    computeDueAt(from, "critical", DEFAULT_SLA_HOURS).toISOString(),
    "2026-03-10T08:00:00.000Z",
  );
  assert.equal(
    computeDueAt(from, "low", DEFAULT_SLA_HOURS).toISOString(),
    "2026-03-23T08:00:00.000Z",
  );
});

test("protocol only for physical and sexual violence", () => {
  assert.deepEqual(
    initialProtocolSteps("physical_violence").map((step) => step.key),
    ["medical_aid", "notify_guardian", "separate_accused", "report_authority"],
  );
  assert.deepEqual(
    initialProtocolSteps("sexual_harassment").map((step) => step.key),
    ["medical_aid", "notify_guardian", "separate_accused", "report_authority"],
  );
  assert.deepEqual(initialProtocolSteps("bullying"), []);
});

test("transition table", () => {
  assert.equal(canTransition("new", "under_review"), true);
  assert.equal(canTransition("new", "dismissed"), true);
  assert.equal(canTransition("new", "resolved"), false);
  assert.equal(canTransition("under_review", "investigating"), true);
  assert.equal(canTransition("under_review", "resolved"), false);
  assert.equal(canTransition("investigating", "resolved"), true);
  assert.equal(canTransition("investigating", "dismissed"), true);
  assert.equal(canTransition("resolved", "investigating"), true);
  assert.equal(canTransition("dismissed", "under_review"), true);
  assert.equal(canTransition("resolved", "resolved"), false);
});

test("resolve is refused while a protocol step is undone", () => {
  const steps = initialProtocolSteps("physical_violence");
  assert.equal(
    assertTransition("investigating", "resolved", steps),
    "Яаралтай протоколын бүх алхам дуусаагүй байна",
  );
  const done = steps.map((step) => ({ ...step, doneAt: new Date(), doneBy: "u1" }));
  assert.equal(assertTransition("investigating", "resolved", done), null);
  assert.equal(assertTransition("investigating", "resolved", []), null);
  assert.equal(assertTransition("new", "resolved", []), "Энэ төлөвт шилжүүлэх боломжгүй");
});

test("formatCaseNumber", () => {
  assert.equal(formatCaseNumber(2026, 1), "ЭХ-2026-0001");
  assert.equal(formatCaseNumber(2026, 1234), "ЭХ-2026-1234");
});

test("planEscalation", () => {
  const now = new Date("2026-03-12T00:00:00Z");
  const due = new Date("2026-03-11T00:00:00Z");
  assert.deepEqual(planEscalation({ now, dueAt: due, status: "new", level: 0 }), {
    shouldEscalate: true,
    level: 1,
    dueAt: new Date("2026-03-13T00:00:00Z"),
  });
  assert.deepEqual(planEscalation({ now, dueAt: due, status: "investigating", level: 1 }), {
    shouldEscalate: true,
    level: 2,
    dueAt: new Date("2026-03-13T00:00:00Z"),
  });
  assert.deepEqual(planEscalation({ now, dueAt: due, status: "resolved", level: 0 }), {
    shouldEscalate: false,
  });
  assert.deepEqual(planEscalation({ now, dueAt: due, status: "dismissed", level: 0 }), {
    shouldEscalate: false,
  });
  assert.deepEqual(planEscalation({ now, dueAt: due, status: "investigating", level: 2 }), {
    shouldEscalate: false,
  });
  assert.deepEqual(planEscalation({ now: due, dueAt: now, status: "new", level: 0 }), {
    shouldEscalate: false,
  });
});

test("tracking code and pin", () => {
  const code = generateTrackingCode(() => 0.5);
  assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
  assert.equal(generatePin(() => 0), "000000");
  assert.match(generatePin(), /^\d{6}$/);
  const hash = hashPin("ABC", "123456");
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(verifyPin("ABC", "123456", hash), true);
  assert.equal(verifyPin("ABC", "123457", hash), false);
  assert.equal(verifyPin("ABD", "123456", hash), false);
  assert.equal(verifyPin("ABC", "123456", "short"), false);
});

test("validateReportInput rejects future incident date and short text", () => {
  const now = new Date("2026-10-24T00:00:00Z");
  const errors = validateReportInput(
    { ...valid, incidentDate: "2027-01-01", title: "ab", description: "short" },
    now,
  );
  assert.ok(errors.some((message) => message.includes("огноо")));
  assert.equal(errors.length, 3);
  assert.deepEqual(validateReportInput(valid, now), []);
  assert.ok(validateReportInput({ ...valid, incidentDate: "not-a-date" }, now).length >= 1);
  assert.ok(validateReportInput({ ...valid, schoolName: "   " }, now).length >= 1);
  assert.ok(
    validateReportInput({ ...valid, category: "nope" as ReportInput["category"] }, now).length >= 1,
  );
});

test("sanitizeReportInput drops contact when anonymous", () => {
  const anonymous = sanitizeReportInput({
    ...valid,
    isAnonymous: true,
    reporterContact: "99112233",
    title: "  Зодсон  ",
    grade: "",
  });
  assert.equal(anonymous.reporterContact, null);
  assert.equal(anonymous.title, "Зодсон");
  assert.equal(anonymous.grade, null);
  const named = sanitizeReportInput({ ...valid, isAnonymous: false, reporterContact: " 99112233 " });
  assert.equal(named.reporterContact, "99112233");
});

test("evidenceChecksum is stable and sensitive", () => {
  const fields = {
    caseId: "c1",
    kind: "photo" as const,
    title: "Гэмтлийн зураг",
    recordedAt: new Date(0),
    createdAt: new Date(1),
  };
  assert.equal(evidenceChecksum(fields), evidenceChecksum({ ...fields }));
  assert.match(evidenceChecksum(fields), /^[a-f0-9]{64}$/);
  assert.notEqual(evidenceChecksum(fields), evidenceChecksum({ ...fields, title: "x" }));
  assert.notEqual(
    evidenceChecksum(fields),
    evidenceChecksum({ ...fields, recordedAt: new Date(5) }),
  );
});

test("tracking code and PIN do not come from Math.random by default", () => {
  const original = Math.random;
  Math.random = () => 0;
  try {
    const codes = new Set(Array.from({ length: 20 }, () => generateTrackingCode()));
    const pins = new Set(Array.from({ length: 20 }, () => generatePin()));
    assert.ok(codes.size > 1, "tracking codes must come from a CSPRNG");
    assert.ok(pins.size > 1, "PINs must come from a CSPRNG");
  } finally {
    Math.random = original;
  }
});

test("a date-only incident date of today is valid in any timezone up to UTC+14", () => {
  // 02:00 on 24 October in Ulaanbaatar (UTC+8) is still 23 October in UTC.
  const earlyMorningUb = new Date("2026-10-23T18:00:00Z");
  assert.deepEqual(validateReportInput({ ...valid, incidentDate: "2026-10-24" }, earlyMorningUb), []);
  // Tomorrow is still the future everywhere.
  const afternoonUb = new Date("2026-10-24T09:00:00Z");
  assert.equal(
    validateReportInput({ ...valid, incidentDate: "2026-10-25" }, afternoonUb).length,
    1,
  );
});

test("assignment requires the acting user's own clean declaration and a clean assignee", () => {
  const declaration = (userId: string, hasConflict: boolean) => ({
    userId,
    hasConflict,
    declaredAt: new Date(1),
  });
  assert.equal(
    assignmentGate([], "manager", "handler"),
    "Эхлээд ашиг сонирхлын зөрчилгүй гэдгээ мэдүүлнэ үү",
  );
  assert.equal(
    assignmentGate([declaration("manager", true)], "manager", "handler"),
    "Ашиг сонирхлын зөрчил мэдүүлсэн хэрэглэгч энэ хэрэг дээр ажиллах боломжгүй",
  );
  assert.equal(
    assignmentGate(
      [declaration("manager", false), declaration("handler", true)],
      "manager",
      "handler",
    ),
    "Энэ хэрэглэгч ашиг сонирхлын зөрчил мэдүүлсэн тул хариуцагчаар томилох боломжгүй",
  );
  assert.equal(assignmentGate([declaration("manager", false)], "manager", "handler"), null);
});

test("conflictGate", () => {
  assert.equal(conflictGate([], "u1"), "Эхлээд ашиг сонирхлын зөрчилгүй гэдгээ мэдүүлнэ үү");
  const declaration = (hasConflict: boolean, time: number) => ({
    userId: "u1",
    hasConflict,
    declaredAt: new Date(time),
  });
  assert.equal(conflictGate([declaration(true, 1), declaration(false, 2)], "u1"), null);
  assert.equal(
    conflictGate([declaration(false, 1), declaration(true, 2)], "u1"),
    "Ашиг сонирхлын зөрчил мэдүүлсэн хэрэглэгч энэ хэрэг дээр ажиллах боломжгүй",
  );
  assert.equal(
    conflictGate([declaration(false, 1)], "u2"),
    "Эхлээд ашиг сонирхлын зөрчилгүй гэдгээ мэдүүлнэ үү",
  );
});
