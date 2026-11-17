import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  FileBarChart2,
  LayoutDashboard,
  MessageSquare,
  Receipt,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddTenantDialog } from "@/components/landlord/AddTenantDialog";
import { ComplaintsView } from "@/components/landlord/ComplaintsView";
import { EvictionNoticeDialog } from "@/components/landlord/EvictionNoticeDialog";
import { Overview } from "@/components/landlord/Overview";
import { PaymentsView } from "@/components/landlord/PaymentsView";
import { ReportsView } from "@/components/landlord/ReportsView";
import { UnitSheet } from "@/components/landlord/UnitSheet";
import { UnitsView } from "@/components/landlord/UnitsView";
import { DashShell, type NavItem } from "@/components/shared/DashShell";
import { CalendarView, type CalendarEvent } from "@/components/shared/CalendarView";
import { formatUGX, getRentStatus } from "@/lib/rent";
import {
  addRentPeriodMonths,
  currentRentPeriod,
  formatRentPeriodRange,
  getNextUncoveredRentPeriod,
  getUnitPeriodCredit,
  getUnitRentChargeForMonths,
  localDateIso,
} from "@/lib/rent-accounting";
import { useRentDemoData } from "@/lib/useRentDemoData";
import { saveTenantNotice, setTenantActive, type EvictionNotice } from "@/lib/tenant-demo";
import {
  complaints,
  stageOrder,
  type LedgerEntry,
  type Complaint,
  type TenantNotification,
  type Unit,
} from "@/lib/sample-data";

