import { useQuery } from "@tanstack/react-query";
import { format, getDaysInMonth, parse } from "date-fns";
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  FileText,
  House,
  MessageSquare,
  MessageSquareText,
  MoreHorizontal,
  Receipt,
  Search,
  Settings,
  Sparkles,
  WalletCards,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSheet } from "@/components/tenant/AppSheet";
import { PayFlow, type PaymentResult } from "@/components/tenant/PayFlow";
import { ReportFlow, type ReportInput } from "@/components/tenant/ReportFlow";
import { SwipeDeck } from "@/components/tenant/SwipeDeck";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { CalendarView, type CalendarEvent } from "@/components/shared/CalendarView";
import { RentRing } from "@/components/shared/RentRing";
import { Pill, RentStatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { formatUGX, getRentStatus } from "@/lib/rent";
import {
  currentRentPeriod,
  formatRentPeriod,
  formatRentPeriodRange,
  getNextUncoveredRentPeriod,
  getUnitPeriodCredit,
  localDateIso,
} from "@/lib/rent-accounting";
import { useRentDemoData } from "@/lib/useRentDemoData";
import { ease } from "@/lib/motion";
import { printPdf } from "@/lib/documents";
import {
  listings,
  complaints as sampleComplaints,
  stageLabel,
  stageOrder,
  ledger as initialLedger,
  tenantPayments,
  tenantProfile,
  type LedgerEntry,
  type Listing,
  type Complaint,
  type Payment,
  type TenantNotification,
} from "@/lib/sample-data";
import { readTenantActive, readTenantNotice, type EvictionNotice } from "@/lib/tenant-demo";
import { cn } from "@/lib/utils";

export type TenantTask = "pay" | "report" | "home";
type Tab =
  | "home"
  | "payments"
  | "complaints"
  | "homes"
  | "calendar"
  | "notifications"
  | "services"
  | "settings";

const tabOrder: Tab[] = [
  "home",
  "payments",
  "complaints",
  "homes",
  "calendar",
  "notifications",
  "services",
  "settings",
];
const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "payments", label: "Payments", icon: WalletCards },
  { id: "complaints", label: "Repairs", icon: MessageSquareText },
  { id: "homes", label: "Homes", icon: Search },
];
const moreTabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "calendar", label: "Calendar", icon: CalendarRange },
  { id: "notifications", label: "Notifications", icon: BellRing },
  { id: "services", label: "Services", icon: Sparkles },
  { id: "settings", label: "Settings", icon: Settings },
];

// Simulates the first network request so the loading state is visible.
async function fetchTenantHome() {
  await new Promise((r) => setTimeout(r, 1100));
  return { profile: tenantProfile };
}

