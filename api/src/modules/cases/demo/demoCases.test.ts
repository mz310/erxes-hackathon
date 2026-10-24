import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CASE_CATEGORIES,
  CASE_SEVERITIES,
  CASE_STATUSES,
  DEFAULT_SLA_HOURS,
  assertTransition,
  conflictGate,
  isOpenStatus,
  planEscalation,
  requiresProtocol,
  validateReportInput,
  type CaseStatus,
  type ProtocolStep,
} from "../domain.ts";
import { buildDemoCases } from "./demoCases.ts";

const now = new Date("2026-10-24T09:00:00Z");
const actor = "user-1";
const demo = buildDemoCases(now, actor, DEFAULT_SLA_HOURS);

test("covers every category, status and severity", () => {
  assert.ok(demo.length >= 14);
  for (const category of CASE_CATEGORIES) {
    assert.ok(demo.some((item) => item.report.category === category), `missing ${category}`);
  }
  for (const status of CASE_STATUSES) {
    assert.ok(demo.some((item) => item.status === status), `missing ${status}`);
  }
  for (const severity of CASE_SEVERITIES) {
    assert.ok(demo.some((item) => item.report.severity === severity), `missing ${severity}`);
  }
  assert.equal(demo.filter((item) => item.featured).length, 1);
});

test("every report passes the same validation as a real report", () => {
  for (const item of demo) {
    assert.deepEqual(validateReportInput(item.report, now), [], item.report.title);
    if (item.report.isAnonymous) {
      assert.equal(item.report.reporterContact ?? null, null, item.report.title);
    }
  }
});

test("timelines are chronological, start with creation and never reach the future", () => {
  for (const item of demo) {
    const times = item.events.map((event) => event.createdAt.getTime());
    assert.deepEqual(times, [...times].sort((a, b) => a - b), item.report.title);
    assert.equal(item.events[0]?.type, "created");
    assert.equal(item.events[0]?.createdAt.getTime(), item.createdAt.getTime());
    assert.ok(Math.max(...times) <= now.getTime(), item.report.title);
    assert.equal(item.updatedAt.getTime(), Math.max(...times));
    for (const evidence of item.evidence) {
      assert.ok(evidence.createdAt.getTime() <= now.getTime());
      assert.ok(evidence.recordedAt.getTime() <= evidence.createdAt.getTime());
    }
  }
});

test("status history only uses allowed transitions and respects the protocol", () => {
  for (const item of demo) {
    let status: CaseStatus = "new";
    for (const event of item.events.filter((entry) => entry.type === "status_changed")) {
      const to = (event.payload as { to: CaseStatus }).to;
      const stepsAtTime: ProtocolStep[] = item.protocolSteps.map((step) => ({
        key: step.key,
        doneAt: step.doneAt && step.doneAt.getTime() <= event.createdAt.getTime() ? step.doneAt : null,
      }));
      assert.equal(assertTransition(status, to, stepsAtTime), null, `${item.report.title}: ${status}→${to}`);
      status = to;
    }
    assert.equal(status, item.status, item.report.title);
  }
});

test("resolution fields match the final status", () => {
  for (const item of demo) {
    if (item.status === "resolved") {
      assert.ok(item.resolvedAt, item.report.title);
      assert.ok(item.resolution && item.resolution.length > 10, item.report.title);
    } else {
      assert.equal(item.resolvedAt, null, item.report.title);
    }
    assert.equal(item.protocolSteps.length > 0, requiresProtocol(item.report.category), item.report.title);
  }
});

test("escalation state is exactly what the live rules would have produced", () => {
  for (const item of demo) {
    assert.ok(item.escalationLevel >= 0 && item.escalationLevel <= 2);
    const escalations = item.events.filter((event) => event.type === "escalated").length;
    assert.equal(escalations, item.escalationLevel, item.report.title);
    if (isOpenStatus(item.status)) {
      const plan = planEscalation({ now, dueAt: item.dueAt, status: item.status, level: item.escalationLevel });
      assert.equal(plan.shouldEscalate, false, item.report.title);
    }
  }
  const open = demo.filter((item) => isOpenStatus(item.status));
  assert.ok(open.some((item) => item.escalationLevel === 2 && item.dueAt.getTime() < now.getTime()));
  assert.ok(open.some((item) => item.escalationLevel === 1));
  assert.ok(open.some((item) => item.escalationLevel === 0 && item.dueAt.getTime() > now.getTime()));
});

test("the handler declared no conflict before acting, and unassigned cases exist", () => {
  for (const item of demo) {
    // Registering a case is not gated by the declaration (the API allows it);
    // every later action by the handler is.
    const acts = item.events.filter(
      (event) => event.actorId === actor && event.type !== "conflict_declared" && event.type !== "created",
    );
    if (acts.length === 0) {
      continue;
    }
    assert.equal(conflictGate(item.conflictDeclarations, actor), null, item.report.title);
    const declaredAt = item.conflictDeclarations.find((entry) => entry.userId === actor)?.declaredAt;
    assert.ok(declaredAt && declaredAt.getTime() <= Math.min(...acts.map((event) => event.createdAt.getTime())));
    if (item.assigneeId) {
      assert.equal(item.assigneeId, actor);
    }
  }
  assert.ok(demo.some((item) => item.assigneeId === null && isOpenStatus(item.status)));
});

test("the builder is deterministic for a given clock", () => {
  assert.deepEqual(buildDemoCases(now, actor, DEFAULT_SLA_HOURS), demo);
});