export const Route = createFileRoute("/landlord")({
  head: () => ({
    meta: [
      { title: "Landlord dashboard | Propatiz" },
      {
        name: "description",
        content:
          "See who has paid, send rent reminders, manage tenant complaints and export payment records. Explore the Propatiz landlord dashboard.",
      },
      { property: "og:title", content: "Propatiz landlord dashboard" },
      {
        property: "og:description",
        content:
          "Rent collection, units, complaints and payments in one dashboard for landlords and property managers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandlordPage,
});

type View = "overview" | "units" | "complaints" | "payments" | "calendar" | "reports";

function LandlordPage() {
  const [view, setView] = useState<View>("overview");
  const { data: rentData, setData: setRentData } = useRentDemoData();
  const period = currentRentPeriod();
  const units = useMemo(
    () =>
      rentData.units.map((unit) => ({
        ...unit,
        paid: !!unit.tenant && getUnitPeriodCredit(unit, rentData.ledger, period) >= unit.rent,
      })),
    [period, rentData.ledger, rentData.units],
  );
  const ledger = rentData.ledger;
  const [requests, setRequests] = useState<Complaint[]>(complaints);
  const [reminded, setReminded] = useState<string[]>([]);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [presetUnit, setPresetUnit] = useState<string | undefined>();
  const [noticeUnit, setNoticeUnit] = useState<Unit | null>(null);

  const openUnit = units.find((u) => u.id === openUnitId) ?? null;
  const vacant = useMemo(() => units.filter((u) => !u.tenant), [units]);
  const overdueCount = units.filter(
    (u) => u.tenant && getRentStatus(u.daysUntilDue, u.paid) === "overdue",
  ).length;
  const openComplaints = requests.filter((r) => r.stage !== "resolved").length;

  const nav: NavItem<View>[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "units", label: "Units", icon: Building2, badge: overdueCount },
    { id: "complaints", label: "Complaints", icon: MessageSquare, badge: openComplaints },
    { id: "payments", label: "Payments", icon: Receipt },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "reports", label: "Reports", icon: FileBarChart2 },
  ];

  const remind = (id: string) => {
    const u = units.find((x) => x.id === id);
    setReminded((r) => [...r, id]);
    if (u) {
      const now = new Date();
      const notification: TenantNotification = {
        id: `reminder-${Date.now()}`,
        unit: u.unit,
        kind: "rent",
        title: "Rent reminder from your landlord",
        message: `Your rent of ${formatUGX(u.rent)} is due. Please contact your landlord if you need help.`,
        createdAt: now.toISOString(),
        read: false,
      };
      setRentData((current) => ({
        ...current,
        notifications: [
          notification,
          ...current.notifications.filter((item) => item.id !== notification.id),
        ],
      }));
    }
    toast.success("Tenant reminder added", {
      description: `${u?.tenant} will see a rent reminder for ${formatUGX(u?.rent ?? 0)}.`,
    });
  };

  const recordRentPayment = (id: string, monthsCovered: number) => {
    const u = units.find((x) => x.id === id);
    if (!u?.tenant || !Number.isInteger(monthsCovered) || monthsCovered < 1 || monthsCovered > 12)
      return;
    const now = new Date();
    const receivedAt = localDateIso(now);
    const rentPeriod = getNextUncoveredRentPeriod(u, ledger, period);
    const coverageAmounts = Array.from({ length: monthsCovered }, (_, index) => {
      const month = addRentPeriodMonths(rentPeriod, index);
      return Math.max(0, u.rent - getUnitPeriodCredit(u, ledger, month));
    });
    const entry: LedgerEntry = {
      id: `l-${Date.now()}`,
      date: new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short" }).format(now),
      receivedAt,
      tenant: u.tenant,
      unitId: u.id,
      unit: u.unit,
      amount: coverageAmounts.reduce((sum, amount) => sum + amount, 0),
      method: "Cash",
      reference: `CASH-${Date.now().toString().slice(-6)}`,
      status: "Confirmed",
      rentPeriod,
      monthsCovered,
      coverageAmounts,
    };
    const notification: TenantNotification = {
      id: `payment-${entry.id}`,
      unit: u.unit,
      kind: monthsCovered > 1 ? "advance" : "payment",
      title: monthsCovered > 1 ? "Advance rent recorded" : "Rent payment recorded",
      message: `${formatUGX(entry.amount)} was recorded for ${formatRentPeriodRange(
        entry.rentPeriod,
        monthsCovered,
      )}.`,
      createdAt: now.toISOString(),
      read: false,
    };
    setRentData((current) => {
      const nextLedger = [entry, ...current.ledger];
      return {
        ...current,
        ledger: nextLedger,
        units: current.units.map((unit) =>
          unit.id === u.id
            ? {
                ...unit,
                paid: getUnitPeriodCredit(unit, nextLedger, period) >= unit.rent,
              }
            : unit,
        ),
        notifications: [
          notification,
          ...current.notifications.filter((item) => item.id !== notification.id),
        ],
      };
    });
    toast.success("Payment recorded", {
      description: `${formatUGX(entry.amount)} for ${u.tenant} · ${u.unit}.`,
    });
  };

  const confirmPayment = (id: string) => {
    const pending = ledger.find((entry) => entry.id === id);
    if (!pending || pending.status !== "Pending") {
      toast.error("This payment is no longer waiting for confirmation.");
      return;
    }
    const now = new Date();
    const notification: TenantNotification = {
      id: `payment-${pending.id}`,
      unit: pending.unit,
      kind: "payment",
      title: "Rent payment confirmed",
      message: `${formatUGX(pending.amount)} was confirmed for ${pending.unit}.`,
      createdAt: now.toISOString(),
      read: false,
    };
    setRentData((current) => {
      const nextLedger = current.ledger.map((entry) =>
        entry.id === id ? { ...entry, status: "Confirmed" as const } : entry,
      );
      return {
        ...current,
        ledger: nextLedger,
        units: current.units.map((unit) =>
          unit.id === pending.unitId && unit.tenant === pending.tenant
            ? {
                ...unit,
                paid: getUnitPeriodCredit(unit, nextLedger, period) >= unit.rent,
              }
            : unit,
        ),
        notifications: [
          notification,
          ...current.notifications.filter((item) => item.id !== notification.id),
        ],
      };
    });
    toast.success("Payment confirmed", {
      description: `${formatUGX(pending.amount)} for ${pending.tenant} · ${pending.unit}.`,
    });
  };

  const advance = (id: string) => {
    setRequests((list) =>
      list.map((r) => {
        if (r.id !== id) return r;
        const next = stageOrder[Math.min(stageOrder.indexOf(r.stage) + 1, stageOrder.length - 1)];
        return { ...r, stage: next ?? r.stage };
      }),
    );
  };

  return (
    <DashShell
      current="/landlord"
      nav={nav}
      view={view}
      onView={setView}
      account={{ name: "Patricia Auma", role: "Kololo Heights Management" }}
    >
      {view === "overview" && (
        <Overview
          units={units}
          requests={requests}
          reminded={reminded}
          onRemind={remind}
          onAddTenant={() => {
            setPresetUnit(undefined);
            setAddOpen(true);
          }}
          onOpenUnits={() => setView("units")}
          onOpenComplaints={() => setView("complaints")}
          onOpenUnit={(u) => setOpenUnitId(u.id)}
        />
      )}
      {view === "units" && (
        <UnitsView
          units={units}
          onOpenUnit={(u) => setOpenUnitId(u.id)}
          onAddTenant={() => {
            setPresetUnit(undefined);
            setAddOpen(true);
          }}
          onOpenReports={() => setView("reports")}
        />
      )}
      {view === "complaints" && <ComplaintsView requests={requests} onAdvance={advance} />}
      {view === "payments" && <PaymentsView ledger={ledger} onConfirm={confirmPayment} />}
      {view === "calendar" && (
        <CalendarView events={landlordCalendarEvents(units, requests)} audience="landlord" />
      )}
      {view === "reports" && <ReportsView units={units} ledger={ledger} />}

      <UnitSheet
        unit={openUnit}
        onClose={() => setOpenUnitId(null)}
        reminded={!!openUnit && reminded.includes(openUnit.id)}
        onRemind={() => openUnit && remind(openUnit.id)}
        onRecordPayment={(monthsCovered) =>
          openUnit && recordRentPayment(openUnit.id, monthsCovered)
        }
        amountForMonths={(monthsCovered) =>
          openUnit ? getUnitRentChargeForMonths(openUnit, ledger, period, monthsCovered) : 0
        }
        onMoveOut={() => {
          if (!openUnit) return;
          setRentData((current) => ({
            ...current,
            units: current.units.map((unit) =>
              unit.id === openUnit.id
                ? {
                    ...unit,
                    tenant: null,
                    phone: "",
                    email: undefined,
                    occupants: undefined,
                    occupation: undefined,
                    sex: undefined,
                    paid: false,
                    daysUntilDue: 0,
                    leaseEnds: "-",
                  }
                : unit,
            ),
          }));
          setTenantActive(false, openUnit.unit);
          setOpenUnitId(null);
          toast.success("Tenancy ended", {
            description: `Unit ${openUnit.unit} is now vacant. Payment history has been kept.`,
          });
        }}
        onEvictionNotice={() => {
          setNoticeUnit(openUnit);
          setOpenUnitId(null);
        }}
        onAddTenant={() => {
          setPresetUnit(openUnit?.id);
          setOpenUnitId(null);
          setAddOpen(true);
        }}
      />
      <AddTenantDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        vacantUnits={vacant}
        presetUnitId={presetUnit}
        onCreate={(t) => {
          setRentData((current) => ({
            ...current,
            units: current.units.map((u) =>
              u.id === t.unitId
                ? {
                    ...u,
                    tenant: t.name,
                    phone: t.phone,
                    email: t.email,
                    occupants: t.occupants,
                    occupation: t.occupation,
                    sex: t.sex,
                    rent: t.rent,
                    daysUntilDue: 15,
                    paid: false,
                    leaseEnds: "Nov 2027",
                  }
                : u,
            ),
          }));
          if (t.unitId === "u3") setTenantActive(true, "B4");
        }}
      />
      <EvictionNoticeDialog
        unit={noticeUnit}
        onClose={() => setNoticeUnit(null)}
        onSendToApp={(notice: EvictionNotice) => {
          saveTenantNotice(notice);
          const now = new Date();
          const notification: TenantNotification = {
            id: `landlord-update-${Date.now()}`,
            unit: notice.unit,
            kind: "update",
            title: "Important update from your landlord",
            message: `${notice.reason} · Requested move-out by ${notice.vacateBy}.`,
            createdAt: now.toISOString(),
            read: false,
          };
          setRentData((current) => ({
            ...current,
            notifications: [notification, ...current.notifications],
          }));
          setNoticeUnit(null);
        }}
      />
    </DashShell>
  );
}

function landlordCalendarEvents(units: Unit[], complaints: Complaint[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const unit of units) {
    if (unit.tenant) {
      events.push({
        id: `rent-${unit.id}`,
        title: unit.paid
          ? `November rent paid · ${unit.unit}`
          : unit.daysUntilDue < 0
            ? `Rent overdue · ${unit.unit}`
            : `November rent due · ${unit.unit}`,
        date: unit.paid ? new Date(2026, 10, 16) : new Date(2026, 10, 16 + unit.daysUntilDue),
        detail: `${unit.tenant} · ${unit.property} · ${formatUGX(unit.rent)}`,
        kind: unit.paid ? "payment" : "rent",
        amount: unit.rent,
        coverage: unit.paid
          ? "Covers November 1–30"
          : unit.daysUntilDue < 0
            ? `Due November ${16 + unit.daysUntilDue} · ${Math.abs(unit.daysUntilDue)} days overdue`
            : `Due November ${16 + unit.daysUntilDue} · ${unit.daysUntilDue} days left`,
      });
      if (unit.leaseEnds !== "-") {
        const leaseDate = new Date(`1 ${unit.leaseEnds}`);
        if (!Number.isNaN(leaseDate.getTime())) {
          events.push({
            id: `lease-${unit.id}`,
            title: `Lease ends · ${unit.unit}`,
            date: leaseDate,
            detail: `${unit.tenant} · ${unit.property}`,
            kind: "lease",
          });
        }
      }
    }
  }
  for (const complaint of complaints) {
    const date =
      complaint.reported === "Today"
        ? new Date(2026, 10, 16)
        : new Date(`${complaint.reported} 2026`);
    if (!Number.isNaN(date.getTime())) {
      events.push({
        id: `complaint-${complaint.id}`,
        title: `Complaint · ${complaint.unit}`,
        date,
        detail: `${complaint.title} · ${complaint.tenant}`,
        kind: "complaint",
      });
    }
  }
  return events;
}
