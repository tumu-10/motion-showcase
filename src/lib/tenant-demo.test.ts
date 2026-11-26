import { afterEach, describe, expect, it } from "vitest";
import {
  readTenantMoveInChecklist,
  readTenantNotices,
  saveTenantNotice,
  updateTenantMoveInChecklistItem,
  updateTenantNoticeResponse,
  type TenantNotice,
} from "./tenant-demo";

const storageKey = "propatiz-demo-tenant-notice";

const notice: TenantNotice = {
  id: "notice-1",
  kind: "friendly-reminder",
  unit: "B4",
  property: "Kololo Heights",
  tenant: "Sarah Namubiru",
  phone: "+256 772 123 456",
  email: "sarah@example.test",
  issuedOn: "2026-11-21",
  reason: "Friendly rent reminder",
  attachments: [],
};

afterEach(() => localStorage.clear());

describe("tenant notice storage", () => {
  it("migrates the existing single eviction notice", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        unit: "B4",
        property: "Kololo Heights",
        tenant: "Sarah Namubiru",
        phone: "+256 772 123 456",
        email: "sarah@example.test",
        issuedOn: "2026-11-21",
        vacateBy: "2026-12-21",
        reason: "Non-payment",
      }),
    );

    expect(readTenantNotices()).toMatchObject([
      {
        kind: "notice-to-vacate",
        effectiveDate: "2026-12-21",
        reason: "Non-payment",
      },
    ]);
  });

  describe("tenant move-in checklist storage", () => {
    it("starts with the sample checklist and persists completion notes and a photo", () => {
      const [first] = readTenantMoveInChecklist();
      if (!first) throw new Error("Sample move-in checklist is required.");
      const photo = "data:image/png;base64,aGVsbG8=";

      const updated = updateTenantMoveInChecklistItem(first.id, {
        checked: true,
        note: "One key received",
        photoDataUrl: photo,
      });

      expect(updated[0]).toMatchObject({
        checked: true,
        note: "One key received",
        photoDataUrl: photo,
      });
      expect(readTenantMoveInChecklist()).toEqual(updated);
    });

    it("rejects unknown checklist items and non-image photos", () => {
      expect(() => updateTenantMoveInChecklistItem("unknown", { checked: true })).toThrow(
        /no longer available/i,
      );
      const [first] = readTenantMoveInChecklist();
      if (!first) throw new Error("Sample move-in checklist is required.");
      expect(() =>
        updateTenantMoveInChecklistItem(first.id, { photoDataUrl: "data:text/html;base64,abc" }),
      ).toThrow(/JPG or PNG/i);
    });
  });

  it("keeps multiple notices and persists tenant responses", () => {
    saveTenantNotice(notice);
    saveTenantNotice({ ...notice, id: "notice-2", kind: "formal-rent-demand" });
    updateTenantNoticeResponse("notice-1", {
      status: "disputed",
      message: "I paid this rent last week.",
      updatedAt: "2026-11-21T12:00:00.000Z",
    });

    expect(readTenantNotices()).toHaveLength(2);
    expect(readTenantNotices()[1]?.response).toMatchObject({
      status: "disputed",
      message: "I paid this rent last week.",
    });
  });
});
