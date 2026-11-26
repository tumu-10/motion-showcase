import { Download, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeading } from "@/components/shared/DashShell";
import { ReceiptActions } from "@/components/shared/ReceiptActions";
import { Pill, type Tone } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatUGX } from "@/lib/rent";
import { ease } from "@/lib/motion";
import {
  currentRentPeriod,
  formatRentPeriodRange,
  getUnitPeriodCredit,
  localDateIso,
} from "@/lib/rent-accounting";
import { issueRentReceipt } from "@/lib/receipt-helpers";
import type { LedgerEntry, Unit } from "@/lib/sample-data";

const statusTone: Record<LedgerEntry["status"], Tone> = {
  Confirmed: "success",
  Pending: "warning",
  Failed: "danger",
};

function exportCsv(rows: LedgerEntry[]) {
  const header = [
    "Date received",
    "Tenant",
    "Unit",
    "Amount (UGX)",
    "Rent period",
    "Months covered",
    "Method",
    "Reference",
    "Status",
  ];
  const lines = rows.map((r) =>
    [
      r.date,
      r.tenant,
      r.unit,
      r.amount,
      formatRentPeriodRange(r.rentPeriod, r.monthsCovered),
      r.monthsCovered,
      r.method,
      r.reference,
      r.status,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `propatiz-payments-${currentRentPeriod()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Payments exported", {
    description: `${rows.length} payments saved as a CSV file.`,
  });
}

export function PaymentsView({
  ledger,
  units,
  onConfirm,
  onRecordCashPayment,
}: {
  ledger: LedgerEntry[];
  units: Unit[];
  onConfirm: (id: string) => void;
  onRecordCashPayment: (unitId: string, amount: number, receivedAt: string) => boolean;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [property, setProperty] = useState("all");
  const [block, setBlock] = useState("all");
  const [cashPaymentOpen, setCashPaymentOpen] = useState(false);
  const [cashUnitId, setCashUnitId] = useState(units.find((unit) => unit.tenant)?.id ?? "");
  const [cashAmount, setCashAmount] = useState("");
  const [cashDate, setCashDate] = useState(localDateIso());
  const occupiedUnits = units.filter((unit) => unit.tenant);
  const properties = [...new Set(units.map((unit) => unit.property))];
  const availableBlocks = [
    ...new Set(
      units
        .filter((unit) => property === "all" || unit.property === property)
        .map((unit) => unit.block)
        .filter((name): name is string => !!name),
    ),
  ];
  const filteredLedger = useMemo(
    () =>
      ledger.filter((entry) => {
        const unit = units.find((item) => item.id === entry.unitId);
        return (
          (!fromDate || entry.receivedAt >= fromDate) &&
          (!toDate || entry.receivedAt <= toDate) &&
          (property === "all" || unit?.property === property) &&
          (block === "all" || unit?.block === block)
        );
      }),
    [block, fromDate, ledger, property, toDate, units],
  );
  const confirmed = filteredLedger
    .filter((l) => l.status === "Confirmed" && l.receivedAt.slice(0, 7) === currentRentPeriod())
    .reduce((s, l) => s + l.amount, 0);
  return (
    <>
      <PageHeading eyebrow={`${formatUGX(confirmed)} confirmed this month`} title="Payments">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            className="min-h-11"
            disabled={occupiedUnits.length === 0}
            onClick={() => setCashPaymentOpen(true)}
          >
            <Plus aria-hidden /> Record cash payment
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => exportCsv(filteredLedger)}
          >
            <Download aria-hidden /> Export CSV
          </Button>
        </div>
      </PageHeading>
      <Dialog open={cashPaymentOpen} onOpenChange={setCashPaymentOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-2xl bg-background p-5 sm:p-6">
          <DialogTitle>Record a cash payment</DialogTitle>
          <DialogDescription>
            Confirm the cash received. A receipt will be added to the tenant’s in-app payment
            history.
          </DialogDescription>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const amount = Number(cashAmount);
              if (!Number.isSafeInteger(amount) || amount <= 0) {
                toast.error("Enter a positive whole-UGX amount.");
                return;
              }
              if (onRecordCashPayment(cashUnitId, amount, cashDate)) {
                setCashPaymentOpen(false);
                setCashAmount("");
                setCashDate(localDateIso());
              }
            }}
          >
            <label className="grid gap-1.5 text-sm font-medium">
              Tenant and unit
              <select
                className="h-11 rounded-md border border-input bg-card px-3"
                value={cashUnitId}
                onChange={(event) => setCashUnitId(event.target.value)}
                required
              >
                {occupiedUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.tenant} · {unit.property} · Unit {unit.unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Amount received (UGX)
              <Input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="h-11"
                value={cashAmount}
                onChange={(event) => setCashAmount(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Date received
              <Input
                type="date"
                className="h-11"
                value={cashDate}
                onChange={(event) => setCashDate(event.target.value)}
                required
              />
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setCashPaymentOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="min-h-11">
                Record payment and receipt
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <section
        className="surface mb-5 grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4"
        aria-label="Filter payments"
      >
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          From date
          <Input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            aria-label="Payments from date"
            className="h-12"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          To date
          <Input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            aria-label="Payments to date"
            className="h-12"
          />
        </label>
        <Select
          value={property}
          onValueChange={(value) => {
            setProperty(value);
            setBlock("all");
          }}
        >
          <SelectTrigger aria-label="Filter payments by property" className="h-12 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {properties.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={block} onValueChange={setBlock}>
          <SelectTrigger aria-label="Filter payments by block" className="h-12 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All blocks</SelectItem>
            {availableBlocks.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>
      <ul className="space-y-3 md:hidden">
        {filteredLedger.map((entry) => (
          <li key={entry.id}>
            <article
              className={`rounded-xl border p-4 shadow-soft ${
                entry.status === "Confirmed"
                  ? "border-success/20 bg-success-soft/60"
                  : entry.status === "Pending"
                    ? "border-warning/30 bg-warning-soft/70"
                    : "border-destructive/20 bg-destructive-soft/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{entry.tenant}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Unit {entry.unit}
                    {units.find((unit) => unit.id === entry.unitId)?.block
                      ? ` · ${units.find((unit) => unit.id === entry.unitId)?.block}`
                      : ""}{" "}
                    · {entry.date}
                  </p>
                </div>
                <Pill tone={statusTone[entry.status]} label={entry.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-foreground/10 pt-3 text-sm">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="mt-0.5 break-words font-medium">{entry.method}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Rent coverage</p>
                  <p className="mt-0.5 font-medium">
                    {formatRentPeriodRange(entry.rentPeriod, entry.monthsCovered)}
                  </p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="figure mt-0.5 font-bold">{formatUGX(entry.amount)}</p>
                </div>
                <div className="col-span-2 min-w-0">
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="figure mt-0.5 break-all font-medium">{entry.reference}</p>
                </div>
              </div>
              {entry.bankProofDataUrl && (
                <a
                  href={entry.bankProofDataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-primary underline"
                >
                  View bank transfer proof
                </a>
              )}
              {entry.receiptPhotoDataUrl && (
                <a
                  href={entry.receiptPhotoDataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-primary underline"
                >
                  View cash receipt photo
                </a>
              )}
              {entry.status === "Confirmed" && (
                <div className="mt-4">
                  <ReceiptActions getBundle={() => receiptFor(entry, ledger, units)} />
                </div>
              )}
              {entry.status === "Pending" && (
                <Button className="mt-2 w-full" onClick={() => onConfirm(entry.id)}>
                  Confirm payment
                </Button>
              )}
            </article>
          </li>
        ))}
        {filteredLedger.length === 0 && (
          <li className="surface px-5 py-10 text-center text-sm text-muted-foreground">
            No payments match these filters.
          </li>
        )}
      </ul>
      <div className="surface hidden overflow-x-auto md:block">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-semibold">Date</th>
              <th className="px-6 py-3 font-semibold">Tenant</th>
              <th className="px-6 py-3 font-semibold">Method</th>
              <th className="px-6 py-3 font-semibold">Rent coverage</th>
              <th className="px-6 py-3 font-semibold">Reference</th>
              <th className="px-6 py-3 text-right font-semibold">Amount</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 text-right font-semibold">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredLedger.map((l, i) => (
              <motion.tr
                key={l.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.03, duration: 0.35, ease: ease.outExpo }}
                className="transition-colors hover:bg-secondary"
              >
                <td className="figure px-6 py-4 text-muted-foreground">{l.date}</td>
                <td className="px-6 py-4">
                  <span className="font-semibold">{l.tenant}</span>
                  <span className="block text-xs text-muted-foreground">
                    Unit {l.unit}
                    {units.find((unit) => unit.id === l.unitId)?.block
                      ? ` · ${units.find((unit) => unit.id === l.unitId)?.block}`
                      : ""}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {l.method}
                  {l.bankProofDataUrl && (
                    <a
                      href={l.bankProofDataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs font-semibold text-primary underline"
                    >
                      View bank proof
                    </a>
                  )}
                  {l.receiptPhotoDataUrl && (
                    <a
                      href={l.receiptPhotoDataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs font-semibold text-primary underline"
                    >
                      View cash receipt
                    </a>
                  )}
                </td>
                <td className="px-6 py-4">
                  {formatRentPeriodRange(l.rentPeriod, l.monthsCovered)}
                  {l.monthsCovered > 1 && (
                    <span className="ml-1 text-xs text-muted-foreground">Advance</span>
                  )}
                </td>
                <td className="figure px-6 py-4 text-muted-foreground">{l.reference}</td>
                <td className="figure px-6 py-4 text-right font-bold">{formatUGX(l.amount)}</td>
                <td className="px-6 py-4">
                  <Pill tone={statusTone[l.status]} label={l.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {l.status === "Pending" && (
                      <Button size="sm" onClick={() => onConfirm(l.id)}>
                        Confirm
                      </Button>
                    )}
                    {l.status === "Confirmed" && (
                      <ReceiptActions getBundle={() => receiptFor(l, ledger, units)} />
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
            {filteredLedger.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                  No payments match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function receiptFor(entry: LedgerEntry, ledger: LedgerEntry[], units: Unit[]) {
  const unit = units.find((item) => item.id === entry.unitId);
  if (!unit) throw new Error("The property for this payment could not be found.");
  const balanceAfter = Math.max(0, unit.rent - getUnitPeriodCredit(unit, ledger, entry.rentPeriod));
  return issueRentReceipt(entry, unit.property, balanceAfter);
}
