import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronRight,
  Home as HomeIcon,
  House,
  Receipt,
  Search,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AppSheet } from "@/components/tenant/AppSheet";
import { PayFlow, type PaymentResult } from "@/components/tenant/PayFlow";
import { ReportFlow, type ReportInput } from "@/components/tenant/ReportFlow";
import { SwipeDeck } from "@/components/tenant/SwipeDeck";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { RentRing } from "@/components/shared/RentRing";
import { Pill, RentStatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUGX, getRentStatus } from "@/lib/rent";
import { ease } from "@/lib/motion";
import {
  listings,
  maintenanceRequests,
  stageLabel,
  stageOrder,
  tenantPayments,
  tenantProfile,
  type Listing,
  type MaintenanceRequest,
  type Payment,
} from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export type TenantTask = "pay" | "report" | "home";
type Tab = "home" | "payments" | "repairs" | "homes";

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "payments", label: "Payments", icon: Receipt },
  { id: "repairs", label: "Repairs", icon: Wrench },
  { id: "homes", label: "Find a home", icon: Search },
];

// Simulates the first network request so the loading state is visible.
async function fetchTenantHome() {
  await new Promise((r) => setTimeout(r, 1100));
  return { profile: tenantProfile };
}

export function TenantApp({ onTaskDone }: { onTaskDone?: (t: TenantTask) => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [dir, setDir] = useState(1);
  const [paid, setPaid] = useState(false);
  const [payments, setPayments] = useState<Payment[]>(tenantPayments);
  const [requests, setRequests] = useState<MaintenanceRequest[]>(maintenanceRequests.filter((m) => m.unit === "B4"));
  const [sheet, setSheet] = useState<"pay" | "report" | null>(null);

  const go = (next: Tab) => {
    setDir(tabs.findIndex((t) => t.id === next) > tabs.findIndex((t) => t.id === tab) ? 1 : -1);
    setTab(next);
  };

  const handlePaid = useCallback(
    (r: PaymentResult) => {
      setPaid(true);
      setPayments((p) => [
        { id: r.reference, month: "November 2026", amount: r.amount, method: r.method as Payment["method"], date: "16 Nov 2026", reference: r.reference },
        ...p,
      ]);
      onTaskDone?.("pay");
    },
    [onTaskDone],
  );

  const handleReport = useCallback(
    (r: ReportInput) => {
      setRequests((list) => [
        {
          id: `m-${Date.now()}`,
          title: r.description.length > 42 ? r.description.slice(0, 40) + "…" : r.description,
          category: r.category,
          unit: tenantProfile.unit.replace("Unit ", ""),
          property: tenantProfile.property,
          tenant: tenantProfile.name,
          urgency: r.urgency,
          stage: "submitted",
          reported: "Today",
          description: r.description,
        },
        ...list,
      ]);
      onTaskDone?.("report");
    },
    [onTaskDone],
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      <OfflineBanner />
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={tab}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: `${d * 18}%`, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: `${d * -18}%`, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.38, ease: ease.outExpo }}
            className="absolute inset-0 overflow-y-auto overscroll-contain"
          >
            {tab === "home" && (
              <HomeTab
                paid={paid}
                lastPayment={payments[0]}
                request={requests[0]}
                onPay={() => setSheet("pay")}
                onReport={() => setSheet("report")}
                onFindHome={() => go("homes")}
                onOpenPayments={() => go("payments")}
                onOpenRepairs={() => go("repairs")}
              />
            )}
            {tab === "payments" && <PaymentsTab payments={payments} paid={paid} onPay={() => setSheet("pay")} />}
            {tab === "repairs" && <RepairsTab requests={requests} onReport={() => setSheet("report")} />}
            {tab === "homes" && <HomesTab onInterested={() => onTaskDone?.("home")} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="relative z-20 grid grid-cols-4 border-t border-border bg-card px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5" aria-label="Tenant app">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[0.6875rem] font-semibold transition-colors",
                active ? "text-primary-deep" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="tenant-tab"
                  className="absolute inset-x-3 top-0.5 h-8 rounded-full bg-primary-soft"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative mt-1 size-5" aria-hidden />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <AppSheet open={sheet === "pay"} onClose={() => setSheet(null)} title="Pay November rent">
        <PayFlow rent={tenantProfile.rent} defaultPhone={tenantProfile.phone} onPaid={handlePaid} onClose={() => setSheet(null)} />
      </AppSheet>
      <AppSheet open={sheet === "report"} onClose={() => setSheet(null)} title="Report a problem">
        <ReportFlow onSubmitted={handleReport} onClose={() => setSheet(null)} />
      </AppSheet>
    </div>
  );
}

/* --------------------------------- Home tab -------------------------------- */

