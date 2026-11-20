import { useState } from "react";
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
import { cancelAndReissueReceipt, type ReceiptBundle } from "@/lib/receipt-branding";

export function ReceiptActions({ getBundle }: { getBundle: () => ReceiptBundle }) {
  const [reissueOpen, setReissueOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

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
      const replacement = cancelAndReissueReceipt(bundle.receipt.receiptNumber, reason);
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
