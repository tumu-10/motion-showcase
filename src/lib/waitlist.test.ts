import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWaitlistLeadScore,
  normalizeWaitlistPhone,
  submitWaitlist,
  type WaitlistData,
} from "./waitlist";

const sampleWaitlistData: WaitlistData = {
  fullName: "Amina Nakato",
  phone: "+256774123456",
  role: "landlord",
  units: 10,
  area: "Ntinda, Kampala",
  collectionMethod: "mobile-money",
  whatsappConsent: true,
};

let testTime = new Date("2026-11-25T12:00:00Z").getTime();

describe("pilot waitlist", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    testTime += 61_000;
    vi.setSystemTime(testTime);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("normalizes Uganda-format numbers and rejects non-Ugandan formats", () => {
    expect(normalizeWaitlistPhone("+256 774 123 456")).toBe("+256774123456");
    expect(normalizeWaitlistPhone("0774 123 456")).toBeNull();
    expect(normalizeWaitlistPhone("+254 774 123 456")).toBeNull();
  });

  it("ranks property managers high and landlords by unit count", () => {
    expect(getWaitlistLeadScore("property-manager", 1)).toBe("high");
    expect(getWaitlistLeadScore("landlord", 10)).toBe("high");
    expect(getWaitlistLeadScore("landlord", 3)).toBe("medium");
    expect(getWaitlistLeadScore("landlord", 2)).toBe("low");
  });

  it("stores lead score with local fallback and applies a submission cooldown", async () => {
    await expect(submitWaitlist(sampleWaitlistData)).resolves.toBe("local");
    const saved = JSON.parse(window.localStorage.getItem("propatiz:pilot-waitlist") || "[]");
    expect(saved[0]).toMatchObject({
      fullName: "Amina Nakato",
      leadScore: "high",
      whatsappConsent: true,
    });
    await expect(submitWaitlist(sampleWaitlistData)).rejects.toThrow("Please wait");
  });

  it("posts computed lead data to the configured endpoint", async () => {
    vi.stubEnv("VITE_WAITLIST_URL", "https://example.test/waitlist");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitWaitlist(sampleWaitlistData)).resolves.toBe("remote");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/waitlist",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      leadScore: "high",
    });
  });
});
