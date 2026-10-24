import assert from "node:assert/strict";
import { test } from "node:test";
import type { ICase } from "../db/definitions/case.ts";
import type { ICaseEvent } from "../db/definitions/caseEvent.ts";
import { toCaseGql, toPublicCaseGql } from "./serialize.ts";

const now = new Date("2026-03-12T00:00:00Z");

const caseDoc: ICase & { _id: string } = {
  _id: "case1",
  caseNumber: "ЭХ-2026-0001",
  title: "Багш сурагчийг зодсон",
  description: "Ширээн дээрээс сандал унагаасан гэж цохиж, өшиглөсөн.",
  category: "physical_violence",
  severity: "critical",
  status: "investigating",
  reporterRole: "parent",
  isAnonymous: false,
  reporterContact: "99112233",
  victimRole: "student",
  schoolName: "X сургууль",
  incidentDate: new Date("2026-03-09T00:00:00Z"),
  source: "public",
  assigneeId: "staff-7",
  dueAt: new Date("2026-03-11T00:00:00Z"),
  escalationLevel: 1,
  trackingCode: "ABCDEFGHJK",
  trackingPinHash: "secret-hash",
  conflictDeclarations: [{ userId: "staff-7", hasConflict: false, declaredAt: now }],
  protocolSteps: [],
  createdBy: null,
  createdAt: new Date("2026-03-09T08:00:00Z"),
  updatedAt: now,
};

const events: ICaseEvent[] = [
  {
    caseId: "case1",
    type: "created",
    message: "Мэдэгдэл бүртгэгдлээ",
    actorId: null,
    isPublic: true,
    createdAt: new Date("2026-03-09T08:00:00Z"),
  },
  {
    caseId: "case1",
    type: "note",
    message: "Дотоод тэмдэглэл: захирлын нөхөр",
    actorId: "staff-7",
    isPublic: false,
    createdAt: new Date("2026-03-10T08:00:00Z"),
  },
  {
    caseId: "case1",
    type: "assigned",
    message: "Хариуцагч томилогдлоо",
    payload: { assigneeId: "staff-7" },
    actorId: "staff-9",
    isPublic: true,
    createdAt: new Date("2026-03-10T09:00:00Z"),
  },
];

test("reporter view keeps only public messages and never staff identity or contact", () => {
  const view = toPublicCaseGql(caseDoc, events, now);
  assert.deepEqual(view.updates, [
    { message: "Мэдэгдэл бүртгэгдлээ", createdAt: "2026-03-09T08:00:00.000Z" },
    { message: "Хариуцагч томилогдлоо", createdAt: "2026-03-10T09:00:00.000Z" },
  ]);
  const serialized = JSON.stringify(view);
  for (const secret of ["staff-7", "staff-9", "99112233", "secret-hash", "Дотоод тэмдэглэл", "ABCDEFGHJK"]) {
    assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
  }
  assert.equal(view.isOverdue, true);
  assert.equal(view.statusLabel, "Шалгагдаж байна");
});

test("staff view never exposes the PIN hash", () => {
  const view = toCaseGql(caseDoc, now);
  assert.equal(JSON.stringify(view).includes("secret-hash"), false);
  assert.equal(view.isOverdue, true);
  assert.equal(toCaseGql({ ...caseDoc, status: "resolved" }, now).isOverdue, false);
});

test("reporter view never shows AI assistant or reclassification events", () => {
  const internal: ICaseEvent[] = [
    ...events,
    {
      caseId: "case1",
      type: "ai_assist",
      message: "AI туслахаар ангилал, ноцтой байдлын санал авав",
      payload: { task: "triage", model: "gemma-4-26b-a4b-it", category: "physical_violence" },
      actorId: "staff-7",
      isPublic: false,
      createdAt: new Date("2026-03-10T10:00:00Z"),
    },
    {
      caseId: "case1",
      type: "reclassified",
      message: "Төрөл: Бусад → Бие махбодийн хүчирхийлэл",
      payload: { note: "Дотоод шалтгаан" },
      actorId: "staff-7",
      isPublic: false,
      createdAt: new Date("2026-03-10T11:00:00Z"),
    },
  ];
  const serialized = JSON.stringify(toPublicCaseGql(caseDoc, internal, now));
  for (const secret of ["AI туслах", "gemma", "Төрөл:", "Дотоод шалтгаан", "staff-7"]) {
    assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
  }
});
