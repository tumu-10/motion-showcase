import { createFileRoute } from "@tanstack/react-router";
import { Activity, Ban, BadgeCheck, Building, Link2, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { CountUp } from "@/components/shared/CountUp";
import { DashShell, PageHeading, type NavItem } from "@/components/shared/DashShell";
import { Pill, SampleTag, type Tone } from "@/components/shared/StatusPill";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatUGX } from "@/lib/rent";
import { ease } from "@/lib/motion";
import {
  landlords as initialLandlords,
  units,
  unmatchedTransactions,
  type Landlord,
  type UnmatchedTxn,
} from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Platform admin | Propatiz" },
      {
        name: "description",
        content: "Verify landlords, match unreferenced mobile money payments and monitor payment providers in the Propatiz admin console.",
      },
      { property: "og:title", content: "Propatiz platform admin" },
      { property: "og:description", content: "Landlord verification, payment matching and provider status for the Propatiz operations team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type View = "overview" | "payments" | "landlords";

const verificationTone: Record<Landlord["verification"], Tone> = {
  Verified: "success",
  "Pending review": "warning",
  Suspended: "danger",
};

function AdminPage() {
  const [view, setView] = useState<View>("overview");
  const [landlords, setLandlords] = useState(initialLandlords);
  const [txns, setTxns] = useState(unmatchedTransactions);
  const [matching, setMatching] = useState<UnmatchedTxn | null>(null);
  const [confirm, setConfirm] = useState<{ landlord: Landlord; action: "approve" | "suspend" } | null>(null);

  const pending = landlords.filter((l) => l.verification === "Pending review").length;
  const nav: NavItem<View>[] = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "payments", label: "Match payments", icon: Link2, badge: txns.length },
    { id: "landlords", label: "Landlords", icon: Building, badge: pending },
  ];

  const applyVerification = (l: Landlord, action: "approve" | "suspend") => {
    setLandlords((list) => list.map((x) => (x.id === l.id ? { ...x, verification: action === "approve" ? "Verified" : "Suspended" } : x)));
    toast.success(action === "approve" ? "Landlord verified" : "Account suspended", {
      description: action === "approve" ? `${l.name} can now collect rent.` : `${l.name} can no longer collect rent until reinstated.`,
    });
  };

  return (
    <DashShell current="/admin" nav={nav} view={view} onView={setView} account={{ name: "Ops Team", role: "Platform administrator" }}>
      {view === "overview" && <AdminOverview landlords={landlords} txns={txns} onOpen={setView} />}
      {view === "payments" && <UnmatchedPayments txns={txns} onMatch={setMatching} />}
      {view === "landlords" && (
        <LandlordList landlords={landlords} onAction={(landlord, action) => setConfirm({ landlord, action })} />
      )}

      <MatchDialog
        txn={matching}
        onClose={() => setMatching(null)}
        onMatched={(t, unitLabel) => {
          setTxns((list) => list.filter((x) => x.id !== t.id));
          setMatching(null);
          toast.success("Payment matched", { description: `${formatUGX(t.amount)} recorded against ${unitLabel}.` });
        }}
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-lg bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.action === "approve" ? "Verify this landlord?" : "Suspend this account?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "approve"
                ? `${confirm?.landlord.name} will be able to add tenants and collect rent through Propatiz.`
                : `${confirm?.landlord.name} will not be able to collect rent. Their tenants will see a notice to pay their landlord directly.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn("h-12 rounded-full", confirm?.action === "suspend" ? "bg-destructive text-destructive-foreground hover:bg-destructive-ink" : "")}
              onClick={() => confirm && applyVerification(confirm.landlord, confirm.action)}
            >
              {confirm?.action === "approve" ? "Verify landlord" : "Suspend account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashShell>
  );
}

const providers: { name: string; status: "Operational" | "Slow"; tone: Tone; note: string }[] = [
  { name: "MTN Mobile Money", status: "Operational", tone: "success", note: "Payments confirming in under a minute" },
  { name: "Airtel Money", status: "Slow", tone: "warning", note: "Some confirmations taking up to 5 minutes" },
  { name: "SMS reminders", status: "Operational", tone: "success", note: "Delivering normally" },
];

function AdminOverview({ landlords, txns, onOpen }: { landlords: Landlord[]; txns: UnmatchedTxn[]; onOpen: (v: View) => void }) {
  const totalUnits = landlords.reduce((s, l) => s + l.units, 0);
  const metrics = [
    { label: "Landlord accounts", value: landlords.length, sub: `${landlords.filter((l) => l.verification === "Verified").length} verified` },
    { label: "Units on the platform", value: totalUnits, sub: `Across ${landlords.reduce((s, l) => s + l.properties, 0)} properties` },
    { label: "Unmatched payments", value: txns.length, sub: txns.length ? formatUGX(txns.reduce((s, t) => s + t.amount, 0)) : "All matched" },
  ];
  return (
    <>
      <PageHeading eyebrow="Monday, 16 November 2026" title="Platform overview">
        <SampleTag className="self-center" />
      </PageHeading>
      <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i, duration: 0.5, ease: ease.outExpo }} className="bg-card p-6">
            <p className="text-sm font-semibold text-muted-foreground">{m.label}</p>
            <p className="figure mt-2 text-4xl font-bold text-primary-deep">
              <CountUp value={m.value} />
            </p>
            <p className="figure mt-1 text-sm text-muted-foreground">{m.sub}</p>
          </motion.div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="surface overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-bold">Payment providers</h2>
          </div>
          <ul className="divide-y divide-border">
            {providers.map((p) => (
              <li key={p.name} className="flex items-center gap-4 px-6 py-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
                  <Smartphone className="size-5 text-muted-foreground" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.note}</p>
                </div>
                <Pill tone={p.tone} label={p.status} />
              </li>
            ))}
          </ul>
        </div>
        <div className="surface flex flex-col p-6">
          <h2 className="font-bold">Needs your attention</h2>
          <ul className="mt-4 flex-1 space-y-3">
            <li>
              <button onClick={() => onOpen("payments")} className="press flex min-h-16 w-full items-center gap-3 rounded-lg bg-warning-soft px-4 text-left">
                <Link2 className="size-5 text-warning-ink" aria-hidden />
                <span className="flex-1 font-semibold text-warning-ink">
                  {txns.length} {txns.length === 1 ? "payment needs" : "payments need"} matching
                </span>
              </button>
            </li>
            <li>
              <button onClick={() => onOpen("landlords")} className="press flex min-h-16 w-full items-center gap-3 rounded-lg bg-primary-soft px-4 text-left">
                <ShieldCheck className="size-5 text-primary-deep" aria-hidden />
                <span className="flex-1 font-semibold text-primary-deep">
                  {landlords.filter((l) => l.verification === "Pending review").length} landlords waiting for review
                </span>
              </button>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}

function UnmatchedPayments({ txns, onMatch }: { txns: UnmatchedTxn[]; onMatch: (t: UnmatchedTxn) => void }) {
  return (
    <>
      <PageHeading eyebrow="Mobile money received without a clear unit reference" title="Unmatched payments" />
      {txns.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="surface flex flex-col items-center px-6 py-16 text-center">
          <BadgeCheck className="size-10 text-success" aria-hidden />
          <p className="mt-4 text-lg font-bold">Every payment is matched</p>
          <p className="mt-1 text-sm text-muted-foreground">New unmatched payments will appear here.</p>
        </motion.div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {txns.map((t) => (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 60, transition: { duration: 0.3 } }}
                transition={{ duration: 0.4, ease: ease.outExpo }}
                className="surface grid gap-4 p-5 md:grid-cols-[1fr_12rem_auto] md:items-center"
              >
                <div>
                  <p className="font-bold">{t.sender}</p>
                  <p className="figure text-sm text-muted-foreground">
                    {t.phone} · {t.network} · {t.received}
                  </p>
                  <p className="figure mt-1 text-xs text-muted-foreground">Ref {t.reference}</p>
                </div>
                <p className="figure text-xl font-bold md:text-right">{formatUGX(t.amount)}</p>
                <Button onClick={() => onMatch(t)}>
                  <Link2 /> Match to unit
                </Button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}

function MatchDialog({ txn, onClose, onMatched }: { txn: UnmatchedTxn | null; onClose: () => void; onMatched: (t: UnmatchedTxn, unitLabel: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const occupied = units.filter((u) => u.tenant);
  // Suggest units whose tenant phone matches the sender, then units with matching rent.
  const ranked = txn
    ? [...occupied].sort((a, b) => score(b, txn) - score(a, txn)).slice(0, 5)
    : [];

  return (
    <Dialog
      open={!!txn}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setSelected(null);
        }
      }}
    >
      <DialogContent className="max-w-lg rounded-lg bg-card">
        <DialogHeader>
          <DialogTitle>Match payment</DialogTitle>
          <DialogDescription>
            {txn && `${formatUGX(txn.amount)} from ${txn.sender} (${txn.phone}). Choose the unit this payment is for.`}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2" role="radiogroup" aria-label="Unit">
          {ranked.map((u, i) => {
            const isSuggested = txn && i === 0 && score(u, txn) >= 2;
            return (
              <li key={u.id}>
                <button
                  role="radio"
                  aria-checked={selected === u.id}
                  onClick={() => setSelected(u.id)}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-lg border-2 px-4 py-2 text-left transition-colors",
                    selected === u.id ? "border-primary bg-primary-soft" : "border-border hover:bg-secondary",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {u.tenant} · {u.unit}, {u.property}
                    </p>
                    <p className="figure text-sm text-muted-foreground">
                      {u.phone} · Rent {formatUGX(u.rent)}
                    </p>
                  </div>
                  {isSuggested && <Pill tone="info" label="Phone matches" />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selected || saving}
            onClick={() => {
              const u = occupied.find((x) => x.id === selected);
              if (!txn || !u) return;
              setSaving(true);
              window.setTimeout(() => {
                setSaving(false);
                setSelected(null);
                onMatched(txn, `${u.unit}, ${u.property}`);
              }, 700);
            }}
          >
            {saving ? (<><Loader2 className="animate-spin" /> Matching</>) : "Confirm match"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function score(u: (typeof units)[number], t: UnmatchedTxn) {
  let s = 0;
  if (u.phone.replace(/\s/g, "") === t.phone.replace(/\s/g, "")) s += 2;
  if (u.rent === t.amount) s += 1;
  return s;
}

function LandlordList({ landlords, onAction }: { landlords: Landlord[]; onAction: (l: Landlord, a: "approve" | "suspend") => void }) {
  return (
    <>
      <PageHeading eyebrow="Accounts that collect rent through Propatiz" title="Landlords" />
      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-semibold">Account</th>
              <th className="px-6 py-3 text-right font-semibold">Properties</th>
              <th className="px-6 py-3 text-right font-semibold">Units</th>
              <th className="px-6 py-3 font-semibold">Joined</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {landlords.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-secondary">
                <td className="px-6 py-4">
                  <span className="font-semibold">{l.name}</span>
                  <span className="block text-xs text-muted-foreground">{l.contact}</span>
                </td>
                <td className="figure px-6 py-4 text-right">{l.properties}</td>
                <td className="figure px-6 py-4 text-right">{l.units}</td>
                <td className="px-6 py-4 text-muted-foreground">{l.joined}</td>
                <td className="px-6 py-4">
                  <Pill tone={verificationTone[l.verification]} label={l.verification} />
                </td>
                <td className="px-6 py-4 text-right">
                  {l.verification === "Verified" ? (
                    <Button size="sm" variant="ghost" onClick={() => onAction(l, "suspend")} className="text-destructive-ink">
                      <Ban /> Suspend
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onAction(l, "approve")}>
                      <BadgeCheck /> {l.verification === "Suspended" ? "Reinstate" : "Verify"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
