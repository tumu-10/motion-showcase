import { useState } from "react";
import { Ban, CircleAlert, CircleCheck, CircleHelp, Clock3, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReceiptImage } from "@/lib/receipt-image";
import { buildReceiptPdf } from "@/lib/receipt-pdf";
import {
  cancelAndReissueReceipt,
  efrisStatusLabel,
  type ReceiptBundle,
} from "@/lib/receipt-branding";
import {
  cancelEfrisReceipt,
  refreshEfrisReceiptStatus,
  submitEfrisReceipt,
} from "@/lib/efris-service";
import type { EfrisStatus } from "@/lib/efris";

export function ReceiptActions({
  getBundle,
  showEfrisStatus = true,
}: {
  getBundle: () => ReceiptBundle;
  showEfrisStatus?: boolean;
}) {
  const [reissueOpen, setReissueOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [receiptBundle, setReceiptBundle] = useState(getBundle);

  const efrisTone: Record<EfrisStatus, string> = {
    "not-required": "bg-muted text-muted-foreground",
    pending: "bg-warning-soft text-warning-ink",
    issued: "bg-success-soft text-success-ink",
    failed: "bg-destructive-soft text-destructive-ink",
    cancelled: "bg-muted text-muted-foreground",
  };
  const efrisIcon: Record<EfrisStatus, LucideIcon> = {
    "not-required": CircleHelp,
    pending: Clock3,
    issued: CircleCheck,
    failed: CircleAlert,
    cancelled: Ban,
  };
  const StatusIcon = efrisIcon[receiptBundle.receipt.efris.status];

  async function run(action: (bundle: ReceiptBundle) => Promise<void>) {
    setBusy(true);
    try {
      await action(getBundle());
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("Receipt action failed", {
          description: error instanceof Error ? error.message : "Try again.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf(bundle: ReceiptBundle) {
    const bytes = await buildReceiptPdf(bundle);
    download(
      new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }),
      `${bundle.receipt.receiptNumber}.pdf`,
    );
    toast.success("Receipt PDF downloaded");
  }

  async function sharePdf(bundle: ReceiptBundle) {
    const bytes = await buildReceiptPdf(bundle);
    const file = new File([Uint8Array.from(bytes)], `${bundle.receipt.receiptNumber}.pdf`, {
      type: "application/pdf",
    });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `Receipt ${bundle.receipt.receiptNumber}` });
    } else {
      download(file, file.name);
      toast.info("PDF sharing is not available here; the receipt PDF was downloaded.");
    }
  }

  async function downloadImage(bundle: ReceiptBundle) {
    const image = await createReceiptImage(bundle);
    download(image, `${bundle.receipt.receiptNumber}.png`);
    toast.success("Receipt image downloaded");
  }

  async function shareImage(bundle: ReceiptBundle) {
    const image = await createReceiptImage(bundle);
    const file = new File([image], `${bundle.receipt.receiptNumber}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `Receipt ${bundle.receipt.receiptNumber}` });
    } else {
      download(image, `${bundle.receipt.receiptNumber}.png`);
      toast.info("Image sharing is not available here; the receipt image was downloaded.");
    }
  }

  async function reissue() {
    if (!reason.trim()) return;
    await run(async (bundle) => {
      if (bundle.receipt.efris.status === "issued") {
        await cancelEfrisReceipt(bundle.receipt.receiptNumber, reason);
      }
      const replacement = cancelAndReissueReceipt(bundle.receipt.receiptNumber, reason);
      setReceiptBundle(replacement);
      setReissueOpen(false);
      setReason("");
      await downloadPdf(replacement);
      toast.success("Original receipt cancelled and replacement issued", {
        description: replacement.receipt.receiptNumber,
      });
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={busy}>
            {busy ? "Preparing…" : "Receipt"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {receiptBundle.receipt.content.kind === "rent" &&
            ["pending", "failed"].includes(receiptBundle.receipt.efris.status) && (
              <DropdownMenuItem
                onSelect={() =>
                  void run(async (bundle) => {
                    const updated = await submitEfrisReceipt(bundle.receipt.receiptNumber, {
                      offline: !navigator.onLine,
                    });
                    setReceiptBundle(updated);
                    if (updated.receipt.efris.status === "issued") {
                      toast.success("Mock EFRIS document issued", {
                        description: updated.receipt.efris.fiscalDocumentNumber ?? undefined,
                      });
                    } else {
                      toast.error("EFRIS mock submission needs attention", {
                        description:
                          updated.receipt.efris.errorMessage ??
                          "Review the landlord EFRIS profile.",
                      });
                    }
                  })
                }
              >
                Submit / retry EFRIS (mock)
              </DropdownMenuItem>
            )}
          {receiptBundle.receipt.content.kind === "rent" &&
            receiptBundle.receipt.efris.status === "issued" && (
              <DropdownMenuItem
                onSelect={() =>
                  void run(async (bundle) => {
                    const updated = await refreshEfrisReceiptStatus(bundle.receipt.receiptNumber, {
                      offline: !navigator.onLine,
                    });
                    setReceiptBundle(updated);
                  })
                }
              >
                Check mock EFRIS status
              </DropdownMenuItem>
            )}
          <DropdownMenuItem onSelect={() => void run(downloadPdf)}>Download PDF</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void run(sharePdf)}>Share PDF</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void run(shareImage)}>Share image</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              void run(async (bundle) => {
                const url = `${window.location.origin}/verify?ref=${encodeURIComponent(bundle.receipt.receiptNumber)}`;
                const text = `Verify receipt ${bundle.receipt.receiptNumber}: ${url}`;
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(text)}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              })
            }
          >
            Share verification link on WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void run(downloadImage)}>
            Download image
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setReason("");
              setReissueOpen(true);
            }}
          >
            Cancel &amp; reissue…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={reissueOpen} onOpenChange={setReissueOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel and reissue receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              The original will remain in the archive marked cancelled, and the replacement will
              keep the original receipt details and branding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="receipt-cancellation-reason">Reason for reissue</Label>
            <Input
              id="receipt-cancellation-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Correcting a payment reference"
              maxLength={240}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep receipt</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reason.trim() || busy}
              onClick={(event) => {
                event.preventDefault();
                void reissue();
              }}
            >
              Cancel and issue replacement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {showEfrisStatus && (
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${efrisTone[receiptBundle.receipt.efris.status]}`}
            aria-label={`EFRIS status: ${efrisStatusLabel(receiptBundle.receipt.efris.status)}`}
          >
            <StatusIcon className="mr-1 size-3.5" aria-hidden />
            EFRIS · {efrisStatusLabel(receiptBundle.receipt.efris.status)}
          </span>
          {receiptBundle.receipt.efris.fiscalDocumentNumber && (
            <span className="break-all text-xs text-muted-foreground">
              {receiptBundle.receipt.efris.fiscalDocumentNumber}
            </span>
          )}
          {receiptBundle.receipt.efris.accountantNote && (
            <span className="text-xs text-warning-ink">
              {receiptBundle.receipt.efris.accountantNote}
            </span>
          )}
        </div>
      )}
    </>
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
