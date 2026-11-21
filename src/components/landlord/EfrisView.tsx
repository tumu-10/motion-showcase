import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock3,
  RefreshCw,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ReceiptActions } from "@/components/shared/ReceiptActions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUGX } from "@/lib/rent";
import { INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX } from "@/lib/legal";
import { getEfrisEligibility, type EfrisStatus, type LandlordEntityType } from "@/lib/efris";
import {
  defaultReceiptBranding,
  getReceiptBranding,
  getReceiptBundle,
  getReceiptRecords,
  saveReceiptBranding,
  type ReceiptBranding,
  type ReceiptRecord,
} from "@/lib/receipt-branding";
import { refreshEfrisReceiptStatus, submitEfrisReceipt } from "@/lib/efris-service";
import type { Unit } from "@/lib/sample-data";

const statusClass: Record<EfrisStatus, string> = {
  "not-required": "bg-muted text-muted-foreground",
  pending: "bg-warning-soft text-warning-ink",
  issued: "bg-success-soft text-success-ink",
  failed: "bg-destructive-soft text-destructive-ink",
  cancelled: "bg-muted text-muted-foreground",
};

const statusLabel: Record<EfrisStatus, string> = {
  "not-required": "Not required",
  pending: "Pending",
  issued: "Issued",
  failed: "Failed",
  cancelled: "Cancelled",
};

const statusIcon = {
  "not-required": CircleHelp,
  pending: Clock3,
  issued: CircleCheck,
  failed: CircleAlert,
  cancelled: Ban,
} satisfies Record<EfrisStatus, LucideIcon>;

