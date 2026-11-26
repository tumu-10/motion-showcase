import { Bell, Banknote, Check, DoorOpen, FileText, History, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Pill, RentStatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatUGX, getUnitListStatus } from "@/lib/rent";
import type { RentPaymentMethod, Unit } from "@/lib/sample-data";
import type { RentAuditLogEntry } from "@/lib/rent-demo";
import type { MoveInPaymentRequest, Tenancy } from "@/lib/tenancy";

export function UnitSheet({
  unit,
  tenancy,
  moveInRequest,
  auditLog,
  onClose,
  reminded,
  onRemind,
  onRecordPayment,
  onRecordMoveInPayment,
  amountForMonths,
  onAddTenant,
  onMoveOut,
  onEvictionNotice,
}: {
  unit: Unit | null;
  tenancy: Tenancy | null;
  moveInRequest: MoveInPaymentRequest | null;
  auditLog: RentAuditLogEntry[];
  onClose: () => void;
  reminded: boolean;
  onRemind: () => void;
  onRecordPayment: (
    monthsCovered: number,
    method: RentPaymentMethod,
    reference: string,
    receiptPhotoDataUrl?: string,
  ) => boolean;
  onRecordMoveInPayment: (amount: number) => void;
  amountForMonths: (monthsCovered: number) => number;
  onAddTenant: () => void;
  onMoveOut: () => void;
  onEvictionNotice: () => void;
}) {
  const [monthsCovered, setMonthsCovered] = useState("1");
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<RentPaymentMethod>("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptPhotoDataUrl, setReceiptPhotoDataUrl] = useState("");
  const [receiptPhotoName, setReceiptPhotoName] = useState("");
  const [receiptPhotoReading, setReceiptPhotoReading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [moveInPaymentAmount, setMoveInPaymentAmount] = useState("");
  const [confirmMoveOut, setConfirmMoveOut] = useState(false);
  const st = unit ? getUnitListStatus(unit) : "vacant";
  const pendingTenancy = tenancy?.status === "Pending move-in" ? tenancy : null;
  const moveInBalance = moveInRequest
    ? Math.max(0, moveInRequest.amountDue - moveInRequest.amountPaid)
    : 0;
  const moveInPayment = Number(moveInPaymentAmount.replace(/[^\d]/g, ""));

  useEffect(() => {
    if (moveInRequest) setMoveInPaymentAmount(String(moveInBalance));
  }, [moveInRequest, moveInBalance]);

  useEffect(() => {
    setPaymentFormOpen(false);
    setPaymentMethod("Cash");
    setPaymentReference("");
    setReceiptPhotoDataUrl("");
    setReceiptPhotoName("");
    setReceiptPhotoReading(false);
    setPaymentError("");
  }, [unit?.id]);

  return (
    <Sheet open={!!unit} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-background p-0 sm:max-w-md"
      >
        {unit && (
          <>
            <SheetHeader className="border-b border-border p-6 text-left">
              <p className="text-sm text-muted-foreground">{unit.property}</p>
              <SheetTitle className="text-2xl">Unit {unit.unit}</SheetTitle>
              <SheetDescription className="sr-only">Unit details and actions</SheetDescription>
              <div className="pt-2">
                {st === "pending" ? (
                  <Pill tone="info" label="Pending move-in" />
                ) : st === "vacant" ? (
                  <Pill tone="neutral" label="Vacant" />
                ) : (
                  <RentStatusPill status={st} />
                )}
              </div>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <dl className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
                {[
                  ["Tenant", pendingTenancy?.tenantName ?? unit.tenant ?? "No tenant"],
                  ["Phone", pendingTenancy?.phone ?? (unit.phone || "-")],
                  ["Email", pendingTenancy?.email ?? (unit.email || "-")],
                  ["Occupants", unit.tenant ? String(unit.occupants ?? "-") : "-"],
                  ["Occupation", unit.occupation || "-"],
                  ["Sex", unit.sex || "-"],
                  ["Monthly rent", formatUGX(pendingTenancy?.monthlyRent ?? unit.rent)],
                  ...(pendingTenancy
                    ? [
                        ["Start date", pendingTenancy.startDate],
                        ["Move-in", pendingTenancy.status],
                        ["Agreement file", pendingTenancy.agreementFile ?? "Not attached"],
                        [
                          "Tenant ID",
                          `${pendingTenancy.tenantIdType} · ${pendingTenancy.tenantIdNumber}`,
                        ],
                      ]
                    : []),
                  ["Lease ends", unit.leaseEnds],
                  [
                    "This month",
                    !unit.tenant
                      ? "-"
                      : unit.paid
                        ? "Paid"
                        : unit.daysUntilDue < 0
                          ? `${Math.abs(unit.daysUntilDue)} days late`
                          : `Due in ${unit.daysUntilDue} days`,
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="figure text-right font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {pendingTenancy ? (
                <section className="space-y-4 rounded-xl border border-warning/40 bg-warning-soft p-4">
                  <div>
                    <p className="font-semibold">Move-in payment request</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatUGX(moveInRequest?.amountPaid ?? 0)} paid of{" "}
                      {formatUGX(moveInRequest?.amountDue ?? 0)}. The tenancy activates when the
                      full move-in minimum is received.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="move-in-part-payment">Record a part payment (UGX)</Label>
                    <Input
                      id="move-in-part-payment"
                      inputMode="numeric"
                      className="figure mt-2"
                      value={moveInPaymentAmount}
                      onChange={(event) =>
                        setMoveInPaymentAmount(event.target.value.replace(/[^\d]/g, ""))
                      }
                      max={moveInBalance}
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={
                      !moveInRequest ||
                      !Number.isFinite(moveInPayment) ||
                      moveInPayment <= 0 ||
                      moveInPayment > moveInBalance
                    }
                    onClick={() => onRecordMoveInPayment(moveInPayment)}
                  >
                    <Banknote /> Record {formatUGX(moveInPayment || 0)}
                  </Button>
                </section>
              ) : unit.tenant ? (
                <div className="space-y-2">
                  <Select value={monthsCovered} onValueChange={setMonthsCovered}>
                    <SelectTrigger aria-label="Rent months to record" className="h-12 bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((months) => (
                        <SelectItem key={months} value={months}>
                          {months} {months === "1" ? "month" : "months"} of rent
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Starts with the next unpaid rent month.
                  </p>
                  {paymentFormOpen ? (
                    <form
                      className="space-y-3 rounded-xl border border-primary/20 bg-primary-soft/30 p-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const reference = paymentReference.trim();
                        if (!reference) {
                          setPaymentError("Enter the payment reference.");
                          return;
                        }
                        const recorded = onRecordPayment(
                          Number(monthsCovered),
                          paymentMethod,
                          reference,
                          receiptPhotoDataUrl || undefined,
                        );
                        if (!recorded) return;
                        setPaymentFormOpen(false);
                        setPaymentMethod("Cash");
                        setPaymentReference("");
                        setReceiptPhotoDataUrl("");
                        setReceiptPhotoName("");
                        setPaymentError("");
                      }}
                    >
                      <p className="font-semibold">Record a rent payment</p>
                      <label className="grid gap-1.5 text-sm font-medium">
                        Payment method
                        <select
                          className="min-h-11 rounded-md border border-input bg-card px-3"
                          value={paymentMethod}
                          onChange={(event) => {
                            const method = event.target.value as RentPaymentMethod;
                            setPaymentMethod(method);
                            if (method !== "Cash") {
                              setReceiptPhotoDataUrl("");
                              setReceiptPhotoName("");
                            }
                          }}
                          required
                        >
                          <option value="Cash">Cash</option>
                          <option value="Mobile money">Mobile money</option>
                          <option value="Bank transfer">Bank</option>
                        </select>
                      </label>
                      <div>
                        <Label htmlFor="rent-payment-reference">Payment reference</Label>
                        <Input
                          id="rent-payment-reference"
                          className="mt-1.5 min-h-11"
                          value={paymentReference}
                          onChange={(event) => setPaymentReference(event.target.value)}
                          maxLength={120}
                          required
                        />
                      </div>
                      {paymentMethod === "Cash" && (
                        <div>
                          <Label htmlFor="cash-receipt-photo">Cash receipt photo (optional)</Label>
                          <Input
                            id="cash-receipt-photo"
                            type="file"
                            accept="image/jpeg,image/png"
                            className="mt-1.5 min-h-11"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              setPaymentError("");
                              if (!file) return;
                              if (!["image/jpeg", "image/png"].includes(file.type)) {
                                setPaymentError("Choose a JPG or PNG cash receipt photo.");
                                event.currentTarget.value = "";
                                return;
                              }
                              if (file.size > 1_000_000) {
                                setPaymentError("The cash receipt photo must be 1 MB or smaller.");
                                event.currentTarget.value = "";
                                return;
                              }
                              const reader = new FileReader();
                              setReceiptPhotoReading(true);
                              reader.onload = () => {
                                setReceiptPhotoReading(false);
                                if (typeof reader.result !== "string") {
                                  setPaymentError("The cash receipt photo could not be read.");
                                  return;
                                }
                                setReceiptPhotoDataUrl(reader.result);
                                setReceiptPhotoName(file.name);
                              };
                              reader.onerror = () => {
                                setReceiptPhotoReading(false);
                                setPaymentError("The cash receipt photo could not be read.");
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          {receiptPhotoName && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Attached: {receiptPhotoName}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Amount:{" "}
                        <span className="figure font-semibold">
                          {formatUGX(amountForMonths(Number(monthsCovered)))}
                        </span>
                      </p>
                      {paymentError && (
                        <p role="alert" className="text-sm font-medium text-destructive">
                          {paymentError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 flex-1"
                          onClick={() => {
                            setPaymentFormOpen(false);
                            setPaymentMethod("Cash");
                            setPaymentReference("");
                            setReceiptPhotoDataUrl("");
                            setReceiptPhotoName("");
                            setPaymentError("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="min-h-11 flex-1"
                          disabled={receiptPhotoReading}
                        >
                          <Banknote /> Mark as paid
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setPaymentError("");
                        setPaymentFormOpen(true);
                      }}
                    >
                      <Banknote /> Mark as paid
                    </Button>
                  )}
                  {!unit.paid && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={reminded}
                        onClick={onRemind}
                      >
                        {reminded ? <Check /> : <Bell />}
                        {reminded ? "Reminder added" : "Send rent reminder"}
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" className="w-full" asChild>
                    <a href={`tel:${unit.phone.replace(/\s/g, "")}`}>
                      <Phone /> Call {unit.tenant.split(" ")[0]}
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" onClick={onEvictionNotice}>
                    <FileText /> Prepare eviction notice
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-destructive-ink hover:bg-destructive-soft"
                    onClick={() => setConfirmMoveOut(true)}
                  >
                    <DoorOpen /> Remove tenant and mark vacant
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-input p-6 text-center">
                  <p className="font-semibold">This unit is empty</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a tenant to start collecting rent.
                  </p>
                  <Button className="mt-4" onClick={onAddTenant}>
                    Add tenant
                  </Button>
                </div>
              )}
              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <History className="size-4" aria-hidden />
                  Payment audit log
                </h3>
                {auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payment activity recorded.</p>
                ) : (
                  <ol className="space-y-3">
                    {auditLog.slice(0, 5).map((entry) => (
                      <li key={entry.id} className="border-t border-border pt-3 text-sm">
                        <p className="flex items-center gap-1.5 font-semibold">
                          <UserRound className="size-3.5" aria-hidden />
                          {entry.actor}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("en-UG")}
                        </p>
                        <p className="mt-1 font-medium">{entry.action}</p>
                        <p className="mt-1 text-muted-foreground">{entry.changes}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
      <AlertDialog open={confirmMoveOut} onOpenChange={setConfirmMoveOut}>
        <AlertDialogContent className="rounded-xl bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove tenant and end this tenancy?</AlertDialogTitle>
            <AlertDialogDescription>
              {unit?.tenant} will be disconnected from Unit {unit?.unit}, and the unit will be
              marked vacant. Payment records will remain in the landlord ledger and tenant history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive-ink"
              onClick={() => {
                onMoveOut();
                setConfirmMoveOut(false);
              }}
            >
              End tenancy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
