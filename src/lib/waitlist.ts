export type WaitlistRole = "landlord" | "property-manager" | "tenant" | "agent";
export type LeadScore = "high" | "medium" | "low";
export type RentCollectionMethod = "cash" | "mobile-money" | "bank" | "mixed";

export type WaitlistData = {
  fullName: string;
  phone: string;
  role: WaitlistRole;
  units: number | null;
  area: string;
  collectionMethod: RentCollectionMethod;
  whatsappConsent: true;
};

type WaitlistSubmission = WaitlistData & {
  leadScore: LeadScore;
  submittedAt: string;
};

const WAITLIST_STORAGE_KEY = "propatiz:pilot-waitlist";
const RATE_LIMIT_STORAGE_KEY = "propatiz:pilot-waitlist-last-submit";
const RATE_LIMIT_MS = 60_000;
let lastSubmissionAt = 0;

export function normalizeWaitlistPhone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, "");
  if (!/^\+2567[0456789]\d{7}$/.test(compact)) return null;
  return compact;
}

export function getWaitlistLeadScore(role: WaitlistRole, units: number | null): LeadScore {
  if (role === "property-manager" || (units !== null && units >= 10)) return "high";
  if (units !== null && units >= 3) return "medium";
  return "low";
}

export async function submitWaitlist(data: WaitlistData): Promise<"local" | "remote"> {
  if (typeof window === "undefined") {
    throw new Error("Waitlist submissions are only available in a browser.");
  }

  const now = Date.now();
  const endpoint = import.meta.env["VITE_WAITLIST_URL"]?.trim();
  let storedSubmissionAt = 0;
  try {
    const stored = window.localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (stored !== null) {
      const timestamp = Number(stored);
      if (Number.isFinite(timestamp)) storedSubmissionAt = timestamp;
    }
  } catch {
    if (!endpoint) {
      throw new Error("Browser storage is unavailable. Please contact us on WhatsApp instead.");
    }
  }
  const previousSubmissionAt = Math.max(lastSubmissionAt, storedSubmissionAt);
  if (now - previousSubmissionAt < RATE_LIMIT_MS) {
    const seconds = Math.ceil((RATE_LIMIT_MS - (now - previousSubmissionAt)) / 1000);
    throw new Error(`Please wait ${seconds} seconds before submitting another request.`);
  }
  lastSubmissionAt = now;
  try {
    window.localStorage.setItem(RATE_LIMIT_STORAGE_KEY, String(now));
  } catch {
    if (!endpoint) {
      lastSubmissionAt = 0;
      throw new Error("Browser storage is unavailable. Please contact us on WhatsApp instead.");
    }
  }

  const submission: WaitlistSubmission = {
    ...data,
    leadScore: getWaitlistLeadScore(data.role, data.units),
    submittedAt: new Date(now).toISOString(),
  };
  if (endpoint) {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
    } catch {
      throw new Error("We could not reach the pilot waitlist. Please try again shortly.");
    }

    if (!response.ok) {
      throw new Error("Your request could not be submitted. Please try again shortly.");
    }
    return "remote";
  }

  try {
    const stored = window.localStorage.getItem(WAITLIST_STORAGE_KEY);
    const submissions: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(submissions)) {
      throw new Error("Stored waitlist data is not a list.");
    }
    window.localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify([...submissions, submission]));
  } catch {
    throw new Error(
      "Your request could not be saved on this device. Please try again or contact us on WhatsApp.",
    );
  }

  return "local";
}
