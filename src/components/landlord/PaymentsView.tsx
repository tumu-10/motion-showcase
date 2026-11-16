import { Download } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { PageHeading } from "@/components/shared/DashShell";
import { Pill, type Tone } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { formatUGX } from "@/lib/rent";
import { ease } from "@/lib/motion";
import type { LedgerEntry } from "@/lib/sample-data";

const statusTone: Record<LedgerEntry["status"], Tone> = { Confirmed: "success", Pending: "warning", Failed: "danger" };

function exportCsv(rows: LedgerEntry[]) {
  const header = ["Date", "Tenant", "Unit", "Amount (UGX)", "Method", "Reference", "Status"];
  const lines = rows.map((r) => [r.date, r.tenant, r.unit, r.amount, r.method, r.reference, r.status].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "propatiz-payments-november-2026.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Payments exported", { description: `${rows.length} payments saved as a CSV file.` });
}

export function PaymentsView({ ledger }: { ledger: LedgerEntry[] }) {
  const confirmed = ledger.filter((l) => l.status === "Confirmed").reduce((s, l) => s + l.amount, 0);
  return (
    <>
      <PageHeading eyebrow={`${formatUGX(confirmed)} confirmed this month`} title="Payments">
        <Button variant="outline" onClick={() => exportCsv(ledger)}>
          <Download /> Export CSV
        </Button>
      </PageHeading>
      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-semibold">Date</th>
              <th className="px-6 py-3 font-semibold">Tenant</th>
              <th className="px-6 py-3 font-semibold">Method</th>
              <th className="px-6 py-3 font-semibold">Reference</th>
              <th className="px-6 py-3 text-right font-semibold">Amount</th>
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ledger.map((l, i) => (
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
                  <span className="block text-xs text-muted-foreground">Unit {l.unit}</span>
                </td>
                <td className="px-6 py-4">{l.method}</td>
                <td className="figure px-6 py-4 text-muted-foreground">{l.reference}</td>
                <td className="figure px-6 py-4 text-right font-bold">{formatUGX(l.amount)}</td>
                <td className="px-6 py-4">
                  <Pill tone={statusTone[l.status]} label={l.status} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
