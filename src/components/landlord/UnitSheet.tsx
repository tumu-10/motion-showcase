import { Bell, Banknote, Check, DoorOpen, FileText, Loader2, Phone } from "lucide-react";
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
import type { Unit } from "@/lib/sample-data";
import type { MoveInPaymentRequest, Tenancy } from "@/lib/tenancy";

export function UnitSheet({
  unit,
  tenancy,
  moveInRequest,
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
  onClose: () => void;
  reminded: boolean;
  onRemind: () => void;
  onRecordPayment: (monthsCovered: number) => void;
  onRecordMoveInPayment: (amount: number) => void;
  amountForMonths: (monthsCovered: number) => number;
  onAddTenant: () => void;
  onMoveOut: () => void;
  onEvictionNotice: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [monthsCovered, setMonthsCovered] = useState("1");
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
                  <Button
                    className="w-full"
                    disabled={saving}
                    onClick={() => {
                      setSaving(true);
                      window.setTimeout(() => {
                        setSaving(false);
                        onRecordPayment(Number(monthsCovered));
                      }, 700);
                    }}
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <Banknote />}
                    {saving
                      ? "Recording"
                      : `Record ${formatUGX(amountForMonths(Number(monthsCovered)))} cash`}
                  </Button>
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
