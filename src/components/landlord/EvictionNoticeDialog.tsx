import { CalendarClock, Mail, MessageCircle, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { printPdf } from "@/lib/documents";
import { NOTICE_MIN_DAYS, validateNotice } from "@/lib/rent";
import type { Unit } from "@/lib/sample-data";
import type { EvictionNotice } from "@/lib/tenant-demo";

export function EvictionNoticeDialog({
  unit,
  onClose,
  onSendToApp,
}: {
  unit: Unit | null;
  onClose: () => void;
  onSendToApp: (notice: EvictionNotice) => void;
}) {
  const [issuedOn, setIssuedOn] = useState("2026-11-17");
  const [vacateBy, setVacateBy] = useState("2026-12-17");
  const [reason, setReason] = useState("");

  if (!unit) return null;

  const notice: EvictionNotice = {
    unit: unit.unit,
    property: unit.property,
    tenant: unit.tenant ?? "Tenant",
    phone: unit.phone,
    email: unit.email ?? "",
    issuedOn,
    vacateBy,
    reason: reason.trim(),
  };
  const noticeError = validateNotice(issuedOn, vacateBy, reason);
  const rows: [string, string][] = [
    ["Tenant", notice.tenant],
    ["Property and unit", `${notice.property} · ${notice.unit}`],
    ["Notice date", issuedOn],
    ["Requested vacate date", vacateBy],
    ["Tenant contact", notice.phone],
    ...(notice.email ? [["Email", notice.email] as [string, string]] : []),
  ];
  const message = `Formal notice for ${notice.unit}, ${notice.property}. Notice date: ${issuedOn}. Requested move-out date: ${vacateBy}.${notice.reason ? ` Reason: ${notice.reason}` : ""} Please contact your landlord to discuss arrangements.`;
  const whatsappPhone = notice.phone.replace(/\D/g, "").replace(/^0/, "256");

  return (
    <Dialog open={!!unit} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-1rem)] max-h-[94dvh] max-w-lg overflow-y-auto rounded-2xl bg-background p-4 sm:p-6">
        <DialogHeader className="rounded-xl bg-warning-soft p-4 sm:p-5">
          <DialogTitle className="text-xl sm:text-2xl">Prepare an eviction notice</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Create a printable notice for {unit.tenant}, Unit {unit.unit}. Confirm the legally
            required notice period before sending.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="notice-issued">Notice date</Label>
              <Input
                id="notice-issued"
                className="mt-1.5"
                type="date"
                value={issuedOn}
                onChange={(event) => setIssuedOn(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notice-vacate">Requested move-out</Label>
              <Input
                id="notice-vacate"
                className="mt-1.5"
                type="date"
                value={vacateBy}
                onChange={(event) => setVacateBy(event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notice-reason">Reason / details</Label>
            <Textarea
              id="notice-reason"
              className="mt-1.5"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Add the grounds for the notice and any relevant next steps."
            />
          </div>

          <p className={noticeError ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
            {noticeError ?? `Meets the ${NOTICE_MIN_DAYS}-day minimum.`} Guidance only. Confirm with an advocate.
          </p>
          <div className="rounded-xl border border-warning/25 bg-warning-soft p-4 text-sm leading-relaxed text-warning-ink">
            This demo prepares the notice and opens your email or WhatsApp app. Attach the saved PDF
            yourself; messages are not delivered by Propatiz.
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              className="min-h-12 w-full bg-card"
              variant="outline"
              disabled={!!noticeError}
              onClick={() => {
                try {
                  printPdf("Notice to vacate", rows, message);
                } catch (error) {
                  toast.error("Could not open the print dialog", {
                    description:
                      error instanceof Error ? error.message : "Allow pop-ups and try again.",
                  });
                }
              }}
            >
              <Printer /> Save as PDF
            </Button>
            <Button
              className="min-h-12 w-full bg-card"
              variant="outline"
              disabled={!!noticeError}
              onClick={() => {
                onSendToApp(notice);
                toast.success("Notice added to the tenant app");
              }}
            >
              <CalendarClock /> Add to tenant app
            </Button>
            <Button
              className="min-h-12 w-full bg-card"
              variant="outline"
              disabled={!notice.email || !!noticeError}
              onClick={() => {
                if (!notice.email) return;
                window.location.href = `mailto:${encodeURIComponent(notice.email)}?subject=${encodeURIComponent("Notice to vacate")}&body=${encodeURIComponent(message)}`;
              }}
            >
              <Mail /> Prepare email
            </Button>
            <Button
              className="min-h-12 w-full bg-card"
              variant="outline"
              disabled={!whatsappPhone || !!noticeError}
              onClick={() =>
                window.open(
                  `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <MessageCircle /> Open WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
