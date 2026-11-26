import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeading } from "@/components/shared/DashShell";
import { ReceiptActions } from "@/components/shared/ReceiptActions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUGX } from "@/lib/rent";
import { isDepositValid } from "@/lib/compliance";
import { currentRentPeriod, getUnitPeriodCredit } from "@/lib/rent-accounting";
import { issueDepositReceipt } from "@/lib/receipt-helpers";
import {
  calculateRefundableDeposit,
  type DepositDeduction,
  type DepositLedgerEntry,
  type DepositStatus,
} from "@/lib/tenancy";
import type { LedgerEntry, Unit } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

type DeductionDraft = { id: string; description: string; amount: string };

const statusClass: Record<DepositStatus, string> = {
  Held: "bg-purple-100 text-purple-900",
  "Refund pending": "bg-warning-soft text-warning-ink",
  "Partly refunded": "bg-warning-soft text-warning-ink",
  Refunded: "bg-success-soft text-success-ink",
  Disputed: "bg-destructive-soft text-destructive-ink",
};

const statusIcon: Record<DepositStatus, typeof ShieldCheck> = {
  Held: ShieldCheck,
  "Refund pending": Clock3,
  "Partly refunded": RotateCcw,
  Refunded: CheckCircle2,
  Disputed: AlertTriangle,
};

