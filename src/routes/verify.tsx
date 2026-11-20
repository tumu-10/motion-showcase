import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getReceiptBundle, type ReceiptBundle } from "@/lib/receipt-branding";
import { formatUGX } from "@/lib/rent";

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search.ref === "string" ? search.ref : "",
  }),
  head: () => ({
    meta: [
      { title: "Verify receipt | Propatiz" },
      { name: "description", content: "Check a Propatiz payment receipt." },
    ],
  }),
  component: VerifyReceiptPage,
});

function VerifyReceiptPage() {
  const { ref } = Route.useSearch();
  const [bundle, setBundle] = useState<ReceiptBundle | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setBundle(ref ? getReceiptBundle(ref) : null);
    setLoaded(true);
  }, [ref]);

  const valid = bundle?.receipt.status === "Valid";
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-12 sm:px-6">
      <a href="/" className="text-sm font-bold text-primary">
        Propatiz
      </a>
      <section className="surface mt-8 p-6 sm:p-8">
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Checking receipt…</p>
        ) : bundle ? (
          <>
            <div className="flex items-center gap-3">
              {valid ? (
                <CheckCircle2 className="size-8 text-success" aria-hidden />
              ) : (
                <CircleAlert className="size-8 text-destructive" aria-hidden />
              )}
              <div>
                <p className="text-eyebrow text-muted-foreground">Receipt verification</p>
                <h1 className="text-2xl font-bold">
                  {valid ? "Valid receipt" : "Cancelled receipt"}
                </h1>
              </div>
            </div>
            <dl className="mt-6 divide-y divide-border rounded-lg border px-4">
              <VerifyRow label="Receipt number" value={bundle.receipt.receiptNumber} />
              <VerifyRow label="Status" value={bundle.receipt.status} />
              <VerifyRow label="Tenant" value={bundle.receipt.content.tenant} />
              <VerifyRow
                label="Property / unit"
                value={`${bundle.receipt.content.property} · ${bundle.receipt.content.unit}`}
              />
              <VerifyRow label="Amount" value={formatUGX(bundle.receipt.content.amount)} />
              <VerifyRow label="Payment reference" value={bundle.receipt.content.reference} />
              <VerifyRow
                label="Issued"
                value={new Date(bundle.receipt.content.issuedAt).toLocaleString("en-UG")}
              />
              {bundle.receipt.replacementReceiptNumber && (
                <VerifyRow
                  label="Replacement receipt"
                  value={bundle.receipt.replacementReceiptNumber}
                />
              )}
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              This demo checks the receipt archive stored in the browser that issued it. Public
              cross-device verification requires a connected server archive.
            </p>
          </>
        ) : (
          <>
            <CircleAlert className="size-8 text-warning" aria-hidden />
            <h1 className="mt-3 text-2xl font-bold">Receipt not found</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              No receipt with this reference exists in this browser's demo archive.
            </p>
            <Button className="mt-6" onClick={() => window.history.back()}>
              Go back
            </Button>
          </>
        )}
      </section>
    </main>
  );
}

function VerifyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] break-all text-right font-medium">{value}</dd>
    </div>
  );
}
