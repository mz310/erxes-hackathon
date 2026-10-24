import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import {
  ACCUSED_ROLES,
  CASE_CATEGORIES,
  CASE_SEVERITIES,
  REPORTER_ROLES,
  VICTIM_ROLES,
} from "../cases/domain.ts";
import {
  CHILD_CATEGORY_LABELS,
  SELF_VICTIM_ROLE,
  SEVERITY_CHOICES,
  SEVERITY_FLOOR,
  STAFF_ONLY_CATEGORIES,
  renderIntakePage,
} from "./page.ts";

const html = renderIntakePage("abc123");

const pickedValues = (field: string): string[] =>
  [...html.matchAll(new RegExp(`data-pick="${field}" data-value="([^"]*)"`, "g"))].map(
    (match) => match[1] ?? "",
  );

test("intake page keeps the helpline, the independence notice and the one-time receipt warning", () => {
  assert.ok(html.includes("108 — Хүүхдийн тусламжийн утас (24/7, үнэгүй)"));
  assert.ok(html.includes('href="tel:108"'));
  assert.ok(html.includes("сургуулийн удирдлагад биш, боловсролын газарт шууд очно."));
  assert.ok(html.includes("Эдгээрийг тэмдэглэж аваарай — дахин харуулахгүй"));
});

test("intake page carries the nonce and the relative graphql endpoint", () => {
  assert.ok(html.includes('<style nonce="abc123">'));
  assert.ok(html.includes('<script nonce="abc123">'));
  assert.ok(html.includes('base + "graphql"'));
});

test("intake page has no inline style or event-handler attributes (blocked by the nonce CSP)", () => {
  assert.equal(/\sstyle="/.test(renderIntakePage("n")), false);
  assert.equal(/\son[a-z]+=/i.test(renderIntakePage("n")), false);
});

test("intake page escapes the nonce", () => {
  const escaped = renderIntakePage('"><script>');
  assert.equal(escaped.includes('"><script>'), false);
});

test("the inline script is valid JavaScript", () => {
  const match = /<script nonce="[^"]*">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(match, "inline script not found");
  assert.doesNotThrow(() => new vm.Script(match[1] ?? ""));
});

test("the embedded data block cannot close its script element", () => {
  const match = /<script type="application\/json" id="intake-data">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(match, "data block not found");
  const body = match[1] ?? "";
  assert.equal(body.includes("<"), false);
  assert.doesNotThrow(() => JSON.parse(body));
});

test("every screen of the wizard is rendered", () => {
  for (const step of [
    "welcome",
    "safety",
    "unsafe",
    "reporter",
    "victim",
    "category",
    "accused",
    "date",
    "school",
    "location",
    "severity",
    "details",
    "anonymity",
    "review",
    "receipt",
    "track-code",
    "track-pin",
    "track-result",
  ]) {
    assert.ok(html.includes(`data-step="${step}"`), `missing screen ${step}`);
  }
});

test("every case category has a child-friendly choice", () => {
  assert.deepEqual(Object.keys(CHILD_CATEGORY_LABELS).sort(), [...CASE_CATEGORIES].sort());
  assert.deepEqual(pickedValues("category").sort(), [...CASE_CATEGORIES].sort());
  assert.ok(STAFF_ONLY_CATEGORIES.includes("teacher_labor_rights"));
});

test("severity choices cover every severity and floors are valid", () => {
  assert.deepEqual(
    SEVERITY_CHOICES.map((choice) => choice.value).sort(),
    [...CASE_SEVERITIES].sort(),
  );
  assert.deepEqual(pickedValues("severity").sort(), [...CASE_SEVERITIES].sort());
  for (const floor of Object.values(SEVERITY_FLOOR)) {
    assert.ok(floor !== undefined && (CASE_SEVERITIES as readonly string[]).includes(floor));
  }
});

test("role choices only send values the API accepts", () => {
  assert.deepEqual(pickedValues("reporter").sort(), [...REPORTER_ROLES].sort());
  for (const value of pickedValues("victim")) {
    assert.ok(value === "self" || (VICTIM_ROLES as readonly string[]).includes(value), value);
  }
  for (const value of pickedValues("accused")) {
    assert.ok((ACCUSED_ROLES as readonly string[]).includes(value), value);
  }
  assert.deepEqual(Object.keys(SELF_VICTIM_ROLE).sort(), [...REPORTER_ROLES].sort());
  for (const value of Object.values(SELF_VICTIM_ROLE)) {
    assert.ok((VICTIM_ROLES as readonly string[]).includes(value), value);
  }
});

test("the anonymity check is absent unless the server enables it", () => {
  assert.equal(html.includes('id="privacy"'), false);
  const enabled = renderIntakePage("abc123", { privacyCheck: true });
  assert.ok(enabled.includes('id="privacy"'));
  assert.ok(enabled.includes('data-action="privacy-check"'));
  assert.ok(enabled.includes("текстийг AI загвар руу илгээнэ"));
});

test("the page with the anonymity check stays CSP-clean and valid", () => {
  const enabled = renderIntakePage("n", { privacyCheck: true });
  assert.equal(/\sstyle="/.test(enabled), false);
  assert.equal(/\son[a-z]+=/i.test(enabled), false);
  const match = /<script nonce="[^"]*">([\s\S]*?)<\/script>/.exec(enabled);
  assert.ok(match, "inline script not found");
  assert.doesNotThrow(() => new vm.Script(match[1] ?? ""));
  assert.ok((match[1] ?? "").includes("eduTechBravePublicPrivacyCheck"));
});
