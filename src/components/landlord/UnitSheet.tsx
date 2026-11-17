import { Bell, Banknote, Check, DoorOpen, FileText, Loader2, Phone } from "lucide-react";
import { useState } from "react";
import { Pill, RentStatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
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
import { formatUGX } from "@/lib/rent";
import type { Unit } from "@/lib/sample-data";
import { unitStatus } from "@/components/landlord/UnitsView";

export function UnitSheet({
  unit,
  onClose,
  reminded,
  onRemind,
  onRecordCash,
  onAddTenant,
  onMoveOut,
  onEvictionNotice,
}: {
  unit: Unit | null;
  onClose: () => void;
  reminded: boolean;
  onRemind: () => void;
  onRecordCash: () => void;
  onAddTenant: () => void;
  onMoveOut: () => void;
  onEvictionNotice: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [confirmMoveOut, setConfirmMoveOut] = useState(false);
  const st = unit ? unitStatus(unit) : "vacant";
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
                {st === "vacant" ? (
                  <Pill tone="neutral" label="Vacant" />
                ) : (
                  <RentStatusPill status={st} />
                )}
              </div>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <dl className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
                {[
                  ["Tenant", unit.tenant ?? "No tenant"],
                  ["Phone", unit.phone || "-"],
                  ["Email", unit.email || "-"],
                  ["Occupants", unit.tenant ? String(unit.occupants ?? "-") : "-"],
                  ["Occupation", unit.occupation || "-"],
                  ["Sex", unit.sex || "-"],
                  ["Monthly rent", formatUGX(unit.rent)],
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
              {unit.tenant ? (
                <div className="space-y-2">
                  {!unit.paid && (
                    <>
                      <Button
                        className="w-full"
                        disabled={saving}
                        onClick={() => {
                          setSaving(true);
                          window.setTimeout(() => {
                            setSaving(false);
                            onRecordCash();
                          }, 700);
                        }}
                      >
                        {saving ? <Loader2 className="animate-spin" /> : <Banknote />}
                        {saving ? "Recording" : `Record cash payment of ${formatUGX(unit.rent)}`}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={reminded}
                        onClick={onRemind}
                      >
                        {reminded ? <Check /> : <Bell />}
                        {reminded ? "Reminder sent" : "Send SMS reminder"}
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
