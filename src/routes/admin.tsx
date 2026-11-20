import { createFileRoute } from "@tanstack/react-router";
import {
  Ban,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Download,
  LayoutGrid,
  Link2,
  Loader2,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import heroKampala from "@/assets/hero-kampala.jpg";
import listingHomes from "@/assets/listing-2.jpg";
import { CountUp } from "@/components/shared/CountUp";
import { CreateLandlordDialog } from "@/components/admin/CreateLandlordDialog";
import { Reveal } from "@/components/motion/Reveal";
import { DashShell, PageHeading, type NavItem } from "@/components/shared/DashShell";
import { SpotlightCard } from "@/components/shared/SpotlightCard";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadCsv } from "@/lib/documents";
import { formatUGX } from "@/lib/rent";
import {
  currentRentPeriod,
  formatRentPeriodRange,
  getNextUncoveredRentPeriod,
  localDateIso,
  summarizeRentPeriod,
} from "@/lib/rent-accounting";
import { useRentDemoData } from "@/lib/useRentDemoData";
import { ease } from "@/lib/motion";
import {
  landlords as initialLandlords,
  PROPERTY_TYPE_LABELS,
  SUBSCRIPTION_RATE_PER_TENANT_MONTH,
  unmatchedTransactions,
  type Landlord,
  type LedgerEntry,
  type TenantNotification,
  type Unit,
  type PropertyType,
  type SubscriptionPlan,
  type UnmatchedTxn,
} from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Platform admin | Propatiz" },
      {
        name: "description",
        content:
          "Verify landlords, match unreferenced mobile money payments and monitor payment providers in the Propatiz admin console.",
      },
      { property: "og:title", content: "Propatiz platform admin" },
      {
        property: "og:description",
        content:
          "Landlord verification, payment matching and provider status for the Propatiz operations team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type View = "overview" | "operations" | "payments" | "landlords" | "settings";

const verificationTone: Record<Landlord["verification"], Tone> = {
  Verified: "success",
  "Pending review": "warning",
  Suspended: "danger",
};
const subscriptionMonths: Record<SubscriptionPlan, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

function AdminPage() {
  const [view, setView] = useState<View>("overview");
  const { data: rentData, setData: setRentData } = useRentDemoData();
  const [landlords, setLandlords] = useState(initialLandlords);
  const [txns, setTxns] = useState(unmatchedTransactions);
  const [matching, setMatching] = useState<UnmatchedTxn | null>(null);
  const [confirm, setConfirm] = useState<{
    landlord: Landlord;
    action: "approve" | "suspend";
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const pending = landlords.filter((l) => l.verification === "Pending review").length;
  const rentSummary = summarizeRentPeriod(rentData.units, rentData.ledger, currentRentPeriod());
  const nav: NavItem<View>[] = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "operations", label: "Payment operations", icon: ClipboardCheck },
    { id: "payments", label: "Match payments", icon: Link2, badge: txns.length },
    { id: "landlords", label: "Landlords", icon: Building2, badge: pending },
    { id: "settings", label: "Settings", icon: Settings, mobileMore: true },
  ];

  useEffect(() => {
    setTxns((current) =>
      current.filter(
        (transaction) =>
          !rentData.ledger.some((entry) => entry.reference === transaction.reference),
      ),
    );
  }, [rentData.ledger]);

  const applyVerification = (l: Landlord, action: "approve" | "suspend") => {
    setLandlords((list) =>
      list.map((x) =>
        x.id === l.id ? { ...x, verification: action === "approve" ? "Verified" : "Suspended" } : x,
      ),
    );
    toast.success(action === "approve" ? "Landlord verified" : "Account suspended", {
      description:
        action === "approve"
          ? `${l.name} can now collect rent.`
          : `${l.name} can no longer collect rent until reinstated.`,
    });
  };

  const updateSubscriptionPlan = (id: string, plan: SubscriptionPlan) => {
    setLandlords((list) =>
      list.map((landlord) =>
        landlord.id === id ? { ...landlord, subscriptionPlan: plan } : landlord,
      ),
    );
  };

  const recordSubscriptionPayment = (landlord: Landlord) => {
    const tenants = landlord.tenants ?? 0;
    const plan = landlord.subscriptionPlan ?? "monthly";
    const amount = tenants * SUBSCRIPTION_RATE_PER_TENANT_MONTH * subscriptionMonths[plan];
    if (!amount) {
      toast.error("There are no registered tenants to bill for this subscription.");
      return;
    }
    const paidAt = new Intl.DateTimeFormat("en-UG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date());
    setLandlords((list) =>
      list.map((current) =>
        current.id === landlord.id
          ? {
              ...current,
              subscriptionPaidAmount: (current.subscriptionPaidAmount ?? 0) + amount,
              subscriptionPaidAt: paidAt,
            }
          : current,
      ),
    );
    toast.success("Subscription payment recorded", {
      description: `${formatUGX(amount)} for ${subscriptionPlanLabel(plan)}.`,
    });
  };

  return (
    <DashShell
      current="/admin"
      nav={nav}
      view={view}
      onView={setView}
      account={{ name: "Ops Team", role: "Platform administrator" }}
    >
      {view === "overview" && (
        <AdminOverview
          landlords={landlords}
          txns={txns}
          rentSummary={rentSummary}
          onOpen={setView}
        />
      )}
      {view === "operations" && (
        <PaymentOperations units={rentData.units} ledger={rentData.ledger} />
      )}
      {view === "payments" && <UnmatchedPayments txns={txns} onMatch={setMatching} />}
      {view === "landlords" && (
        <LandlordList
          landlords={landlords}
          onCreate={() => setCreateOpen(true)}
          onAction={(landlord, action) => setConfirm({ landlord, action })}
          onPlanChange={updateSubscriptionPlan}
          onRecordPayment={recordSubscriptionPayment}
        />
      )}
      {view === "settings" && (
        <section className="surface min-h-[18rem] p-6 sm:p-8">
          <p className="text-eyebrow text-primary">Platform</p>
          <h1 className="mt-3 text-3xl font-bold text-primary-deep">Admin settings</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Platform preferences, access controls and notification settings will be managed here.
          </p>
        </section>
      )}
      <CreateLandlordDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(account) => {
          setLandlords((list) => [
            {
              ...account,
              id: `ll-${Date.now()}`,
              joined: "Nov 2026",
              verification: "Pending review",
            },
            ...list,
          ]);
        }}
      />

      <MatchDialog
        txn={matching}
        units={rentData.units}
        onClose={() => setMatching(null)}
        onMatched={(transaction, unit) => {
          const now = new Date();
          const period = currentRentPeriod(now);
          const monthsCovered =
            unit.rent > 0 &&
            transaction.amount >= unit.rent * 2 &&
            transaction.amount % unit.rent === 0
              ? transaction.amount / unit.rent
              : 1;
          const rentPeriod = getNextUncoveredRentPeriod(unit, rentData.ledger, period);
          const entry: LedgerEntry = {
            id: `matched-${transaction.id}`,
            date: new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short" }).format(now),
            receivedAt: localDateIso(now),
            tenant: unit.tenant ?? transaction.sender,
            unitId: unit.id,
            unit: unit.unit,
            amount: transaction.amount,
            method: transaction.network,
            reference: transaction.reference,
            status: "Confirmed",
            rentPeriod,
            monthsCovered,
            coverageAmounts:
              monthsCovered > 1
                ? Array.from({ length: monthsCovered }, () => unit.rent)
                : undefined,
          };
          const notification: TenantNotification = {
            id: `payment-${entry.id}`,
            unit: unit.unit,
            kind: monthsCovered > 1 ? "advance" : "payment",
            title: monthsCovered > 1 ? "Advance rent payment matched" : "Rent payment matched",
            message: `${formatUGX(entry.amount)} was matched to ${unit.property}, ${unit.unit} for ${formatRentPeriodRange(rentPeriod, monthsCovered)}.`,
            createdAt: now.toISOString(),
            read: false,
          };
          setRentData((current) => ({
            ...current,
            ledger: [entry, ...current.ledger.filter((item) => item.reference !== entry.reference)],
            notifications: [notification, ...current.notifications],
          }));
          setTxns((list) => list.filter((x) => x.id !== transaction.id));
          setMatching(null);
          toast.success("Payment matched", {
            description: `${formatUGX(transaction.amount)} recorded against ${unit.unit}, ${unit.property}.`,
          });
        }}
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-lg bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "approve" ? "Verify this landlord?" : "Suspend this account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "approve"
                ? `${confirm?.landlord.name} will be able to add tenants and collect rent through Propatiz.`
                : `${confirm?.landlord.name} will not be able to collect rent. Their tenants will see a notice to pay their landlord directly.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "h-12 rounded-full",
                confirm?.action === "suspend"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive-ink"
                  : "",
              )}
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
  {
    name: "MTN Mobile Money",
    status: "Operational",
    tone: "success",
    note: "Payments confirming in under a minute",
  },
  {
    name: "Airtel Money",
    status: "Slow",
    tone: "warning",
    note: "Some confirmations taking up to 5 minutes",
  },
  { name: "SMS reminders", status: "Operational", tone: "success", note: "Delivering normally" },
];

function AdminOverview({
  landlords,
  txns,
  rentSummary,
  onOpen,
}: {
  landlords: Landlord[];
  txns: UnmatchedTxn[];
  rentSummary: ReturnType<typeof summarizeRentPeriod>;
  onOpen: (v: View) => void;
}) {
  const totalUnits = landlords.reduce((s, l) => s + l.units, 0);
  const totalTenants = landlords.reduce((s, l) => s + (l.tenants ?? 0), 0);
  const totalCollected = rentSummary.collectedThisMonth;
  const totalSubscriptionPaid = landlords.reduce(
    (total, landlord) => total + (landlord.subscriptionPaidAmount ?? 0),
    0,
  );
  const metrics: {
    label: string;
    value: number;
    sub: string;
    format?: boolean;
    image?: string;
    surface?: string;
  }[] = [
    {
      label: "Landlord accounts",
      value: landlords.length,
      sub: `${landlords.filter((l) => l.verification === "Verified").length} verified`,
      surface: "bg-primary-soft",
    },
    {
      label: "Rental spaces on platform",
      value: totalUnits,
      sub: `Across ${landlords.reduce((s, l) => s + l.properties, 0)} properties`,
      image: listingHomes,
    },
    {
      label: "Active tenants",
      value: totalTenants,
      sub: "Across registered portfolios",
      surface: "bg-accent-soft",
    },
    {
      label: "Subscription run rate / month",
      value: totalTenants * SUBSCRIPTION_RATE_PER_TENANT_MONTH,
      sub: `${formatUGX(SUBSCRIPTION_RATE_PER_TENANT_MONTH)} per tenant`,
      format: true,
      surface: "bg-secondary",
    },
    {
      label: "Subscriptions paid",
      value: totalSubscriptionPaid,
      sub: "Total payments recorded",
      format: true,
      surface: "bg-success-soft",
    },
    {
      label: "Cash received this month",
      value: totalCollected,
      sub: formatUGX(totalCollected),
      format: true,
      image: heroKampala,
    },
    {
      label: "Rent expected after advances",
      value: rentSummary.expectedAfterAdvances,
      sub: `${rentSummary.advanceTenants} tenants paying ahead · demo portfolio`,
      format: true,
      surface: "bg-primary-soft",
    },
    {
      label: "Rent already covered",
      value: rentSummary.advanceCovered,
      sub: `${formatUGX(rentSummary.advanceCovered)} covered by advance rent`,
      format: true,
      image: listingHomes,
    },
    {
      label: "Unmatched payments",
      value: txns.length,
      sub: txns.length ? formatUGX(txns.reduce((s, t) => s + t.amount, 0)) : "All matched",
      surface: "bg-warning-soft",
    },
  ];
  return (
    <>
      <PageHeading eyebrow="Monday, 16 November 2026" title="Platform overview">
        <SampleTag className="self-center" />
      </PageHeading>
      <p className="mb-4 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-ink">
        Private operations view · illustrative demo figures. Real tenant and collection data
        requires server-side administrator access controls.
      </p>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m, i) => (
          <Reveal key={m.label} delay={0.08 * i} className="min-h-32">
            <SpotlightCard
              image={m.image}
              dark={!!m.image}
              className={cn(
                "h-full border p-6 shadow-soft",
                m.image ? "rounded-2xl border-border bg-card" : "rounded-xl",
                m.surface,
              )}
            >
              <p
                className={cn(
                  "text-sm font-semibold",
                  m.image ? "text-on-deep-muted" : "text-muted-foreground",
                )}
              >
                {m.label}
              </p>
              <p
                className={cn(
                  "figure mt-2 text-3xl font-bold",
                  m.image ? "text-on-deep" : "text-primary-deep",
                )}
              >
                <CountUp
                  value={m.value}
                  {...(m.format ? { format: (value: number) => formatUGX(value) } : {})}
                />
              </p>
              <p
                className={cn(
                  "mt-1 text-sm",
                  m.image ? "text-on-deep-muted" : "text-muted-foreground",
                )}
              >
                {m.sub}
              </p>
            </SpotlightCard>
          </Reveal>
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
              <button
                onClick={() => onOpen("payments")}
                className="press flex min-h-16 w-full items-center gap-3 rounded-lg bg-warning-soft px-4 text-left"
              >
                <Link2 className="size-5 text-warning-ink" aria-hidden />
                <span className="flex-1 font-semibold text-warning-ink">
                  {txns.length} {txns.length === 1 ? "payment needs" : "payments need"} matching
                </span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpen("operations")}
                className="press flex min-h-16 w-full items-center gap-3 rounded-lg bg-secondary px-4 text-left"
              >
                <ClipboardCheck className="size-5 text-primary-deep" aria-hidden />
                <span className="flex-1 font-semibold text-primary-deep">
                  Review collections, advances and payment exceptions
                </span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpen("landlords")}
                className="press flex min-h-16 w-full items-center gap-3 rounded-lg bg-primary-soft px-4 text-left"
              >
                <ShieldCheck className="size-5 text-primary-deep" aria-hidden />
                <span className="flex-1 font-semibold text-primary-deep">
                  {landlords.filter((l) => l.verification === "Pending review").length} landlords
                  waiting for review
                </span>
              </button>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}

type OperationsFilter = "all" | "attention" | "advance";

function PaymentOperations({ units, ledger }: { units: Unit[]; ledger: LedgerEntry[] }) {
  const [filter, setFilter] = useState<OperationsFilter>("all");
  const [query, setQuery] = useState("");
  const period = currentRentPeriod();
  const summary = summarizeRentPeriod(units, ledger, period);
  const visible = ledger.filter((entry) => {
    const unit = units.find((item) => item.id === entry.unitId);
    const matchesFilter =
      filter === "all" ||
      (filter === "attention" && entry.status !== "Confirmed") ||
      (filter === "advance" && entry.monthsCovered > 1);
    const matchesQuery = [entry.tenant, entry.unit, entry.reference, unit?.property ?? ""].some(
      (value) => value.toLowerCase().includes(query.trim().toLowerCase()),
    );
    return matchesFilter && matchesQuery;
  });
  const pending = ledger.filter((entry) => entry.status === "Pending").length;
  const failed = ledger.filter((entry) => entry.status === "Failed").length;

  function exportOperations() {
    downloadCsv("propatiz-payment-operations.csv", [
      [
        "Received",
        "Tenant",
        "Property",
        "Unit",
        "Coverage",
        "Months",
        "Amount (UGX)",
        "Method",
        "Reference",
        "Status",
      ],
      ...visible.map((entry) => [
        entry.receivedAt,
        entry.tenant,
        units.find((unit) => unit.id === entry.unitId)?.property ?? "",
        entry.unit,
        formatRentPeriodRange(entry.rentPeriod, entry.monthsCovered),
        entry.monthsCovered,
        entry.amount,
        entry.method,
        entry.reference,
        entry.status,
      ]),
    ]);
    toast.success("Payment operations exported", {
      description: `${visible.length} payment records included.`,
    });
  }

  return (
    <>
      <PageHeading
        eyebrow="One audit trail for collections, advance coverage and payment exceptions"
        title="Payment operations"
      >
        <SampleTag className="self-center" />
        <Button onClick={exportOperations} disabled={visible.length === 0}>
          <Download /> Export view
        </Button>
      </PageHeading>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Payment controls">
        <OperationsMetric
          label="Confirmed cash this month"
          value={formatUGX(summary.collectedThisMonth)}
        />
        <OperationsMetric
          label="Expected after advances"
          value={formatUGX(summary.expectedAfterAdvances)}
        />
        <OperationsMetric
          label="Advance payments"
          value={`${summary.advanceTenants} tenants · ${formatUGX(summary.advanceCovered)}`}
        />
        <OperationsMetric
          label="Payment exceptions"
          value={`${pending} pending · ${failed} failed · ${summary.overdueTenants} overdue`}
        />
      </section>

      <section className="surface mt-5 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">Payment audit trail</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirmed, pending and failed payments remain visible with their rent coverage.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="operations-filter">
              Filter payments
            </label>
            <select
              id="operations-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value as OperationsFilter)}
              className="h-11 rounded-lg border border-input bg-card px-3 text-sm font-semibold"
            >
              <option value="all">All payments</option>
              <option value="attention">Pending and failed</option>
              <option value="advance">Advance payments</option>
            </select>
            <label className="sr-only" htmlFor="operations-search">
              Search payments
            </label>
            <input
              id="operations-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tenant, unit or reference"
              className="h-11 rounded-lg border border-input bg-card px-3 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Received</th>
                <th className="px-5 py-3">Tenant / unit</th>
                <th className="px-5 py-3">Coverage</th>
                <th className="px-5 py-3">Method / reference</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-5 py-4 text-muted-foreground">{entry.receivedAt}</td>
                  <td className="px-5 py-4">
                    <span className="font-semibold">{entry.tenant}</span>
                    <span className="block text-xs text-muted-foreground">
                      {units.find((unit) => unit.id === entry.unitId)?.property ?? ""} ·{" "}
                      {entry.unit}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {formatRentPeriodRange(entry.rentPeriod, entry.monthsCovered)}
                    {entry.monthsCovered > 1 && (
                      <Pill tone="info" label={`${entry.monthsCovered} months`} className="ml-2" />
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {entry.method}
                    <span className="figure block text-xs text-muted-foreground">
                      {entry.reference}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Pill
                      tone={
                        entry.status === "Confirmed"
                          ? "success"
                          : entry.status === "Pending"
                            ? "warning"
                            : "danger"
                      }
                      label={entry.status}
                    />
                  </td>
                  <td className="figure px-5 py-4 text-right font-bold">
                    {formatUGX(entry.amount)}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No payments match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function OperationsMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="figure mt-2 text-lg font-bold text-primary-deep">{value}</p>
    </div>
  );
}

function UnmatchedPayments({
  txns,
  onMatch,
}: {
  txns: UnmatchedTxn[];
  onMatch: (t: UnmatchedTxn) => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="Mobile money received without a clear unit reference"
        title="Unmatched payments"
      />
      {txns.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="surface flex flex-col items-center px-6 py-16 text-center"
        >
          <BadgeCheck className="size-10 text-success" aria-hidden />
          <p className="mt-4 text-lg font-bold">Every payment is matched</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New unmatched payments will appear here.
          </p>
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

function MatchDialog({
  txn,
  units,
  onClose,
  onMatched,
}: {
  txn: UnmatchedTxn | null;
  units: Unit[];
  onClose: () => void;
  onMatched: (t: UnmatchedTxn, unit: Unit) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const occupied = units.filter((u) => u.tenant);
  // Suggest units whose tenant phone matches the sender, then units with matching rent.
  const ranked = txn ? [...occupied].sort((a, b) => score(b, txn) - score(a, txn)).slice(0, 5) : [];

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
            {txn &&
              `${formatUGX(txn.amount)} from ${txn.sender} (${txn.phone}). Choose the unit this payment is for.`}
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
                    selected === u.id
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:bg-secondary",
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
                onMatched(txn, u);
              }, 700);
            }}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" /> Matching
              </>
            ) : (
              "Confirm match"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function score(u: Unit, t: UnmatchedTxn) {
  let s = 0;
  if (u.phone.replace(/\s/g, "") === t.phone.replace(/\s/g, "")) s += 2;
  if (u.rent === t.amount) s += 1;
  return s;
}

function LandlordList({
  landlords,
  onCreate,
  onAction,
  onPlanChange,
  onRecordPayment,
}: {
  landlords: Landlord[];
  onCreate: () => void;
  onAction: (l: Landlord, a: "approve" | "suspend") => void;
  onPlanChange: (id: string, plan: SubscriptionPlan) => void;
  onRecordPayment: (landlord: Landlord) => void;
}) {
  const monthlyExpected = landlords.reduce(
    (total, landlord) => total + (landlord.tenants ?? 0) * SUBSCRIPTION_RATE_PER_TENANT_MONTH,
    0,
  );
  const totalPaid = landlords.reduce(
    (total, landlord) => total + (landlord.subscriptionPaidAmount ?? 0),
    0,
  );
  const propertyMix = landlords.reduce<Record<PropertyType, number>>(
    (totals, landlord) => {
      const propertyType = landlord.propertyType ?? "apartment";
      totals[propertyType] += 1;
      return totals;
    },
    {
      apartment: 0,
      "rental-units": 0,
      "standalone-house": 0,
      shop: 0,
      office: 0,
      "mixed-use": 0,
    },
  );
  return (
    <>
      <PageHeading eyebrow="Private account and portfolio records" title="Landlords">
        <Button onClick={onCreate}>
          <Users /> Create landlord
        </Button>
      </PageHeading>
      <section className="mb-4 grid gap-3 sm:grid-cols-2" aria-label="Subscription totals">
        <div className="rounded-xl border border-primary/15 bg-primary-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-deep">
            Expected monthly subscription
          </p>
          <p className="figure mt-1 text-xl font-bold text-primary-deep">
            {formatUGX(monthlyExpected)}
          </p>
          <p className="mt-1 text-xs text-primary-deep/80">
            {formatUGX(SUBSCRIPTION_RATE_PER_TENANT_MONTH)} × active tenant
          </p>
        </div>
        <div className="rounded-xl border border-success/20 bg-success-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-success-ink">
            Subscription payments recorded
          </p>
          <p className="figure mt-1 text-xl font-bold text-success-ink">{formatUGX(totalPaid)}</p>
          <p className="mt-1 text-xs text-success-ink/80">
            Total recorded across landlord accounts
          </p>
        </div>
      </section>
      <section
        className="mb-5 rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5"
        aria-label="Property portfolio mix"
      >
        <h2 className="text-sm font-bold text-primary-deep">
          Landlord portfolios by primary property type
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {Object.entries(PROPERTY_TYPE_LABELS).map(([type, label]) => (
            <li key={type} className="rounded-lg bg-secondary/60 px-3 py-2 text-sm">
              <span className="block text-xs text-muted-foreground">{label}</span>
              <span className="figure mt-0.5 block font-bold">
                {propertyMix[type as PropertyType]}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <ul className="space-y-3 md:hidden">
        {landlords.map((landlord) => (
          <li key={landlord.id}>
            <article className="surface min-w-0 space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-bold">{landlord.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{landlord.contact}</p>
                  {landlord.phone && (
                    <a
                      href={`tel:${landlord.phone}`}
                      className="mt-0.5 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {landlord.phone}
                    </a>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {landlord.propertyName ?? `${landlord.properties} properties`}
                    <span className="mt-0.5 block text-xs font-medium text-primary">
                      {PROPERTY_TYPE_LABELS[landlord.propertyType ?? "apartment"]}
                    </span>
                  </p>
                </div>
                <Pill
                  tone={verificationTone[landlord.verification]}
                  label={landlord.verification}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-secondary/60 p-3 text-sm">
                <Metric label="Units" value={landlord.units} />
                <Metric label="Tenants" value={landlord.tenants ?? 0} />
                <Metric label="Collected" value={formatUGX(landlord.collected ?? 0)} />
                <Metric
                  label="Expected monthly"
                  value={
                    landlord.expectedMonthlyRent ? formatUGX(landlord.expectedMonthlyRent) : "—"
                  }
                />
              </div>
              {landlord.blocks?.length ? (
                <div className="space-y-2">
                  {landlord.blocks.map((block) => (
                    <div key={block.name} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-semibold">{block.name}</p>
                      <ul className="mt-2 space-y-2">
                        {block.units.map((unit) => {
                          const rent = landlord.unitRents?.find(
                            (configured) =>
                              configured.block === block.name && configured.unit === unit,
                          )?.monthlyRent;
                          const detail = landlord.unitDetails?.find(
                            (configured) =>
                              configured.block === block.name && configured.unit === unit,
                          );
                          return (
                            <li key={unit} className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {unit}
                                {rent ? ` · ${formatUGX(rent)}` : ""}
                                {detail
                                  ? detail.bedrooms || detail.bathrooms
                                    ? ` · ${detail.bedrooms} bed / ${detail.bathrooms} bath`
                                    : ""
                                  : ""}
                              </span>
                              {detail?.details && <span className="block">{detail.details}</span>}
                              {detail?.electricityMeter && (
                                <span className="block">
                                  Electricity / Yaka: {detail.electricityMeter}
                                </span>
                              )}
                              {detail?.waterMeter && (
                                <span className="block">Water meter: {detail.waterMeter}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
              <PaymentAccounts details={landlord.paymentDetails} />
              <SubscriptionPanel
                landlord={landlord}
                onPlanChange={onPlanChange}
                onRecordPayment={onRecordPayment}
              />
              <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Joined {landlord.joined}</p>
                <LandlordAction
                  landlord={landlord}
                  onAction={(action) => onAction(landlord, action)}
                />
              </div>
            </article>
          </li>
        ))}
      </ul>
      <div className="surface hidden overflow-x-auto md:block">
        <table className="w-full min-w-[74rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-semibold">Account</th>
              <th className="px-6 py-3 font-semibold">Property / buildings</th>
              <th className="px-6 py-3 text-right font-semibold">Units</th>
              <th className="px-6 py-3 text-right font-semibold">Tenants</th>
              <th className="px-6 py-3 text-right font-semibold">Collected</th>
              <th className="px-6 py-3 text-right font-semibold">Expected monthly</th>
              <th className="px-6 py-3 font-semibold">Subscription</th>
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
                  {l.phone && (
                    <a
                      href={`tel:${l.phone}`}
                      className="mt-0.5 block text-xs text-primary underline-offset-4 hover:underline"
                    >
                      {l.phone}
                    </a>
                  )}
                  {l.paymentDetails?.mobileMoneyNumber && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      MoMo: {l.paymentDetails.mobileMoneyNumber}
                    </span>
                  )}
                  {l.paymentDetails?.bankAccountNumber && (
                    <span className="block text-xs text-muted-foreground">
                      Bank: {l.paymentDetails.bankAccountNumber}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span>
                    {l.propertyName ??
                      `${l.properties} registered ${l.properties === 1 ? "property" : "properties"}`}
                  </span>
                  <span className="block text-xs font-medium text-primary">
                    {PROPERTY_TYPE_LABELS[l.propertyType ?? "apartment"]}
                  </span>
                  {l.blocks?.map((block) => (
                    <span key={block.name} className="block text-xs text-muted-foreground">
                      {block.name}:{" "}
                      {block.units
                        .map((unit) => {
                          const rent = l.unitRents?.find(
                            (configured) =>
                              configured.block === block.name && configured.unit === unit,
                          )?.monthlyRent;
                          const detail = l.unitDetails?.find(
                            (configured) =>
                              configured.block === block.name && configured.unit === unit,
                          );
                          const features = detail
                            ? detail.bedrooms || detail.bathrooms
                              ? `${detail.bedrooms} bed / ${detail.bathrooms} bath`
                              : ""
                            : "";
                          const meters = [
                            detail?.electricityMeter ? `Yaka ${detail.electricityMeter}` : "",
                            detail?.waterMeter ? `Water ${detail.waterMeter}` : "",
                          ].filter(Boolean);
                          return [
                            unit,
                            rent ? formatUGX(rent) : "",
                            features,
                            detail?.details,
                            ...meters,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                        })
                        .join(", ")}
                    </span>
                  ))}
                </td>
                <td className="figure px-6 py-4 text-right">{l.units}</td>
                <td className="figure px-6 py-4 text-right">{l.tenants ?? 0}</td>
                <td className="figure px-6 py-4 text-right">{formatUGX(l.collected ?? 0)}</td>
                <td className="figure px-6 py-4 text-right">
                  {l.expectedMonthlyRent ? formatUGX(l.expectedMonthlyRent) : "—"}
                </td>
                <td className="min-w-52 px-6 py-4">
                  <SubscriptionPanel
                    landlord={l}
                    onPlanChange={onPlanChange}
                    onRecordPayment={onRecordPayment}
                    compact
                  />
                </td>
                <td className="px-6 py-4 text-muted-foreground">{l.joined}</td>
                <td className="px-6 py-4">
                  <Pill tone={verificationTone[l.verification]} label={l.verification} />
                </td>
                <td className="px-6 py-4 text-right">
                  <LandlordAction landlord={l} onAction={(action) => onAction(l, action)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="figure mt-0.5 break-words font-bold">{value}</p>
    </div>
  );
}

function LandlordAction({
  landlord,
  onAction,
}: {
  landlord: Landlord;
  onAction: (action: "approve" | "suspend") => void;
}) {
  return landlord.verification === "Verified" ? (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => onAction("suspend")}
      className="w-full text-destructive-ink sm:w-auto"
    >
      <Ban /> Suspend
    </Button>
  ) : (
    <Button
      size="sm"
      variant="outline"
      onClick={() => onAction("approve")}
      className="w-full sm:w-auto"
    >
      <BadgeCheck /> {landlord.verification === "Suspended" ? "Reinstate" : "Verify"}
    </Button>
  );
}

function subscriptionPlanLabel(plan: SubscriptionPlan) {
  if (plan === "quarterly") return "quarterly";
  if (plan === "yearly") return "yearly";
  return "monthly";
}

function SubscriptionPanel({
  landlord,
  onPlanChange,
  onRecordPayment,
  compact = false,
}: {
  landlord: Landlord;
  onPlanChange: (id: string, plan: SubscriptionPlan) => void;
  onRecordPayment: (landlord: Landlord) => void;
  compact?: boolean;
}) {
  const plan = landlord.subscriptionPlan ?? "monthly";
  const amount =
    (landlord.tenants ?? 0) * SUBSCRIPTION_RATE_PER_TENANT_MONTH * subscriptionMonths[plan];
  const paid = landlord.subscriptionPaidAmount ?? 0;
  return (
    <section
      className={cn(
        "rounded-xl border border-accent/30 bg-accent-soft/50 p-3",
        compact && "min-w-52",
      )}
      aria-label={`${landlord.name} subscription`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-warning-ink">Subscription</p>
        <span className="text-[0.6875rem] font-semibold text-muted-foreground">
          UGX {SUBSCRIPTION_RATE_PER_TENANT_MONTH}/tenant/month
        </span>
      </div>
      <label className="mt-2 block text-xs font-medium text-muted-foreground">
        Billing frequency
        <select
          aria-label={`Subscription frequency for ${landlord.name}`}
          value={plan}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "monthly" || value === "quarterly" || value === "yearly") {
              onPlanChange(landlord.id, value);
            }
          }}
          className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </label>
      <div className="mt-2 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Due this term</span>
        <span className="figure font-bold">{formatUGX(amount)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Paid to date</span>
        <span className="figure font-semibold">{formatUGX(paid)}</span>
      </div>
      {landlord.subscriptionPaidAt && (
        <p className="mt-1 text-right text-xs text-muted-foreground">
          Last payment {landlord.subscriptionPaidAt}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        className="mt-3 w-full bg-card"
        disabled={amount === 0}
        onClick={() => onRecordPayment(landlord)}
      >
        Record {formatUGX(amount)} payment
      </Button>
    </section>
  );
}

function PaymentAccounts({ details }: { details: Landlord["paymentDetails"] }) {
  if (!details) return null;
  const configured: string[] = [];
  if (details.mobileMoneyEnabled && details.mobileMoneyNumber) {
    configured.push(`Mobile money · ${details.mobileMoneyNumber}`);
  }
  if (details.bankEnabled && details.bankAccountNumber) {
    configured.push(
      `${details.bankName ?? "Bank"} · ${details.bankAccountName ?? ""} · ${details.bankAccountNumber}`,
    );
  }
  if (!configured.length) return null;
  return (
    <div className="rounded-lg border border-primary/15 bg-primary-soft/40 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-primary-deep">
        Tenant payment details
      </p>
      <ul className="mt-2 space-y-1">
        {configured.map((method) => (
          <li key={method} className="break-words text-sm text-muted-foreground">
            {method}
          </li>
        ))}
      </ul>
    </div>
  );
}
