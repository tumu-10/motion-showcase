import { afterEach, describe, expect, it } from "vitest";
import {
  readTenantNotices,
  saveTenantNotice,
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
