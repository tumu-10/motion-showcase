export type EvictionNotice = {
  unit: string;
  property: string;
  tenant: string;
  phone: string;
  email: string;
  issuedOn: string;
  vacateBy: string;
  reason: string;
};

const noticeKey = "propatiz-demo-tenant-notice";
const statusKey = "propatiz-demo-tenant-status";

export function saveTenantNotice(notice: EvictionNotice) {
  localStorage.setItem(noticeKey, JSON.stringify(notice));
}

export function readTenantNotice() {
  const notice = localStorage.getItem(noticeKey);
  return notice ? (JSON.parse(notice) as EvictionNotice) : null;
}

export function setTenantActive(isActive: boolean, unit: string) {
  if (unit === "B4") localStorage.setItem(statusKey, JSON.stringify(isActive));
}

export function readTenantActive() {
  const status = localStorage.getItem(statusKey);
  return status === null ? true : (JSON.parse(status) as boolean);
}
