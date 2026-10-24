import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SLA_HOURS, detectContactDetails, planReclassify } from "./domain.ts";

const createdAt = new Date("2026-03-01T00:00:00Z");
const base = {
  status: "under_review" as const,
  category: "other" as const,
  severity: "medium" as const,
  createdAt,
  // medium = 168h after creation
  dueAt: new Date("2026-03-08T00:00:00Z"),
  protocolSteps: [],
  nextCategory: "physical_violence" as const,
  nextSeverity: "critical" as const,
  note: "Тайлбараас харахад зодуулсан байна",
  sla: DEFAULT_SLA_HOURS,
};

test("reclassifying into a protocol category adds the protocol and pulls the deadline in", () => {
  const plan = planReclassify(base);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.addedProtocol, true);
  assert.deepEqual(
    plan.protocolSteps.map((step) => step.key),
    ["medical_aid", "notify_guardian", "separate_accused", "report_authority"],
  );
  // critical = 24h after creation, earlier than the current deadline
  assert.equal(plan.dueAt.toISOString(), "2026-03-02T00:00:00.000Z");
});

test("lowering severity never extends the deadline", () => {
  const plan = planReclassify({ ...base, nextCategory: "other", nextSeverity: "low" });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.dueAt.toISOString(), base.dueAt.toISOString());
});

test("leaving a protocol category keeps the protocol steps", () => {
  const steps = [
    { key: "medical_aid" as const, doneAt: createdAt, doneBy: "u1" },
    { key: "notify_guardian" as const },
    { key: "separate_accused" as const },
    { key: "report_authority" as const },
  ];
  const plan = planReclassify({
    ...base,
    category: "physical_violence",
    protocolSteps: steps,
    nextCategory: "bullying",
    nextSeverity: "medium",
  });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.addedProtocol, false);
  assert.deepEqual(plan.protocolSteps, steps);
});

test("reclassify refuses closed cases, missing reasons and no-op changes", () => {
  const closed = planReclassify({ ...base, status: "resolved" });
  assert.equal(closed.ok, false);
  const noReason = planReclassify({ ...base, note: "  " });
  assert.equal(noReason.ok, false);
  const same = planReclassify({ ...base, nextCategory: "other", nextSeverity: "medium" });
  assert.equal(same.ok, false);
});

test("contact detection finds phones, e-mails and handles without a model", () => {
  const text =
    "Би Болд, утас 9911-2233, +976 8800 1122. Мэйл bold.b@gmail.com, instagram @bold_99. 2026-03-09-нд болсон.";
  const found = detectContactDetails(text);
  assert.ok(found.includes("9911-2233"));
  assert.ok(found.includes("+976 8800 1122"));
  assert.ok(found.includes("bold.b@gmail.com"));
  assert.ok(found.includes("@bold_99"));
  assert.equal(found.includes("@gmail.com"), false, "an e-mail domain is not a handle");
  assert.equal(found.some((value) => value.includes("2026")), false, "dates are not phones");
});

test("contact detection returns nothing for a plain account", () => {
  assert.deepEqual(detectContactDetails("Багш хичээлийн үеэр сурагчийг зодсон."), []);
});