function HomeTab({
  paid,
  lastPayment,
  request,
  onPay,
  onReport,
  onFindHome,
  onOpenPayments,
  onOpenRepairs,
}: {
  paid: boolean;
  lastPayment?: Payment | undefined;
  request?: MaintenanceRequest | undefined;
  onPay: () => void;
  onReport: () => void;
  onFindHome: () => void;
  onOpenPayments: () => void;
  onOpenRepairs: () => void;
}) {
  const { data, isPending } = useQuery({ queryKey: ["tenant-home"], queryFn: fetchTenantHome, staleTime: Infinity });
  const status = getRentStatus(tenantProfile.daysUntilDue, paid);

  if (isPending || !data) return <HomeSkeleton />;

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: ease.outExpo, delay: 0.06 * i },
  });

  return (
    <div className="space-y-6 px-5 pb-8 pt-6">
      <motion.header {...stagger(0)} className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {tenantProfile.unit}, {tenantProfile.property}
          </p>
          <h1 className="text-2xl font-bold">Hello, {data.profile.firstName}</h1>
        </div>
        <button
          onClick={() => toast("No new notifications", { description: "We will let you know when your landlord replies." })}
          className="relative grid size-12 place-items-center rounded-full bg-card shadow-soft"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
        </button>
      </motion.header>

      <motion.section {...stagger(1)} className="deep-panel overflow-hidden rounded-2xl p-5" aria-label="November rent">
        <div className="flex items-center gap-5">
          <RentRing
            daysLeft={tenantProfile.daysUntilDue}
            cycleDays={tenantProfile.cycleDays}
            status={status}
            size={100}
            stroke={10}
            trackClassName="stroke-on-deep/15"
            immediate
          >
            <AnimatePresence mode="wait" initial={false}>
              {paid ? (
                <motion.span key="paid" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-sm font-bold text-on-deep">
                  Paid
                </motion.span>
              ) : (
                <motion.span key="days" exit={{ opacity: 0 }} className="leading-none">
                  <span className="figure block text-3xl font-bold text-on-deep">{tenantProfile.daysUntilDue}</span>
                  <span className="text-xs text-on-deep-muted">days left</span>
                </motion.span>
              )}
            </AnimatePresence>
          </RentRing>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-on-deep-muted">November rent</p>
            <p className="figure mt-0.5 whitespace-nowrap text-xl font-bold text-on-deep">{formatUGX(tenantProfile.rent)}</p>
            <p className="mt-1 text-sm text-on-deep-muted">{paid ? `Receipt ${lastPayment?.reference}` : "Due Sat, 21 Nov"}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <RentStatusPill status={status} />
          {paid ? (
            <Button variant="onDeepOutline" size="sm" onClick={onOpenPayments}>
              View receipt
            </Button>
          ) : (
            <Button variant="accent" onClick={onPay}>
              Pay rent
            </Button>
          )}
        </div>
      </motion.section>

      <motion.section {...stagger(2)} className="grid grid-cols-2 gap-3" aria-label="Quick actions">
        <QuickAction icon={Wrench} label="Report a problem" onClick={onReport} />
        <QuickAction icon={House} label="Find a home" onClick={onFindHome} />
      </motion.section>

      {request && (
        <motion.section {...stagger(3)}>
          <SectionHeader title="Repair in progress" action="All repairs" onAction={onOpenRepairs} />
          <RequestCard request={request} />
        </motion.section>
      )}

      <motion.section {...stagger(4)}>
        <SectionHeader title="Last payment" action="History" onAction={onOpenPayments} />
        {lastPayment && <PaymentRow payment={lastPayment} />}
      </motion.section>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-6 px-5 pt-6" aria-busy="true" aria-label="Loading your home">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="size-12 rounded-full" />
      </div>
      <Skeleton className="h-52 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="surface press flex min-h-24 flex-col justify-between p-4 text-left">
      <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-warning-ink">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold">{title}</h2>
      {action && (
        <button onClick={onAction} className="flex min-h-11 items-center gap-0.5 px-1 text-sm font-semibold text-primary">
          {action}
          <ChevronRight className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <div className="surface flex items-center gap-3 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-success-ink">
        <Receipt className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{payment.month}</p>
        <p className="text-sm text-muted-foreground">
          {payment.method} · {payment.date}
        </p>
      </div>
      <p className="figure text-right font-bold">{formatUGX(payment.amount)}</p>
    </div>
  );
}

function StageTracker({ stage }: { stage: MaintenanceRequest["stage"] }) {
  const idx = stageOrder.indexOf(stage);
  return (
    <div>
      <div className="relative mt-4 flex justify-between">
        <div className="absolute inset-x-2 top-1.5 h-0.5 bg-muted" aria-hidden />
        <motion.div
          className="absolute left-2 top-1.5 h-0.5 origin-left bg-primary"
          style={{ right: "0.5rem" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: idx / (stageOrder.length - 1) }}
          transition={{ duration: 0.8, ease: ease.outExpo, delay: 0.2 }}
          aria-hidden
        />
        {stageOrder.map((s, i) => (
          <div key={s} className="relative flex flex-col items-center gap-2">
            <motion.span
              className={cn("size-3.5 rounded-full border-2", i <= idx ? "border-primary bg-primary" : "border-input bg-card")}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + i * 0.12, type: "spring", stiffness: 400, damping: 20 }}
            />
            <span className={cn("text-[0.6875rem] font-medium", i <= idx ? "text-foreground" : "text-muted-foreground")}>{stageLabel[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestCard({ request }: { request: MaintenanceRequest }) {
  const tone = request.stage === "resolved" ? "success" : request.stage === "submitted" ? "neutral" : "info";
  return (
    <div className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{request.title}</p>
          <p className="text-sm text-muted-foreground">
            {request.category} · Reported {request.reported}
          </p>
        </div>
        <Pill tone={tone} label={stageLabel[request.stage]} />
      </div>
      <StageTracker stage={request.stage} />
    </div>
  );
}

/* ------------------------------- Payments tab ------------------------------ */

function PaymentsTab({ payments, paid, onPay }: { payments: Payment[]; paid: boolean; onPay: () => void }) {
  const total = payments.reduce((s, p) => s + p.amount, 0);
  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <div className="surface mt-5 flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">Balance due</p>
          <p className="figure mt-1 text-2xl font-bold">{paid ? "UGX 0" : formatUGX(tenantProfile.rent)}</p>
        </div>
        {paid ? <RentStatusPill status="paid" /> : <Button onClick={onPay}>Pay now</Button>}
      </div>
      <h2 className="mb-3 mt-8 flex items-baseline justify-between text-base font-bold">
        Receipts
        <span className="figure text-sm font-medium text-muted-foreground">{formatUGX(total)} paid in 2026</span>
      </h2>
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {payments.map((p, i) => (
            <motion.li key={p.id} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.4, ease: ease.outExpo }}>
              <PaymentRow payment={p} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* -------------------------------- Repairs tab ------------------------------ */

function RepairsTab({ requests, onReport }: { requests: MaintenanceRequest[]; onReport: () => void }) {
  return (
    <div className="px-5 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Repairs</h1>
        <Button size="sm" onClick={onReport}>
          <Wrench /> Report
        </Button>
      </div>
      {requests.length === 0 ? (
        <div className="mt-10 rounded-lg border-2 border-dashed border-input p-8 text-center">
          <p className="font-semibold">No repair requests</p>
          <p className="mt-1 text-sm text-muted-foreground">When something needs fixing, report it here.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          <AnimatePresence initial={false}>
            {requests.map((r) => (
              <motion.li key={r.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: ease.outExpo }}>
                <RequestCard request={r} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

/* --------------------------------- Homes tab ------------------------------- */

const areas = ["All areas", "Kololo", "Ntinda", "Kira", "Naalya"];
const budgets = [
  { label: "Any budget", max: Infinity },
  { label: "Up to 1M", max: 1_000_000 },
  { label: "Up to 1.5M", max: 1_500_000 },
];

function HomesTab({ onInterested }: { onInterested: () => void }) {
  const [area, setArea] = useState(areas[0]);
  const [budget, setBudget] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const [shortlist, setShortlist] = useState<{ item: Listing; requested: boolean }[]>([]);

  const matches = listings.filter(
    (l) => (area === areas[0] || l.area === area) && l.rent <= (budgets[budget]?.max ?? Infinity) && !seen.includes(l.id),
  );

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="text-2xl font-bold">Find a home</h1>
      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Area">
        {areas.map((a) => (
          <Chip key={a} active={area === a} onClick={() => setArea(a)}>
            {a}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex gap-2" role="group" aria-label="Budget">
        {budgets.map((b, i) => (
          <Chip key={b.label} active={budget === i} onClick={() => setBudget(i)}>
            {b.label}
          </Chip>
        ))}
      </div>

      <div className="mt-5">
        <SwipeDeck
          items={matches}
          onReset={() => {
            setSeen([]);
            setArea(areas[0]);
            setBudget(0);
          }}
          onDecide={(item, yes) => {
            setSeen((s) => [...s, item.id]);
            if (yes) setShortlist((s) => (s.some((x) => x.item.id === item.id) ? s : [{ item, requested: false }, ...s]));
          }}
        />
      </div>

      <AnimatePresence>
        {shortlist.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
            <h2 className="mb-3 text-base font-bold">Your shortlist</h2>
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {shortlist.map(({ item, requested }) => (
                  <motion.li key={item.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: ease.outExpo }} className="surface flex items-center gap-3 p-3">
                    <img src={item.image} alt="" className="size-16 shrink-0 rounded-sm object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.title}</p>
                      <p className="figure text-sm text-muted-foreground">
                        {item.area} · {formatUGX(item.rent)}
                      </p>
                    </div>
                    {requested ? (
                      <Pill tone="success" label="Requested" />
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setShortlist((s) => s.map((x) => (x.item.id === item.id ? { ...x, requested: true } : x)));
                          onInterested();
                          toast.success("Viewing requested", { description: `The landlord for ${item.title} in ${item.area} will contact you.` });
                        }}
                      >
                        Request viewing
                      </Button>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
