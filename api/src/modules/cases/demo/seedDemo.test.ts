import assert from "node:assert/strict";
import { test } from "node:test";
import type { IModels } from "../../../connectionResolvers.ts";
import type { ISettings } from "../db/definitions/settings.ts";
import { DEFAULT_SLA_HOURS, evidenceChecksum, verifyPin } from "../domain.ts";
import { seedDemoData } from "./seedDemo.ts";

type Row = Record<string, unknown>;

// In-memory stand-in for the four tenant models, recording every write.
const fakeModels = (options: { demoExists: boolean }) => {
  const cases: Row[] = [];
  const events: Row[] = [];
  const evidence: Row[] = [];
  let sequence = 0;
  const models = {
    Cases: {
      exists: async () => (options.demoExists ? { _id: "existing" } : null),
      nextCaseNumber: async () => `ЭХ-2026-${String(++sequence).padStart(4, "0")}`,
      create: async (doc: Row) => {
        const row = { ...doc, _id: `case-${cases.length + 1}` };
        cases.push(row);
        return row;
      },
    },
    CaseEvents: { insertMany: async (rows: Row[]) => void events.push(...rows) },
    Evidence: { insertMany: async (rows: Row[]) => void evidence.push(...rows) },
  } as unknown as IModels;
  return { models, cases, events, evidence };
};

// Built here rather than imported: definitions/settings.ts loads erxes
// runtime code that node --test cannot import.
const settings: ISettings = {
  slaHours: { ...DEFAULT_SLA_HOURS },
  organizationName: "Боловсролын газар",
  escalationLevel1Label: "Хэлтсийн дарга",
  escalationLevel1Contact: "",
  escalationLevel2Label: "Боловсролын газрын дарга",
  escalationLevel2Contact: "",
  helplineText: "108",
};

const input = { now: new Date("2026-10-24T09:00:00Z"), actorId: "user-1", settings };

test("seeding twice writes nothing the second time", async () => {
  const { models, cases, events, evidence } = fakeModels({ demoExists: true });
  const result = await seedDemoData(models, input);
  assert.deepEqual(result, {
    created: 0,
    sampleCaseNumber: null,
    sampleTrackingCode: null,
    samplePin: null,
  });
  assert.equal(cases.length + events.length + evidence.length, 0);
});

test("seeded cases are marked demo, linked to their events and evidence, and the sample PIN works", async () => {
  const { models, cases, events, evidence } = fakeModels({ demoExists: false });
  const result = await seedDemoData(models, input);

  assert.equal(result.created, cases.length);
  assert.ok(cases.length >= 14);
  assert.ok(cases.every((row) => row.isDemo === true));

  const caseIds = new Set(cases.map((row) => row._id));
  assert.ok(events.length > cases.length);
  assert.ok(events.every((row) => caseIds.has(row.caseId)));
  assert.ok(evidence.length > 0);

  for (const row of evidence) {
    assert.ok(caseIds.has(row.caseId));
    assert.equal(
      row.checksum,
      evidenceChecksum({
        caseId: String(row.caseId),
        kind: row.kind as "photo",
        title: String(row.title),
        description: (row.description as string | null) ?? null,
        fileUrl: (row.fileUrl as string | null) ?? null,
        recordedAt: row.recordedAt as Date,
        createdAt: row.createdAt as Date,
      }),
    );
  }

  const featured = cases.find((row) => row.caseNumber === result.sampleCaseNumber);
  assert.ok(featured, "sample points at a created case");
  assert.equal(featured.trackingCode, result.sampleTrackingCode);
  assert.ok(result.samplePin && /^\d{6}$/.test(result.samplePin));
  assert.equal(
    verifyPin(String(featured.trackingCode), result.samplePin, String(featured.trackingPinHash)),
    true,
  );
});