export function EfrisView({
  units,
  onOpenReconciliation,
  onEfrisFailure,
}: {
  units: Unit[];
  onOpenReconciliation: () => void;
  onEfrisFailure: (receipt: ReceiptRecord, errorMessage: string) => void;
}) {
  const [branding, setBranding] = useState<ReceiptBranding>(defaultReceiptBranding);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyReceipt, setBusyReceipt] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [showAllReceipts, setShowAllReceipts] = useState(false);

  const annualRentalIncome = useMemo(
    () => units.filter((unit) => unit.tenant).reduce((sum, unit) => sum + unit.rent * 12, 0),
    [units],
  );
  const eligibility = getEfrisEligibility(branding, annualRentalIncome);
  const retryQueue = receipts.filter(
    (receipt) =>
      receipt.status === "Valid" &&
      (receipt.efris.status === "pending" || receipt.efris.status === "failed"),
  );
  const visibleReceipts = showAllReceipts ? receipts : receipts.slice(0, 8);

  useEffect(() => {
    try {
      setBranding(getReceiptBranding());
      setReceipts(getReceiptRecords());
    } catch (error) {
      console.error("Could not load EFRIS receipt data.", error);
      toast.error("EFRIS profile or receipt data could not be loaded.");
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    const updateConnection = () => setOffline(!navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const saveProfile = () => {
    setSaving(true);
    try {
      const saved = saveReceiptBranding({
        ...branding,
        annualRentalIncomeUGX: annualRentalIncome,
      });
      setBranding(saved);
      setReceipts(getReceiptRecords());
      toast.success("Landlord EFRIS profile saved", {
        description: "New receipts will use this landlord entity and TIN.",
      });
    } catch (error) {
      console.error("Could not save EFRIS profile.", error);
      toast.error("The landlord EFRIS profile could not be saved.", {
        description: error instanceof Error ? error.message : "Check browser storage and retry.",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateReceipt = async (receipt: ReceiptRecord, action: "submit" | "status") => {
    setBusyReceipt(receipt.receiptNumber);
    try {
      const updated =
        action === "submit"
          ? await submitEfrisReceipt(receipt.receiptNumber, { offline })
          : await refreshEfrisReceiptStatus(receipt.receiptNumber, { offline });
      setReceipts(getReceiptRecords());
      if (updated.receipt.efris.status === "issued") {
        toast.success("Mock EFRIS document issued", {
          description: updated.receipt.efris.fiscalDocumentNumber ?? undefined,
        });
      } else if (updated.receipt.efris.status === "failed") {
        onEfrisFailure(
          updated.receipt,
          updated.receipt.efris.errorMessage ?? "Review the receipt's saved landlord profile.",
        );
        toast.error("Mock EFRIS submission needs attention", {
          description:
            updated.receipt.efris.errorMessage ?? "Review the receipt's saved landlord profile.",
        });
      } else {
        toast.success(`EFRIS status: ${statusLabel[updated.receipt.efris.status]}`);
      }
    } catch (error) {
      console.error("Could not update EFRIS receipt status.", error);
      toast.error("EFRIS receipt update failed.", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setBusyReceipt(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-eyebrow text-primary">URA and fiscal records</p>
          <h1 className="mt-2 text-2xl font-bold text-primary-deep sm:text-3xl">EFRIS</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Manage the landlord entity, receipt status, and mock retry queue.
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          onClick={onOpenReconciliation}
        >
          EFRIS reconciliation report <ArrowRight className="size-4" aria-hidden />
        </Button>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="surface p-5 sm:p-6" aria-labelledby="efris-eligibility-title">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <BadgeCheck className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="efris-eligibility-title" className="text-lg font-bold text-primary-deep">
                Do I need EFRIS?
              </h2>
              <span
                className={`mt-2 inline-flex min-h-8 items-center rounded-full px-3 text-sm font-semibold ${
                  eligibility.likelyRequired
                    ? "bg-warning-soft text-warning-ink"
                    : "bg-success-soft text-success-ink"
                }`}
              >
                {eligibility.label}
              </span>
              <p className="mt-3 text-sm leading-relaxed">{eligibility.reason}</p>
              <p className="mt-2 text-sm font-semibold text-primary">Confirm with URA.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Annualized current occupied rent
              </p>
              <p className="mt-1 font-bold">{formatUGX(annualRentalIncome)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Individual threshold</p>
              <p className="mt-1 font-bold">
                {formatUGX(INDIVIDUAL_RENTAL_TAX_EXEMPTION_UGX)} per year
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            This compares annualized current rent, not a verified tax-year total. Rental income and
            registration requirements can depend on your circumstances.
          </p>
        </section>

        <section className="surface p-5 sm:p-6" aria-labelledby="efris-demo-title">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-warning-soft text-warning-ink">
              <ShieldAlert className="size-5" aria-hidden />
            </span>
            <div>
              <h2 id="efris-demo-title" className="text-lg font-bold text-primary-deep">
                Demo connection only
              </h2>
              <p className="mt-2 text-sm leading-relaxed">
                Nothing is sent to URA. A real submission requires URA registration and approved API
                access. The mock provider uses the actual payment amount and the saved landlord
                entity; its fiscal numbers and QR codes are demonstrations only.
              </p>
              {offline && (
                <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm font-medium text-warning-ink">
                  This browser is offline. Failed submissions stay in the retry queue.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <form
        className="surface space-y-5 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          saveProfile();
        }}
      >
        <div>
          <h2 className="text-lg font-bold text-primary-deep">Landlord EFRIS profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Receipt identity is versioned. Previously issued receipts retain their original entity
            snapshot.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="efris-landlord-name">Landlord or company name</Label>
            <Input
              id="efris-landlord-name"
              value={branding.landlordName}
              onChange={(event) =>
                setBranding((current) => ({ ...current, landlordName: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="efris-landlord-tin">TIN</Label>
            <Input
              id="efris-landlord-tin"
              value={branding.landlordTin}
              onChange={(event) =>
                setBranding((current) => ({ ...current, landlordTin: event.target.value }))
              }
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="efris-entity-type">Landlord entity</Label>
            <select
              id="efris-entity-type"
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={branding.landlordType}
              onChange={(event) =>
                setBranding((current) => ({
                  ...current,
                  landlordType: event.target.value as LandlordEntityType,
                }))
              }
            >
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="efris-enrollment-status">EFRIS enrolment status</Label>
            <select
              id="efris-enrollment-status"
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={branding.efrisEnrollmentStatus}
              onChange={(event) =>
                setBranding((current) => ({
                  ...current,
                  efrisEnrollmentStatus: event.target
                    .value as ReceiptBranding["efrisEnrollmentStatus"],
                }))
              }
            >
              <option value="not-enrolled">Not enrolled</option>
              <option value="pending">Enrolment pending</option>
              <option value="enrolled">Enrolled</option>
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 text-sm sm:mt-6">
            <Checkbox
              checked={branding.vatRegistered}
              onCheckedChange={(checked) =>
                setBranding((current) => ({ ...current, vatRegistered: checked === true }))
              }
            />
            VAT-registered landlord entity
          </label>
        </div>
        <Button
          type="submit"
          className="min-h-11 w-full sm:w-auto"
          disabled={!profileLoaded || saving}
        >
          {saving ? "Saving…" : "Save landlord EFRIS profile"}
        </Button>
      </form>

      <section className="surface space-y-4 p-5 sm:p-6" aria-labelledby="efris-queue-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="efris-queue-title" className="text-lg font-bold text-primary-deep">
              Retry queue
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pending, failed, and offline mock submissions. Deposit documents are kept separate.
            </p>
          </div>
          <span className="text-sm font-semibold">{retryQueue.length} to retry</span>
        </div>
        {retryQueue.length === 0 ? (
          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            No pending or failed rental receipts.
          </p>
        ) : (
          <ul className="space-y-3">
            {retryQueue.map((receipt) => (
              <li key={receipt.receiptNumber}>
                <ReceiptCard
                  receipt={receipt}
                  busy={busyReceipt === receipt.receiptNumber}
                  offline={offline}
                  onRefresh={() => void updateReceipt(receipt, "submit")}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface space-y-4 p-5 sm:p-6" aria-labelledby="efris-documents-title">
        <div>
          <h2 id="efris-documents-title" className="text-lg font-bold text-primary-deep">
            Receipt EFRIS status
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rent receipts and deposit documents remain separate records.
          </p>
        </div>
        {receipts.length === 0 ? (
          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            Receipts will appear here after a payment or deposit receipt is recorded.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {visibleReceipts.map((receipt) => (
                <li key={receipt.receiptNumber}>
                  <ReceiptCard
                    receipt={receipt}
                    busy={busyReceipt === receipt.receiptNumber}
                    offline={offline}
                    onRefresh={() =>
                      void updateReceipt(
                        receipt,
                        receipt.efris.status === "issued" ? "status" : "submit",
                      )
                    }
                  />
                </li>
              ))}
            </ul>
            {receipts.length > 8 && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => setShowAllReceipts((show) => !show)}
              >
                {showAllReceipts ? "Show fewer receipts" : `Show all ${receipts.length} receipts`}
              </Button>
            )}
          </>
        )}
      </section>
    </section>
  );
}

function ReceiptCard({
  receipt,
  busy,
  offline,
  onRefresh,
}: {
  receipt: ReceiptRecord;
  busy: boolean;
  offline: boolean;
  onRefresh: () => void;
}) {
  const StatusIcon = statusIcon[receipt.efris.status];

  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{receipt.content.tenant}</h3>
            <span
              className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${statusClass[receipt.efris.status]}`}
              aria-label={`EFRIS status: ${statusLabel[receipt.efris.status]}`}
            >
              <StatusIcon className="mr-1 size-3.5" aria-hidden />
              EFRIS · {statusLabel[receipt.efris.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {receipt.content.property} · Unit {receipt.content.unit} ·{" "}
            {formatUGX(receipt.content.amount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {receipt.efris.documentType.replace("-", " ")} · {receipt.receiptNumber}
          </p>
          {receipt.efris.fiscalDocumentNumber && (
            <p className="mt-1 break-all text-xs font-semibold text-success-ink">
              Mock fiscal document: {receipt.efris.fiscalDocumentNumber}
            </p>
          )}
          {receipt.efris.errorMessage && (
            <p className="mt-2 text-sm text-destructive">{receipt.efris.errorMessage}</p>
          )}
          {receipt.efris.accountantNote && (
            <p className="mt-2 text-sm text-warning-ink">{receipt.efris.accountantNote}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(receipt.efris.status === "pending" || receipt.efris.status === "failed") && (
            <Button
              type="button"
              className="min-h-11"
              variant="outline"
              disabled={busy || offline}
              onClick={onRefresh}
            >
              <RefreshCw className="size-4" aria-hidden />
              {busy ? "Trying…" : "Retry (mock)"}
            </Button>
          )}
          {receipt.efris.status === "issued" && (
            <Button
              type="button"
              className="min-h-11"
              variant="outline"
              disabled={busy}
              onClick={onRefresh}
            >
              <RefreshCw className="size-4" aria-hidden />
              Check status
            </Button>
          )}
          <ReceiptActions
            key={`${receipt.receiptNumber}-${receipt.efris.status}-${receipt.efris.attemptCount}`}
            showEfrisStatus={false}
            getBundle={() => {
              const bundle = getReceiptBundle(receipt.receiptNumber);
              if (!bundle) throw new Error("This receipt is no longer available.");
              return bundle;
            }}
          />
        </div>
      </div>
    </article>
  );
}
