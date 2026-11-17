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
import { saveTenantNotice, setTenantActive, type EvictionNotice } from "@/lib/tenant-demo";
import {
  ledger as initialLedger,
  complaints,
  stageOrder,
  units as initialUnits,
  type LedgerEntry,
  type Complaint,
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
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [requests, setRequests] = useState<Complaint[]>(complaints);
  const [ledger, setLedger] = useState<LedgerEntry[]>(initialLedger);
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
    toast.success("Reminder sent", {
      description: `${u?.tenant} will get an SMS about ${formatUGX(u?.rent ?? 0)}.`,
    });
  };

  const recordCash = (id: string) => {
    const u = units.find((x) => x.id === id);
    if (!u) return;
    setUnits((list) => list.map((x) => (x.id === id ? { ...x, paid: true } : x)));
    setLedger((l) => [
      {
        id: `l-${Date.now()}`,
        date: "16 Nov",
        tenant: u.tenant ?? "",
        unit: u.unit,
        amount: u.rent,
        method: "Cash",
        reference: `CASH-0${113 + l.length}`,
        status: "Confirmed",
      },
      ...l,
    ]);
    toast.success("Payment recorded", { description: `Unit ${u.unit} is now marked as paid.` });
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
      {view === "payments" && <PaymentsView ledger={ledger} />}
      {view === "calendar" && (
        <CalendarView events={landlordCalendarEvents(units, requests)} audience="landlord" />
      )}
      {view === "reports" && <ReportsView units={units} ledger={ledger} />}

      <UnitSheet
        unit={openUnit}
        onClose={() => setOpenUnitId(null)}
        reminded={!!openUnit && reminded.includes(openUnit.id)}
        onRemind={() => openUnit && remind(openUnit.id)}
        onRecordCash={() => openUnit && recordCash(openUnit.id)}
        onMoveOut={() => {
          if (!openUnit) return;
          setUnits((list) =>
            list.map((unit) =>
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
          );
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
          setUnits((list) =>
            list.map((u) =>
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
          );
          if (t.unitId === "u3") setTenantActive(true, "B4");
        }}
      />
      <EvictionNoticeDialog
        unit={noticeUnit}
        onClose={() => setNoticeUnit(null)}
        onSendToApp={(notice: EvictionNotice) => {
          saveTenantNotice(notice);
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