export function TenantApp({ onTaskDone }: { onTaskDone?: (t: TenantTask) => void }) {
  const { data: rentData, setData: setRentData, loaded: rentDataLoaded } = useRentDemoData();
  const [tab, setTab] = useState<Tab>("home");
  const moreActive = moreTabs.some((item) => item.id === tab);
  const [dir, setDir] = useState(1);
  const [paid, setPaid] = useState(false);
  const [requests, setRequests] = useState<Complaint[]>(
    sampleComplaints.filter((m) => m.unit === "B4"),
  );
  const [activeTenant, setActiveTenant] = useState(true);
  const [notice, setNotice] = useState<EvictionNotice | null>(null);
  const [sheet, setSheet] = useState<"pay" | "report" | "more" | null>(null);
  const tenantUnitLabel = tenantProfile.unit.replace("Unit ", "");
  const tenantUnit = useMemo(
    () => rentData.units.find((unit) => unit.unit === tenantUnitLabel) ?? null,
    [rentData.units, tenantUnitLabel],
  );
  const period = currentRentPeriod();
  const nextRentPeriod = tenantUnit
    ? getNextUncoveredRentPeriod(tenantUnit, rentData.ledger, period)
    : period;
  const nextRentBalance = tenantUnit
    ? Math.max(
        0,
        tenantUnit.rent - getUnitPeriodCredit(tenantUnit, rentData.ledger, nextRentPeriod),
      )
    : tenantProfile.rent;
  const payments = useMemo(() => {
    const savedPayments: Payment[] = rentData.ledger
      .filter((entry) => entry.unitId === tenantUnit?.id && entry.tenant === tenantProfile.name)
      .map((entry) => ({
        id: entry.id,
        month: formatRentPeriodRange(entry.rentPeriod, entry.monthsCovered),
        amount: entry.amount,
        method: entry.method,
        date: new Intl.DateTimeFormat("en-UG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(`${entry.receivedAt}T00:00:00`)),
        reference: entry.reference,
        status: entry.status,
        rentPeriod: entry.rentPeriod,
        monthsCovered: entry.monthsCovered,
        receivedAt: entry.receivedAt,
      }));
    return [...savedPayments, ...tenantPayments].sort(
      (a, b) =>
        new Date(b.receivedAt ?? b.date).getTime() - new Date(a.receivedAt ?? a.date).getTime(),
    );
  }, [rentData.ledger, tenantUnit?.id]);
  const notifications = rentData.notifications
    .filter((notification) => notification.unit === tenantUnitLabel)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;
  const rentBalance = Math.max(
    0,
    tenantProfile.rent -
      (tenantUnit ? getUnitPeriodCredit(tenantUnit, rentData.ledger, period) : 0),
  );

  useEffect(() => {
    if (!rentDataLoaded) return;
    setPaid(rentBalance === 0);
  }, [rentBalance, rentDataLoaded]);

  useEffect(() => {
    try {
      setActiveTenant(readTenantActive());
      const savedNotice = readTenantNotice();
      setNotice(savedNotice?.unit === tenantProfile.unit.replace("Unit ", "") ? savedNotice : null);
    } catch (error) {
      console.error("Could not load tenant demo updates.", error);
      toast.error("Some tenant updates could not be loaded.");
    }
  }, []);

  const go = (next: Tab) => {
    setDir(tabOrder.indexOf(next) > tabOrder.indexOf(tab) ? 1 : -1);
    setTab(next);
  };

  const handlePaid = useCallback(
    (r: PaymentResult) => {
      const now = new Date();
      const entry: LedgerEntry = {
        id: r.reference,
        date: new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short" }).format(now),
        receivedAt: localDateIso(now),
        tenant: tenantProfile.name,
        unitId: tenantUnit?.id ?? "u3",
        unit: tenantUnitLabel,
        amount: r.amount,
        method: r.method,
        reference: r.reference,
        status: r.failed ? "Failed" : r.pending ? "Pending" : "Confirmed",
        rentPeriod: r.rentPeriod,
        monthsCovered: r.monthsCovered,
        coverageAmounts: r.coverageAmounts,
      };
      const notification: TenantNotification = {
        id: `payment-${r.reference}`,
        unit: tenantUnitLabel,
        kind: r.pending || r.failed ? "payment" : r.monthsCovered > 1 ? "advance" : "payment",
        title: r.failed
          ? "Payment failed"
          : r.pending
            ? "Transfer awaiting confirmation"
            : r.monthsCovered > 1
              ? "Advance rent payment received"
              : "Rent payment received",
        message: `${formatUGX(r.amount)} · ${formatRentPeriodRange(r.rentPeriod, r.monthsCovered)}${
          r.failed
            ? " · Try again or choose another payment method"
            : r.pending
              ? " · Waiting for landlord confirmation"
              : ""
        }`,
        createdAt: now.toISOString(),
        read: false,
      };
      setRentData((current) => ({
        ...current,
        ledger: [entry, ...current.ledger.filter((existing) => existing.id !== entry.id)],
        notifications: [notification, ...current.notifications],
      }));
      onTaskDone?.("pay");
    },
    [onTaskDone, setRentData, tenantUnit?.id, tenantUnitLabel],
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
            className="scrollbar-hidden absolute inset-0 overflow-y-auto overscroll-contain pb-[calc(5.25rem+env(safe-area-inset-bottom))]"
          >
            {tab === "home" && (
              <HomeTab
                paid={paid}
                activeTenant={activeTenant}
                lastPayment={payments[0]}
                request={requests[0]}
                notice={notice}
                notificationCount={unreadNotifications}
                periodLabel={formatRentPeriod(period)}
                balance={rentBalance}
                onPay={() => setSheet("pay")}
                onReport={() => setSheet("report")}
                onFindHome={() => go("homes")}
                onOpenPayments={() => go("payments")}
                onOpenComplaints={() => go("complaints")}
                onOpenNotifications={() => go("notifications")}
              />
            )}
            {tab === "payments" && (
              <PaymentsTab
                payments={payments}
                paid={paid}
                balance={rentBalance}
                activeTenant={activeTenant}
                onPay={() => setSheet("pay")}
              />
            )}
            {tab === "complaints" && (
              <ComplaintsTab
                requests={requests}
                activeTenant={activeTenant}
                onReport={() => setSheet("report")}
              />
            )}
            {tab === "homes" && <HomesTab onInterested={() => onTaskDone?.("home")} />}
            {tab === "notifications" && (
              <NotificationsTab
                notifications={notifications}
                onBack={() => go("home")}
                onRead={(id) =>
                  setRentData((current) => ({
                    ...current,
                    notifications: current.notifications.map((notification) =>
                      notification.id === id ? { ...notification, read: true } : notification,
                    ),
                  }))
                }
                onMarkAllRead={() =>
                  setRentData((current) => ({
                    ...current,
                    notifications: current.notifications.map((notification) =>
                      notification.unit === tenantUnitLabel
                        ? { ...notification, read: true }
                        : notification,
                    ),
                  }))
                }
              />
            )}
            {tab === "calendar" && (
              <CalendarView
                events={tenantCalendarEvents(payments, requests, notice, activeTenant)}
                audience="tenant"
              />
            )}
            {tab === "services" && <ServicesTab />}
            {tab === "settings" && <TenantSettingsTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav
        className="absolute bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-2 right-2 z-20 mx-auto grid h-[4.25rem] max-w-[34rem] grid-cols-5 rounded-2xl border border-sidebar-border bg-primary-deep px-1 shadow-lift"
        aria-label="Tenant app"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.625rem] font-semibold transition-colors",
                active ? "text-accent-foreground" : "text-on-deep-muted hover:text-accent",
              )}
            >
              <span className="relative mt-1 grid size-9 place-items-center rounded-full transition-colors duration-200 group-hover:bg-accent/15">
                {active && (
                  <motion.span
                    layoutId="tenant-tab"
                    className="absolute inset-0 rounded-full bg-accent shadow-soft ring-2 ring-accent/25"
                    initial={false}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative size-5 transition-transform duration-200 group-hover:-translate-y-0.5",
                    active
                      ? "text-accent-foreground"
                      : "text-on-deep-muted group-hover:text-accent",
                  )}
                  strokeWidth={1.8}
                  aria-hidden
                />
              </span>
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setSheet("more")}
          aria-expanded={sheet === "more"}
          aria-label="More tenant options"
          className={cn(
            "group relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.625rem] font-semibold transition-colors",
            moreActive ? "text-accent-foreground" : "text-on-deep-muted hover:text-accent",
          )}
        >
          <span className="relative mt-1 grid size-9 place-items-center rounded-full transition-colors duration-200 group-hover:bg-accent/15">
            {moreActive && (
              <motion.span
                layoutId="tenant-tab"
                className="absolute inset-0 rounded-full bg-accent shadow-soft ring-2 ring-accent/25"
                initial={false}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <MoreHorizontal
              className={cn(
                "relative size-5 transition-transform duration-200 group-hover:-translate-y-0.5",
                moreActive
                  ? "text-accent-foreground"
                  : "text-on-deep-muted group-hover:text-accent",
              )}
              strokeWidth={1.8}
              aria-hidden
            />
            {unreadNotifications > 0 && (
              <span className="figure absolute -right-1 -top-1 z-10 grid h-4 min-w-4 place-items-center rounded-full border-2 border-primary-deep bg-destructive px-1 text-[0.5625rem] font-bold leading-none text-destructive-foreground">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </span>
          <span className="relative">More</span>
        </button>
      </nav>

      <AppSheet
        open={sheet === "pay"}
        onClose={() => setSheet(null)}
        title={`Pay rent · ${formatRentPeriod(nextRentPeriod)}`}
      >
        <PayFlow
          rent={tenantProfile.rent}
          balance={nextRentBalance}
          rentPeriod={nextRentPeriod}
          defaultPhone={tenantProfile.phone}
          paymentDetails={tenantProfile.paymentDetails}
          onPaid={handlePaid}
          onClose={() => setSheet(null)}
        />
      </AppSheet>
      <AppSheet open={sheet === "report"} onClose={() => setSheet(null)} title="Send a complaint">
        <ReportFlow onSubmitted={handleReport} onClose={() => setSheet(null)} />
      </AppSheet>
      <AppSheet open={sheet === "more"} onClose={() => setSheet(null)} title="More" tone="onDeep">
        <div className="space-y-2">
          {moreTabs.map((item) => {
            const Icon = item.icon;
            const active = item.id === tab;
            return (
              <motion.button
                key={item.id}
                onClick={() => {
                  go(item.id);
                  setSheet(null);
                }}
                whileHover={{ x: 3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.18, ease: ease.outExpo }}
                className={cn(
                  "group flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-on-deep-muted hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6",
                    active
                      ? "bg-primary-deep/10 text-accent-foreground"
                      : "bg-on-deep/5 text-on-deep-muted group-hover:bg-accent/15 group-hover:text-accent",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="flex-1">{item.label}</span>
                {item.id === "notifications" && unreadNotifications > 0 && (
                  <span className="figure grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                    {unreadNotifications}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </AppSheet>
    </div>
  );
}

/* --------------------------------- Home tab -------------------------------- */

function HomeTab({
  paid,
  activeTenant,
  lastPayment,
  request,
  notice,
  notificationCount,
  periodLabel,
  balance,
  onPay,
  onReport,
  onFindHome,
  onOpenPayments,
  onOpenComplaints,
  onOpenNotifications,
}: {
  paid: boolean;
  activeTenant: boolean;
  lastPayment?: Payment | undefined;
  request?: Complaint | undefined;
  notice: EvictionNotice | null;
  notificationCount: number;
  periodLabel: string;
  balance: number;
  onPay: () => void;
  onReport: () => void;
  onFindHome: () => void;
  onOpenPayments: () => void;
  onOpenComplaints: () => void;
  onOpenNotifications: () => void;
}) {
  const { data, isPending } = useQuery({
    queryKey: ["tenant-home"],
    queryFn: fetchTenantHome,
    staleTime: Infinity,
  });
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
            {activeTenant
              ? `${tenantProfile.unit}, ${tenantProfile.property}`
              : `Past home · ${tenantProfile.unit}, ${tenantProfile.property}`}
          </p>
          <h1 className="text-2xl font-bold">Hello, {data.profile.firstName}</h1>
        </div>
        <button
          onClick={onOpenNotifications}
          className="relative grid size-12 place-items-center rounded-full bg-card shadow-soft"
          aria-label={
            notificationCount ? `Notifications, ${notificationCount} unread` : "Notifications"
          }
        >
          <BellRing className="size-5" strokeWidth={1.8} />
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-destructive text-[0.625rem] font-bold text-destructive-foreground">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
      </motion.header>

      {!activeTenant ? (
        <motion.section {...stagger(1)} className="surface space-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
              <House className="size-5" />
            </span>
            <div>
              <p className="font-bold">Your tenancy has ended</p>
              <p className="text-sm text-muted-foreground">
                You no longer have an active unit. Your payment history is still available.
              </p>
            </div>
          </div>
          {notice && <NoticeCard notice={notice} />}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onOpenPayments}>
              Payment history
            </Button>
            <Button onClick={onFindHome}>Available homes</Button>
          </div>
        </motion.section>
      ) : (
        <>
          <motion.section
            {...stagger(1)}
            className="deep-panel overflow-hidden rounded-2xl p-5"
            aria-label={`${periodLabel} rent`}
          >
            <div className="flex items-center gap-3">
              <RentRing
                daysLeft={tenantProfile.daysUntilDue}
                cycleDays={tenantProfile.cycleDays}
                status={status}
                size={88}
                stroke={9}
                trackClassName="stroke-on-deep/15"
                immediate
              >
                <AnimatePresence mode="wait" initial={false}>
                  {paid ? (
                    <motion.span
                      key="paid"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-sm font-bold text-on-deep"
                    >
                      Paid
                    </motion.span>
                  ) : (
                    <motion.span key="days" exit={{ opacity: 0 }} className="leading-none">
                      <span className="figure block text-3xl font-bold text-on-deep">
                        {tenantProfile.daysUntilDue}
                      </span>
                      <span className="text-xs text-on-deep-muted">days left</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </RentRing>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-on-deep-muted">
                  {paid
                    ? "Monthly rent"
                    : balance < tenantProfile.rent
                      ? "Balance due"
                      : `${periodLabel} rent`}
                </p>
                <p className="figure mt-0.5 break-words text-lg font-bold leading-tight text-on-deep sm:text-xl">
                  {formatUGX(paid ? tenantProfile.rent : balance)}
                </p>
                <p className="mt-1 text-sm text-on-deep-muted">
                  {paid
                    ? `Receipt ${lastPayment?.reference}`
                    : `Balance due · ${tenantProfile.daysUntilDue} days left`}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <RentStatusPill status={status} />
              {paid ? (
                <Button variant="onDeepOutline" size="sm" onClick={onPay}>
                  Pay more months
                </Button>
              ) : (
                <Button variant="accent" onClick={onPay}>
                  Pay rent
                </Button>
              )}
            </div>
          </motion.section>

          <motion.section
            {...stagger(2)}
            className="grid grid-cols-2 gap-3"
            aria-label="Quick actions"
          >
            <QuickAction icon={MessageSquare} label="Send a complaint" onClick={onReport} />
            <QuickAction icon={House} label="Find a home" onClick={onFindHome} />
          </motion.section>

          {request && (
            <motion.section {...stagger(3)}>
              <SectionHeader
                title="Complaint update"
                action="All complaints"
                onAction={onOpenComplaints}
              />
              <RequestCard request={request} />
            </motion.section>
          )}
          {notice && <NoticeCard notice={notice} />}
        </>
      )}

      <motion.section {...stagger(4)}>
        <SectionHeader title="Last payment" action="History" onAction={onOpenPayments} />
        {lastPayment && <PaymentRow payment={lastPayment} />}
      </motion.section>
    </div>
  );
}

const homeServices = [
  { name: "Plumbing", provider: "Kampala Home Fix", price: "UGX 20,000–80,000" },
  { name: "Electrical", provider: "BrightWire Services", price: "UGX 25,000–100,000" },
  { name: "Cleaning", provider: "FreshNest Cleaning", price: "UGX 30,000–90,000" },
  { name: "Garbage collection", provider: "GreenLoop Kampala", price: "UGX 15,000–35,000" },
  { name: "Water delivery", provider: "ClearDrop Water", price: "UGX 8,000–25,000" },
  { name: "Cooking gas", provider: "QuickFlame Delivery", price: "UGX 10,000–40,000" },
];

function ServicesTab() {
  return (
    <section className="space-y-5 p-5 pb-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Demo providers · Kampala</p>
        <h1 className="mt-1 text-2xl font-bold text-primary-deep">Services for your home</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Request a quote from a local home-service provider.
        </p>
      </header>
      <ul className="space-y-3">
        {homeServices.map((service) => (
          <li key={service.name} className="surface flex items-center gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-deep">
              <Wrench className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{service.name}</h2>
              <p className="truncate text-xs text-muted-foreground">{service.provider} · Demo</p>
              <p className="figure mt-1 text-xs font-medium text-primary-deep">{service.price}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast.success("Quote request noted", {
                  description: `${service.provider} is a demo provider. No request was sent.`,
                })
              }
            >
              Request
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TenantSettingsTab() {
  const [paymentUpdates, setPaymentUpdates] = useState(true);
  const [repairUpdates, setRepairUpdates] = useState(true);

  return (
    <section className="space-y-5 p-5 pb-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Your account</p>
        <h1 className="mt-1 text-2xl font-bold text-primary-deep">Settings</h1>
      </header>
      <div className="surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tenancy
        </p>
        <p className="mt-2 font-semibold">{tenantProfile.name}</p>
        <p className="text-sm text-muted-foreground">
          {tenantProfile.unit} · {tenantProfile.property}
        </p>
      </div>
      <div className="surface divide-y divide-border p-4">
        <p className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notifications
        </p>
        <label className="flex min-h-14 items-center justify-between gap-4 py-2 text-sm">
          Payment and rent updates
          <Switch checked={paymentUpdates} onCheckedChange={setPaymentUpdates} />
        </label>
        <label className="flex min-h-14 items-center justify-between gap-4 py-2 text-sm">
          Repair updates
          <Switch checked={repairUpdates} onCheckedChange={setRepairUpdates} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Settings shown here are saved for this demo session only.
      </p>
    </section>
  );
}

function NotificationsTab({
  notifications,
  onBack,
  onRead,
  onMarkAllRead,
}: {
  notifications: TenantNotification[];
  onBack: () => void;
  onRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="space-y-4 px-4 pb-8 pt-5 sm:px-5 sm:pt-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="iconSm" onClick={onBack} aria-label="Back to home">
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Rent, payment, advance and landlord updates.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
          className="shrink-0"
        >
          Mark all read
        </Button>
      </header>

      {notifications.length === 0 ? (
        <div className="surface px-5 py-10 text-center">
          <BellRing className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-semibold">You’re all caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New rent and landlord updates will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const Icon =
              notification.kind === "payment"
                ? Receipt
                : notification.kind === "advance"
                  ? CalendarDays
                  : notification.kind === "update"
                    ? MessageSquare
                    : BellRing;
            const date = new Date(notification.createdAt);
            const dateLabel = Number.isNaN(date.getTime())
              ? "Recently"
              : new Intl.DateTimeFormat("en-UG", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(date);
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => onRead(notification.id)}
                  aria-label={`${notification.read ? "" : "Unread: "}${notification.title}. ${notification.message}`}
                  className={`surface flex w-full items-start gap-3 p-4 text-left transition-colors ${
                    notification.read ? "" : "border-primary/30 bg-primary-soft/35"
                  }`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-primary-deep">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-bold">{notification.title}</span>
                      {!notification.read && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[0.625rem] font-bold text-primary-foreground">
                          New
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {notification.message}
                    </span>
                    <time
                      className="mt-2 block text-xs text-muted-foreground"
                      dateTime={notification.createdAt}
                    >
                      {dateLabel}
                    </time>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Demo notifications are saved in this browser and are not sent as push messages or SMS.
      </p>
    </div>
  );
}

function NoticeCard({ notice }: { notice: EvictionNotice }) {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning-soft p-4">
      <p className="font-bold text-warning-ink">Notice from your landlord</p>
      <p className="mt-1 text-sm text-warning-ink">
        {notice.property} · Unit {notice.unit}
      </p>
      <p className="mt-2 text-sm">
        Requested move-out date: <strong>{notice.vacateBy}</strong>
      </p>
      {notice.reason && <p className="mt-2 text-sm">{notice.reason}</p>}
      <p className="mt-2 text-xs text-warning-ink">Issued {notice.issuedOn}</p>
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

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="surface press flex min-h-24 flex-col justify-between p-4 text-left"
    >
      <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-warning-ink">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="flex min-h-11 items-center gap-0.5 px-1 text-sm font-semibold text-primary"
        >
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
          {payment.status === "Pending" ? " · Pending confirmation" : ""}
        </p>
      </div>
      <p className="figure text-right font-bold">{formatUGX(payment.amount)}</p>
    </div>
  );
}

function StageTracker({ stage }: { stage: Complaint["stage"] }) {
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
              className={cn(
                "size-3.5 rounded-full border-2",
                i <= idx ? "border-primary bg-primary" : "border-input bg-card",
              )}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + i * 0.12, type: "spring", stiffness: 400, damping: 20 }}
            />
            <span
              className={cn(
                "text-[0.6875rem] font-medium",
                i <= idx ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {stageLabel[s]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestCard({ request }: { request: Complaint }) {
  const tone =
    request.stage === "resolved" ? "success" : request.stage === "submitted" ? "neutral" : "info";
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

function PaymentsTab({
  payments,
  paid,
  balance,
  activeTenant,
  onPay,
}: {
  payments: Payment[];
  paid: boolean;
  balance: number;
  activeTenant: boolean;
  onPay: () => void;
}) {
  const receiptColors = [
    "border-primary/20 bg-primary-soft/55",
    "border-accent/35 bg-accent-soft/70",
    "border-success/20 bg-success-soft/60",
    "border-chart-4/25 bg-chart-4/10",
  ];
  const year = String(new Date().getFullYear());
  const total = payments
    .filter(
      (payment) =>
        payment.status !== "Pending" &&
        payment.status !== "Failed" &&
        (payment.receivedAt ?? payment.date).includes(year),
    )
    .reduce((s, p) => s + p.amount, 0);
  return (
    <div className="min-w-0 px-4 pb-8 pt-5 sm:px-5 sm:pt-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <div className="surface mt-4 flex flex-wrap items-center justify-between gap-4 p-4 sm:mt-5 sm:p-5">
        <div>
          <p className="text-sm text-muted-foreground">Balance due</p>
          <p className="figure mt-1 text-2xl font-bold">
            {!activeTenant ? "UGX 0" : formatUGX(balance)}
          </p>
        </div>
        {!activeTenant ? (
          <Pill tone="neutral" label="No active tenancy" />
        ) : (
          <div className="flex items-center gap-2">
            {paid && <RentStatusPill status="paid" />}
            <Button onClick={onPay}>{paid ? "Pay more months" : "Pay now"}</Button>
          </div>
        )}
      </div>
      <h2 className="mb-3 mt-7 flex flex-col gap-1 text-base font-bold sm:mt-8 sm:flex-row sm:items-baseline sm:justify-between">
        Receipts
        <span className="figure text-sm font-medium text-muted-foreground">
          {formatUGX(total)} paid in {year}
        </span>
      </h2>
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {payments.map((p, i) => (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: ease.outExpo }}
            >
              <article
                className={cn(
                  "overflow-hidden rounded-xl border p-4 shadow-soft sm:p-5",
                  p.status === "Pending"
                    ? "border-warning/30 bg-warning-soft/70"
                    : p.status === "Failed"
                      ? "border-destructive/20 bg-destructive-soft/60"
                      : receiptColors[i % receiptColors.length],
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl",
                      p.status === "Pending"
                        ? "bg-warning text-warning-ink"
                        : p.status === "Failed"
                          ? "bg-destructive-soft text-destructive-ink"
                          : "bg-card/80 text-primary-deep",
                    )}
                  >
                    <Receipt className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <p className="font-bold">{p.month}</p>
                      <p className="figure font-bold">{formatUGX(p.amount)}</p>
                    </div>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {p.method} · {p.date}
                      {p.status === "Pending" ? " · Pending confirmation" : ""}
                      {p.status === "Failed" ? " · Failed" : ""}
                    </p>
                    <p className="figure mt-1 break-all text-xs text-muted-foreground">
                      Ref {p.reference}
                    </p>
                  </div>
                </div>
                <Button
                  size="default"
                  variant="outline"
                  className="mt-4 w-full border-primary/25 bg-card/80 sm:mt-5"
                  onClick={() => {
                    try {
                      printPdf("Rent payment receipt", [
                        ["Tenant", tenantProfile.name],
                        ["Property / unit", `${tenantProfile.property} · ${tenantProfile.unit}`],
                        ["Payment month", p.month],
                        ["Date", p.date],
                        ["Method", p.method],
                        ["Reference", p.reference],
                        ["Amount", formatUGX(p.amount)],
                        ["Status", p.status ?? "Confirmed"],
                      ]);
                    } catch (error) {
                      toast.error("Could not open the receipt", {
                        description:
                          error instanceof Error ? error.message : "Allow pop-ups and try again.",
                      });
                    }
                  }}
                >
                  <FileText /> Download receipt
                </Button>
              </article>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* ------------------------------ Complaints tab ----------------------------- */

function ComplaintsTab({
  requests,
  activeTenant,
  onReport,
}: {
  requests: Complaint[];
  activeTenant: boolean;
  onReport: () => void;
}) {
  return (
    <div className="px-5 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Complaints</h1>
        <Button size="sm" onClick={onReport} disabled={!activeTenant}>
          <MessageSquare /> New complaint
        </Button>
      </div>
      {!activeTenant && (
        <p className="mt-3 text-sm text-muted-foreground">
          Your tenancy has ended. Existing complaints remain visible, but new complaints require an
          active unit.
        </p>
      )}
      {requests.length === 0 ? (
        <div className="mt-10 rounded-lg border-2 border-dashed border-input p-8 text-center">
          <p className="font-semibold">No complaints yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Send your landlord a complaint or report a property concern here.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          <AnimatePresence initial={false}>
            {requests.map((r) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: ease.outExpo }}
              >
                <RequestCard request={r} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function tenantCalendarEvents(
  payments: Payment[],
  complaints: Complaint[],
  notice: EvictionNotice | null,
  activeTenant: boolean,
) {
  const events: CalendarEvent[] = [
    ...(activeTenant
      ? [
          {
            id: "rent-due",
            title: "November rent due",
            date: new Date(2026, 10, 21),
            detail: `${formatUGX(tenantProfile.rent)} · ${tenantProfile.unit}`,
            kind: "rent" as const,
            amount: tenantProfile.rent,
            coverage: "Due November 21 · 5 days left",
          },
        ]
      : []),
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      title:
        payment.status === "Pending"
          ? "Transfer awaiting confirmation"
          : payment.status === "Failed"
            ? "Payment failed"
            : `${payment.month} payment`,
      date: new Date(payment.receivedAt ?? payment.date),
      detail: `${formatUGX(payment.amount)} · ${payment.method}`,
      kind:
        payment.status === "Confirmed" || !payment.status
          ? ("payment" as const)
          : ("rent" as const),
      amount: payment.amount,
      coverage: `${payment.status === "Pending" ? "Payment pending for" : "Rent period"}: ${
        payment.rentPeriod && payment.monthsCovered
          ? formatRentPeriodRange(payment.rentPeriod, payment.monthsCovered)
          : paymentPeriod(payment.month)
      }`,
    })),
    ...complaints.map((complaint) => ({
      id: `complaint-${complaint.id}`,
      title: `Complaint: ${complaint.title}`,
      date:
        complaint.reported === "Today"
          ? new Date(2026, 10, 16)
          : new Date(`${complaint.reported} 2026`),
      detail: `${complaint.category} · ${stageLabel[complaint.stage]}`,
      kind: "complaint" as const,
    })),
  ];
  if (notice) {
    events.push(
      {
        id: "eviction-notice",
        title: "Notice received",
        date: new Date(notice.issuedOn),
        detail: `Requested move-out by ${notice.vacateBy}`,
        kind: "notice" as const,
      },
      {
        id: "move-out-date",
        title: "Requested move-out date",
        date: new Date(notice.vacateBy),
        detail: `${notice.property} · Unit ${notice.unit}`,
        kind: "notice" as const,
      },
    );
  }
  return events;
}

function paymentPeriod(month: string) {
  const date = parse(month, "MMMM yyyy", new Date(2026, 0, 1));
  if (Number.isNaN(date.getTime())) return month;
  return `${format(date, "MMMM")} 1–${getDaysInMonth(date)}, ${format(date, "yyyy")}`;
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
    (l) =>
      (area === areas[0] || l.area === area) &&
      l.rent <= (budgets[budget]?.max ?? Infinity) &&
      !seen.includes(l.id),
  );

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="text-2xl font-bold">Find a home</h1>
      <div
        className="scrollbar-hidden -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1"
        role="group"
        aria-label="Area"
      >
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
            if (yes)
              setShortlist((s) =>
                s.some((x) => x.item.id === item.id) ? s : [{ item, requested: false }, ...s],
              );
          }}
        />
      </div>

      <AnimatePresence>
        {shortlist.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <h2 className="mb-3 text-base font-bold">Your shortlist</h2>
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {shortlist.map(({ item, requested }) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: ease.outExpo }}
                    className="surface flex items-center gap-3 p-3"
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="size-16 shrink-0 rounded-sm object-cover"
                      loading="lazy"
                    />
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
                          setShortlist((s) =>
                            s.map((x) => (x.item.id === item.id ? { ...x, requested: true } : x)),
                          );
                          onInterested();
                          toast.success("Viewing requested", {
                            description: `The landlord for ${item.title} in ${item.area} will contact you.`,
                          });
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
