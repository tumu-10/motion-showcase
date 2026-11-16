import { createFileRoute } from "@tanstack/react-router";
import { Building2, LayoutDashboard, Receipt, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddTenantDialog } from "@/components/landlord/AddTenantDialog";
import { MaintenanceView } from "@/components/landlord/MaintenanceView";
import { Overview } from "@/components/landlord/Overview";
import { PaymentsView } from "@/components/landlord/PaymentsView";
import { UnitSheet } from "@/components/landlord/UnitSheet";
import { UnitsView } from "@/components/landlord/UnitsView";
import { DashShell, type NavItem } from "@/components/shared/DashShell";
import { formatUGX, getRentStatus } from "@/lib/rent";
import {
  ledger as initialLedger,
  maintenanceRequests,
  stageOrder,
  units as initialUnits,
  type LedgerEntry,
  type MaintenanceRequest,
  type Unit,
} from "@/lib/sample-data";

export const Route = createFileRoute("/landlord")({
  head: () => ({
    meta: [
      { title: "Landlord dashboard | Propatiz" },
      {
        name: "description",
        content: "See who has paid, send rent reminders, manage repairs and export payment records. Explore the Propatiz landlord dashboard.",
      },
      { property: "og:title", content: "Propatiz landlord dashboard" },
      { property: "og:description", content: "Rent collection, units, repairs and payments in one dashboard for landlords and property managers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandlordPage,
});

type View = "overview" | "units" | "repairs" | "payments";

function LandlordPage() {
  const [view, setView] = useState<View>("overview");
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [requests, setRequests] = useState<MaintenanceRequest[]>(maintenanceRequests);
  const [ledger, setLedger] = useState<LedgerEntry[]>(initialLedger);
  const [reminded, setReminded] = useState<string[]>([]);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [presetUnit, setPresetUnit] = useState<string | undefined>();

  const openUnit = units.find((u) => u.id === openUnitId) ?? null;
  const vacant = useMemo(() => units.filter((u) => !u.tenant), [units]);
  const overdueCount = units.filter((u) => u.tenant && getRentStatus(u.daysUntilDue, u.paid) === "overdue").length;
  const openRepairs = requests.filter((r) => r.stage !== "resolved").length;

  const nav: NavItem<View>[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "units", label: "Units", icon: Building2, badge: overdueCount },
    { id: "repairs", label: "Repairs", icon: Wrench, badge: openRepairs },
    { id: "payments", label: "Payments", icon: Receipt },
  ];

  const remind = (id: string) => {
    const u = units.find((x) => x.id === id);
    setReminded((r) => [...r, id]);
    toast.success("Reminder sent", { description: `${u?.tenant} will get an SMS about ${formatUGX(u?.rent ?? 0)}.` });
  };

  const recordCash = (id: string) => {
    const u = units.find((x) => x.id === id);
    if (!u) return;
    setUnits((list) => list.map((x) => (x.id === id ? { ...x, paid: true } : x)));
    setLedger((l) => [
      { id: `l-${Date.now()}`, date: "16 Nov", tenant: u.tenant ?? "", unit: u.unit, amount: u.rent, method: "Cash", reference: `CASH-0${113 + l.length}`, status: "Confirmed" },
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
    <DashShell current="/landlord" nav={nav} view={view} onView={setView} account={{ name: "Patricia Auma", role: "Kololo Heights Management" }}>
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
          onOpenMaintenance={() => setView("repairs")}
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
        />
      )}
      {view === "repairs" && <MaintenanceView requests={requests} onAdvance={advance} />}
      {view === "payments" && <PaymentsView ledger={ledger} />}

      <UnitSheet
        unit={openUnit}
        onClose={() => setOpenUnitId(null)}
        reminded={!!openUnit && reminded.includes(openUnit.id)}
        onRemind={() => openUnit && remind(openUnit.id)}
        onRecordCash={() => openUnit && recordCash(openUnit.id)}
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
            list.map((u) => (u.id === t.unitId ? { ...u, tenant: t.name, phone: t.phone, rent: t.rent, daysUntilDue: 15, paid: false, leaseEnds: "Nov 2027" } : u)),
          );
        }}
      />
    </DashShell>
  );
}
