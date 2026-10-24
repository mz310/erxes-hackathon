import type { IModels } from "../../../connectionResolvers.ts";
import type { ISettings } from "../db/definitions/settings.ts";
import { evidenceChecksum, generatePin, generateTrackingCode, hashPin } from "../domain.ts";
import { buildDemoCases } from "./demoCases.ts";

export type DemoSeedResult = {
  created: number;
  sampleCaseNumber: string | null;
  sampleTrackingCode: string | null;
  samplePin: string | null;
};

// Writes the demo cases into the tenant's collections, with their timelines
// and evidence. Runs once per tenant: if any demo case exists it does nothing,
// because cases can never be deleted. Returns the tracking code and PIN of the
// featured case so the public tracking page can be tried right away.
export const seedDemoData = async (
  models: IModels,
  input: { now: Date; actorId: string; settings: ISettings },
): Promise<DemoSeedResult> => {
  const result: DemoSeedResult = {
    created: 0,
    sampleCaseNumber: null,
    sampleTrackingCode: null,
    samplePin: null,
  };

  if (await models.Cases.exists({ isDemo: true })) {
    return result;
  }

  for (const demo of buildDemoCases(input.now, input.actorId, input.settings.slaHours)) {
    const caseNumber = await models.Cases.nextCaseNumber(demo.createdAt);
    const trackingCode = generateTrackingCode();
    const pin = generatePin();

    const doc = await models.Cases.create({
      ...demo.report,
      caseNumber,
      status: demo.status,
      source: demo.source,
      assigneeId: demo.assigneeId,
      dueAt: demo.dueAt,
      escalationLevel: demo.escalationLevel,
      escalatedAt: demo.escalatedAt,
      resolvedAt: demo.resolvedAt,
      resolution: demo.resolution,
      trackingCode,
      trackingPinHash: hashPin(trackingCode, pin),
      conflictDeclarations: demo.conflictDeclarations,
      protocolSteps: demo.protocolSteps,
      createdBy: demo.source === "staff" ? input.actorId : null,
      createdAt: demo.createdAt,
      updatedAt: demo.updatedAt,
      isDemo: true,
    });
    const caseId = String(doc._id);

    await models.CaseEvents.insertMany(
      demo.events.map((event) => ({ ...event, caseId, payload: event.payload ?? undefined })),
    );

    if (demo.evidence.length) {
      await models.Evidence.insertMany(
        demo.evidence.map((item) => ({
          ...item,
          caseId,
          checksum: evidenceChecksum({ ...item, caseId }),
        })),
      );
    }

    result.created += 1;
    if (demo.featured) {
      result.sampleCaseNumber = caseNumber;
      result.sampleTrackingCode = trackingCode;
      result.samplePin = pin;
    }
  }

  return result;
};