export function SecurityView({
  units,
  rentLedger,
  depositLedger,
  onRequestRefund,
  onTenantDecision,
}: {
  units: Unit[];
  rentLedger: LedgerEntry[];
  depositLedger: DepositLedgerEntry[];
  onRequestRefund: (
    entryId: string,
    deductions: DepositDeduction[],
    arrears: number,
    refundAmount: number,
  ) => void;
  onTenantDecision: (entryId: string, decision: "accept" | "dispute") => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DeductionDraft[]>([]);
  const [error, setError] = useState("");
  const period = currentRentPeriod();
  const selected = depositLedger.find((entry) => entry.id === selectedId) ?? null;
  const selectedUnit = selected ? units.find((unit) => unit.id === selected.unitId) : undefined;
  const selectedArrears = getCurrentArrears(selectedUnit, rentLedger, period);
  const deductionTotal = drafts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const selectedRefundable = selected
    ? calculateRefundableDeposit(selected.amount, selectedArrears, deductionTotal)
    : 0;

  const rows = useMemo(
    () =>
      depositLedger.map((entry) => {
        const unit = units.find((item) => item.id === entry.unitId);
        const arrears =
          entry.status !== "Refunded" && entry.status !== "Partly refunded"
            ? getCurrentArrears(unit, rentLedger, period)
            : entry.arrearsAtRefund;
        const deductionsTotal = entry.deductions.reduce((sum, item) => sum + item.amount, 0);
        const held =
          entry.status === "Refunded" || entry.status === "Partly refunded" ? 0 : entry.amount;
        return {
          entry,
          unit,
          arrears,
          deductionsTotal,
          held,
          refundable: calculateRefundableDeposit(held, arrears, deductionsTotal),
          depositValid: unit ? isDepositValid(entry.amount, unit.rent) : true,
        };
      }),
    [depositLedger, period, rentLedger, units],
  );
  const totalHeld = rows.reduce((sum, row) => sum + row.held, 0);
  const pendingDeductions = rows
    .filter(({ entry }) => entry.status === "Refund pending" || entry.status === "Disputed")
    .reduce((sum, row) => sum + row.deductionsTotal, 0);
  const totalRefundable = rows.reduce((sum, row) => sum + row.refundable, 0);

  function openRefund(entry: DepositLedgerEntry) {
    setSelectedId(entry.id);
    setDrafts(
      entry.deductions.length
        ? entry.deductions.map((item, index) => ({
            id: `${entry.id}-deduction-${index}`,
            description: item.description,
            amount: String(item.amount),
          }))
        : [{ id: `${entry.id}-deduction-new`, description: "", amount: "" }],
    );
    setError("");
  }

  function submitRefund() {
    if (!selected) return;
    const invalid = drafts.some(
      (item) =>
        item.amount.trim() && (!item.description.trim() || !Number.isFinite(Number(item.amount))),
    );
    if (invalid) {
      setError("Give each deduction a description and a valid amount.");
      return;
    }
    const deductions = drafts
      .filter((item) => Number(item.amount) > 0)
      .map((item) => ({ description: item.description.trim(), amount: Number(item.amount) }));
    if (
      deductions.reduce((sum, item) => sum + item.amount, 0) + selectedArrears >
      selected.amount
    ) {
      setError("Arrears and deductions cannot exceed the deposit held.");
      return;
    }
    onRequestRefund(selected.id, deductions, selectedArrears, selectedRefundable);
    setSelectedId(null);
  }

  function acceptRefund(entry: DepositLedgerEntry) {
    try {
      const property = units.find((unit) => unit.id === entry.unitId)?.property;
      if (!property) throw new Error("The property for this deposit could not be found.");
      const refundedEntry: DepositLedgerEntry = {
        ...entry,
        status: (entry.refundAmount ?? 0) < entry.amount ? "Partly refunded" : "Refunded",
        resolvedAt: new Date().toISOString(),
      };
      issueDepositReceipt(refundedEntry, property);
      onTenantDecision(entry.id, "accept");
      toast.success("Refund accepted and receipt generated");
    } catch (reason) {
      toast.error("Could not generate the refund receipt", {
        description: reason instanceof Error ? reason.message : "Allow pop-ups and try again.",
      });
    }
  }

  return (
    <div className="space-y-7">
      <PageHeading eyebrow="PURPLE · SEPARATE DEPOSIT LEDGER" title="Security">
        <span className="grid size-12 place-items-center rounded-full bg-purple-100 text-purple-900">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
      </PageHeading>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Security deposit totals">
        <SummaryCard
          label="Deposits held"
          value={formatUGX(totalHeld)}
          detail="Not rental income"
        />
        <SummaryCard
          label="Deductions pending"
          value={formatUGX(pendingDeductions)}
          detail="Awaiting tenant response"
        />
        <SummaryCard
          label="Refundable today"
          value={formatUGX(totalRefundable)}
          detail="After current arrears and logged deductions"
        />
      </section>

      <section>
        <div>
          <p className="text-eyebrow text-purple-800">Deposit records</p>
          <h2 className="mt-1 text-xl font-bold">Security by tenant</h2>
        </div>
        <div className="surface mt-4 overflow-hidden">
          {rows.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-semibold">No deposits recorded</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Move-in deposits appear here separately from rent payments.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map(
                ({ entry, unit, arrears, deductionsTotal, held, refundable, depositValid }) => {
                  const StatusIcon = statusIcon[entry.status];
                  return (
                    <li
                      key={entry.id}
                      className="grid gap-4 p-5 md:grid-cols-[1.4fr_repeat(4,1fr)_auto] md:items-center md:px-6"
                    >
                      <div>
                        <p className="font-semibold">{entry.tenant}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">Unit {entry.unit}</p>
                        <span
                          className={cn(
                            "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                            statusClass[entry.status],
                          )}
                        >
                          <StatusIcon className="size-3.5" aria-hidden />
                          {entry.status}
                        </span>
                        {!depositValid && (
                          <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-warning-ink">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            Deposit exceeds one month’s rent ({formatUGX(unit?.rent ?? 0)}).
                          </p>
                        )}
                      </div>
                      <Metric
                        label="Deposit amount"
                        value={formatUGX(entry.amount)}
                        note={`${formatUGX(held)} still held`}
                      />
                      <Metric
                        label="Received"
                        value={new Date(entry.receivedAt).toLocaleDateString("en-UG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      />
                      <Metric label="Deductions pending" value={formatUGX(deductionsTotal)} />
                      <Metric
                        label="Refundable if leaving today"
                        value={formatUGX(refundable)}
                        note={
                          arrears > 0 ? `${formatUGX(arrears)} current rent outstanding` : undefined
                        }
                      />
                      <div className="flex flex-wrap gap-2 md:flex-col">
                        {(entry.status === "Held" || entry.status === "Disputed") && (
                          <Button
                            size="sm"
                            className="min-h-11 bg-purple-800 text-white hover:bg-purple-900"
                            onClick={() => openRefund(entry)}
                          >
                            {entry.status === "Disputed" ? "Revise refund" : "Start refund"}
                          </Button>
                        )}
                        {entry.status === "Refund pending" && (
                          <>
                            <Button
                              size="sm"
                              className="min-h-11"
                              onClick={() => acceptRefund(entry)}
                            >
                              Tenant accepts
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-11"
                              onClick={() => {
                                onTenantDecision(entry.id, "dispute");
                                toast.error("Tenant disputed the proposed deductions");
                              }}
                            >
                              Tenant disputes
                            </Button>
                          </>
                        )}
                        {entry.status === "Refunded" && (
                          <ReceiptActions
                            getBundle={() => {
                              const property = units.find(
                                (unit) => unit.id === entry.unitId,
                              )?.property;
                              if (!property)
                                throw new Error(
                                  "The property for this deposit could not be found.",
                                );
                              return issueDepositReceipt(entry, property);
                            }}
                          />
                        )}
                        {entry.status !== "Refunded" && (
                          <ReceiptActions
                            getBundle={() => {
                              const property = units.find(
                                (unit) => unit.id === entry.unitId,
                              )?.property;
                              if (!property)
                                throw new Error(
                                  "The property for this deposit could not be found.",
                                );
                              return issueDepositReceipt(entry, property);
                            }}
                          />
                        )}
                      </div>
                    </li>
                  );
                },
              )}
            </ul>
          )}
        </div>
      </section>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-2xl bg-background p-5 sm:p-6">
          <DialogTitle>Propose deposit refund</DialogTitle>
          <DialogDescription>
            {selected?.tenant} · Unit {selected?.unit}. Itemise any agreed deductions before sending
            the proposal to the tenant.
          </DialogDescription>
          {selected && (
            <div className="space-y-5">
              <div className="rounded-lg bg-purple-50 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span>Deposit held</span>
                  <span className="figure font-semibold">{formatUGX(selected.amount)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-3">
                  <span>Current rent outstanding</span>
                  <span className="figure font-semibold">{formatUGX(selectedArrears)}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <Label>Itemised deductions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDrafts((items) => [
                        ...items,
                        {
                          id: `${selected.id}-deduction-${Date.now()}`,
                          description: "",
                          amount: "",
                        },
                      ])
                    }
                  >
                    <Plus /> Add item
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  {drafts.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
                      <div>
                        <Label htmlFor={`${item.id}-description`} className="sr-only">
                          Deduction description
                        </Label>
                        <Input
                          id={`${item.id}-description`}
                          value={item.description}
                          onChange={(event) =>
                            setDrafts((items) =>
                              items.map((draft) =>
                                draft.id === item.id
                                  ? { ...draft, description: event.target.value }
                                  : draft,
                              ),
                            )
                          }
                          placeholder="e.g. Broken window"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${item.id}-amount`} className="sr-only">
                          Deduction amount in UGX
                        </Label>
                        <Input
                          id={`${item.id}-amount`}
                          inputMode="numeric"
                          value={item.amount}
                          onChange={(event) =>
                            setDrafts((items) =>
                              items.map((draft) =>
                                draft.id === item.id
                                  ? {
                                      ...draft,
                                      amount: event.target.value.replace(/[^\d]/g, ""),
                                    }
                                  : draft,
                              ),
                            )
                          }
                          placeholder="UGX"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove deduction"
                        disabled={drafts.length === 1}
                        onClick={() =>
                          setDrafts((items) => items.filter((draft) => draft.id !== item.id))
                        }
                      >
                        <Minus />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive-ink"
                >
                  {error}
                </p>
              )}
              {deductionTotal + selectedArrears > selected.amount && (
                <p className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning-ink">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Arrears and deductions exceed the deposit held.
                </p>
              )}
              <div className="flex items-center justify-between rounded-lg bg-purple-100 p-4">
                <span className="font-semibold text-purple-950">Proposed refundable amount</span>
                <span className="figure text-lg font-bold text-purple-950">
                  {formatUGX(selectedRefundable)}
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setSelectedId(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-purple-800 text-white hover:bg-purple-900"
                  onClick={submitRefund}
                >
                  Send to tenant
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl border border-purple-200 bg-purple-50 p-5">
      <p className="text-sm font-semibold text-purple-900">{label}</p>
      <p className="figure mt-3 text-2xl font-bold text-purple-950">{value}</p>
      <p className="mt-1 text-xs text-purple-800/70">{detail}</p>
    </article>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="figure mt-1 break-words text-sm font-semibold">{value}</p>
      {note && <p className="mt-1 text-xs text-warning-ink">{note}</p>}
    </div>
  );
}

function getCurrentArrears(unit: Unit | undefined, rentLedger: LedgerEntry[], period: string) {
  if (!unit?.tenant || unit.daysUntilDue > 0) return 0;
  return Math.max(0, unit.rent - getUnitPeriodCredit(unit, rentLedger, period));
}
