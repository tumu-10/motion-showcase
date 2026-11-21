export type NoticeKind =
  | "friendly-reminder"
  | "formal-rent-demand"
  | "notice-of-default"
  | "notice-to-vacate"
  | "rent-increase"
  | "end-of-tenancy";

export type EvictionReason = "non-payment" | "breach-of-terms" | "end-of-term" | "other";

export type NoticeServiceRecord = {
  method: "hand-delivery" | "email" | "whatsapp" | "registered-mail" | "other";
  servedAt: string;
  receivedBy: string;
  lc1Witness?: string;
};

export type NoticeAttachment = {
  name: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  dataUrl: string;
};

export type NoticeArrearsRow = {
  period: string;
  rentDue: number;
  paid: number;
  balance: number;
};

export type TenantNotice = {
  id: string;
  kind: NoticeKind;
  unit: string;
  property: string;
  tenant: string;
  phone: string;
  email: string;
  issuedOn: string;
  reason: string;
  reasonCategory?: EvictionReason;
  details?: string;
  effectiveDate?: string;
  vacateBy?: string;
  rentIncreasePct?: number;
  oldRent?: number;
  newRent?: number;
  arrearsStatement?: {
    asOf: string;
    rows: NoticeArrearsRow[];
    total: number;
  };
  service?: NoticeServiceRecord;
  attachments: NoticeAttachment[];
  response?: {
    status: "acknowledged" | "payment-started" | "disputed";
    message?: string;
    updatedAt: string;
  };
};

export type EvictionNotice = TenantNotice;

const noticeKey = "propatiz-demo-tenant-notice";
const statusKey = "propatiz-demo-tenant-status";
type LegacyEvictionNotice = Omit<TenantNotice, "id" | "kind" | "reasonCategory" | "attachments"> & {
  vacateBy: string;
};

export function readTenantNotices(): TenantNotice[] {
  const saved = localStorage.getItem(noticeKey);
  if (!saved) return [];
  const value: unknown = JSON.parse(saved);
  if (Array.isArray(value)) {
    if (!value.every(isTenantNotice)) {
      throw new Error("Saved tenant notices have an invalid shape.");
    }
    return value;
  }
  if (isLegacyEvictionNotice(value)) {
    return [
      {
        ...value,
        id: `legacy-${value.unit}-${value.issuedOn}`,
        kind: "notice-to-vacate",
        reasonCategory: "other",
        effectiveDate: value.vacateBy,
        attachments: [],
      },
    ];
  }
  throw new Error("Saved tenant notice has an invalid shape.");
}

export function saveTenantNotice(notice: TenantNotice) {
  const current = readTenantNotices();
  const next = [notice, ...current.filter((item) => item.id !== notice.id)];
  localStorage.setItem(noticeKey, JSON.stringify(next));
  return next;
}

export function updateTenantNoticeResponse(
  id: string,
  response: NonNullable<TenantNotice["response"]>,
) {
  const current = readTenantNotices();
  if (!current.some((notice) => notice.id === id)) {
    throw new Error("This notice is no longer available.");
  }
  const next = current.map((notice) => (notice.id === id ? { ...notice, response } : notice));
  localStorage.setItem(noticeKey, JSON.stringify(next));
  return next;
}

export function updateTenantNoticeService(id: string, service: NoticeServiceRecord) {
  const current = readTenantNotices();
  if (!current.some((notice) => notice.id === id)) {
    throw new Error("This notice is no longer available.");
  }
  const next = current.map((notice) => (notice.id === id ? { ...notice, service } : notice));
  localStorage.setItem(noticeKey, JSON.stringify(next));
  return next;
}

export function readTenantNotice() {
  return readTenantNotices()[0] ?? null;
}

export function setTenantActive(isActive: boolean, unit: string) {
  if (unit === "B4") localStorage.setItem(statusKey, JSON.stringify(isActive));
}

export function readTenantActive() {
  const status = localStorage.getItem(statusKey);
  return status === null ? true : (JSON.parse(status) as boolean);
}

function isTenantNotice(value: unknown): value is TenantNotice {
  if (typeof value !== "object" || value === null) return false;
  const notice = value as Record<string, unknown>;
  return (
    typeof notice["id"] === "string" &&
    [
      "friendly-reminder",
      "formal-rent-demand",
      "notice-of-default",
      "notice-to-vacate",
      "rent-increase",
      "end-of-tenancy",
    ].includes(String(notice["kind"])) &&
    typeof notice["unit"] === "string" &&
    typeof notice["property"] === "string" &&
    typeof notice["tenant"] === "string" &&
    typeof notice["issuedOn"] === "string" &&
    typeof notice["reason"] === "string" &&
    Array.isArray(notice["attachments"])
  );
}

function isLegacyEvictionNotice(value: unknown): value is LegacyEvictionNotice {
  if (typeof value !== "object" || value === null) return false;
  const notice = value as Record<string, unknown>;
  return (
    typeof notice["unit"] === "string" &&
    typeof notice["property"] === "string" &&
    typeof notice["tenant"] === "string" &&
    typeof notice["phone"] === "string" &&
    typeof notice["email"] === "string" &&
    typeof notice["issuedOn"] === "string" &&
    typeof notice["vacateBy"] === "string" &&
    typeof notice["reason"] === "string"
  );
}
