import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  Building2,
  CalendarRange,
  ChartNoAxesCombined,
  LayoutGrid,
  Landmark,
  MessageSquareText,
  BellRing,
  Settings,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdvanceView } from "@/components/landlord/AdvanceView";
import { ComplaintsView } from "@/components/landlord/ComplaintsView";
import { EvictionNoticeDialog } from "@/components/landlord/EvictionNoticeDialog";
import { MoveInWizard, type MoveInSubmission } from "@/components/landlord/MoveInWizard";
import { Overview } from "@/components/landlord/Overview";
import { PaymentsView } from "@/components/landlord/PaymentsView";
import { ReportsView } from "@/components/landlord/ReportsView";
import { ReceiptSettings } from "@/components/landlord/ReceiptSettings";
import { SecurityView } from "@/components/landlord/SecurityView";
import { UnitSheet } from "@/components/landlord/UnitSheet";
import { UnitsView } from "@/components/landlord/UnitsView";
import { DashShell, type NavItem } from "@/components/shared/DashShell";
import { CalendarView, type CalendarEvent } from "@/components/shared/CalendarView";
import { formatUGX, getRentStatus } from "@/lib/rent";
import { calculateMoveInTotal, formatCoveredUntil, recordMoveInPayment } from "@/lib/tenancy";
import { issueDepositReceipt, issueRentReceipt } from "@/lib/receipt-helpers";
import type { DepositDeduction, Tenancy } from "@/lib/tenancy";
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

type View =
  | "overview"
  | "units"
  | "complaints"
  | "payments"
  | "calendar"
  | "reports"
  | "advance"
  | "security"
  | "notices"
  | "ura"
  | "efris"
  | "settings";

function LandlordPage() {
  const [view, setView] = useState<View>("overview");
  const { data: rentData, setData: setRentData } = useRentDemoData();
  const period = currentRentPeriod();
  const units = useMemo(
    () =>
      rentData.units.map((unit) => {
        const pending = rentData.tenancies.find(
          (tenancy) => tenancy.unitId === unit.id && tenancy.status === "Pending move-in",
        );
        return {
          ...unit,
          pendingMoveIn: !!pending,
          pendingTenant: pending?.tenantName,
          paid: !!unit.tenant && getUnitPeriodCredit(unit, rentData.ledger, period) >= unit.rent,
        };
      }),
    [period, rentData.ledger, rentData.tenancies, rentData.units],
  );
  const ledger = rentData.ledger;
  const [requests, setRequests] = useState<Complaint[]>(complaints);
  const [reminded, setReminded] = useState<string[]>([]);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [presetUnit, setPresetUnit] = useState<string | undefined>();
  const [noticeUnit, setNoticeUnit] = useState<Unit | null>(null);

  const openUnit = units.find((u) => u.id === openUnitId) ?? null;
  const openTenancy = openUnit
    ? (rentData.tenancies.find(
        (tenancy) => tenancy.unitId === openUnit.id && tenancy.status !== "Ended",
      ) ?? null)
    : null;
  const openMoveInRequest = openTenancy
    ? (rentData.moveInRequests.find((request) => request.tenancyId === openTenancy.id) ?? null)
    : null;
  const vacant = useMemo(
    () => units.filter((unit) => !unit.tenant && !unit.pendingMoveIn),
    [units],
  );
  const overdueCount = units.filter(
    (u) => u.tenant && getRentStatus(u.daysUntilDue, u.paid) === "overdue",
  ).length;
  const openComplaints = requests.filter((r) => r.stage !== "resolved").length;

  const nav: NavItem<View>[] = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "units", label: "Units", icon: Building2, badge: overdueCount },
    { id: "complaints", label: "Repairs", icon: MessageSquareText, badge: openComplaints },
    { id: "payments", label: "Payments", icon: WalletCards },
    { id: "reports", label: "Reports", icon: ChartNoAxesCombined },
    { id: "advance", label: "Advance", icon: BadgeDollarSign, mobileMore: true },
    { id: "security", label: "Security", icon: ShieldCheck, mobileMore: true },
    { id: "notices", label: "Notices", icon: BellRing, mobileMore: true },
    { id: "ura", label: "URA", icon: Landmark, mobileMore: true },
    { id: "efris", label: "EFRIS", icon: ChartNoAxesCombined, mobileMore: true },
    { id: "calendar", label: "Calendar", icon: CalendarRange, mobileMore: true },
    { id: "settings", label: "Settings", icon: Settings, mobileMore: true },
  ];

  const remind = (id: string) => {
    const u = units.find((x) => x.id === id);
    const reminderId = u ? `reminder-${u.id}-${Date.now()}` : null;
    setReminded((r) => [...r, id]);
    if (u) {
      const now = new Date();
      const notification: TenantNotification = {
        id: reminderId!,
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
      action: u
        ? {
            label: "Undo",
            onClick: () => {
              setReminded((r) => r.filter((unitId) => unitId !== u.id));
              setRentData((current) => ({
                ...current,
                notifications: current.notifications.filter((item) => item.id !== reminderId),
              }));
              toast.success("Reminder removed");
            },
          }
        : undefined,
    });
  };

  const remindAdvance = (unit: Unit, coveredUntil: string) => {
    const now = new Date();
    const notification: TenantNotification = {
      id: `advance-reminder-${unit.id}-${Date.now()}`,
      unit: unit.unit,
      kind: "advance",
      title: "Your rent advance is running out",
      message: `Your rent is covered through ${formatCoveredUntil(coveredUntil)}. Please plan for your next rent payment.`,
      createdAt: now.toISOString(),
      read: false,
    };
    setReminded((current) => [...current, unit.id]);
    setRentData((current) => ({
      ...current,
      notifications: [notification, ...current.notifications],
    }));
    toast.success("Advance reminder sent", {
      description: `${unit.tenant} has been reminded that rent coverage ends ${formatCoveredUntil(coveredUntil)}.`,
    });
  };

  const createMoveIn = (input: MoveInSubmission) => {
    const now = new Date();
    const { initialPayment, ...moveInFields } = input;
    const tenancy: Tenancy = {
      ...moveInFields,
      id: `tenancy-${Date.now()}`,
      status: "Pending move-in",
    };
    const request = {
      id: `move-in-request-${Date.now()}`,
      tenancyId: tenancy.id,
      unitId: tenancy.unitId,
      tenantName: tenancy.tenantName,
      amountDue: calculateMoveInTotal(
        tenancy.monthlyRent,
        tenancy.advanceMonths,
        tenancy.depositMonths,
      ),
      amountPaid: 0,
      rentPaid: 0,
      depositPaid: 0,
      status: "Pending" as const,
      createdAt: now.toISOString(),
    };
    const unit = rentData.units.find((item) => item.id === tenancy.unitId);
    if (!unit) {
      toast.error("Could not start the move-in", {
        description: "The selected unit is no longer available.",
      });
      return;
    }

    const pendingUnits = rentData.units.map((item) =>
      item.id === unit.id
        ? { ...item, pendingMoveIn: true, pendingTenant: tenancy.tenantName }
        : item,
    );
    const notification: TenantNotification = {
      id: `move-in-notification-${request.id}`,
      unit: unit.unit,
      kind: "rent",
      title: "Move-in payment request",
      message: `${formatUGX(request.amountDue)} is due to start your tenancy at ${unit.unit}. Part payments are allowed.`,
      createdAt: now.toISOString(),
      read: false,
    };
    let nextState = {
      ...rentData,
      units: pendingUnits,
      tenancies: [tenancy, ...rentData.tenancies],
      moveInRequests: [request, ...rentData.moveInRequests],
      notifications: [notification, ...rentData.notifications],
    };
    let moveInPayment: ReturnType<typeof recordMoveInPayment> | undefined;
    let moveInPaymentId: string | undefined;

    try {
      if (initialPayment > 0) {
        moveInPaymentId = `move-in-payment-${Date.now()}`;
        const payment = recordMoveInPayment({
          tenancy,
          request,
          amount: initialPayment,
          units: pendingUnits,
          rentLedger: rentData.ledger,
          depositLedger: rentData.depositLedger,
          receivedAt: localDateIso(now),
          id: moveInPaymentId,
        });
        moveInPayment = payment;
        nextState = {
          ...nextState,
          units: payment.units,
          ledger: payment.rentLedger,
          depositLedger: payment.depositLedger,
          tenancies: [payment.tenancy, ...rentData.tenancies],
          moveInRequests: [payment.request, ...rentData.moveInRequests],
        };
        if (payment.tenancy.status === "Active" && unit.id === "u3") {
          setTenantActive(true, unit.unit);
        }
      }
    } catch (error) {
      toast.error("The initial part payment could not be recorded", {
        description: error instanceof Error ? error.message : "Check the payment amount and retry.",
      });
      return;
    }

    setRentData(nextState);
    if (moveInPayment && moveInPaymentId) {
      try {
        issueMoveInReceipts(moveInPayment, moveInPaymentId, unit.property);
      } catch (error) {
        toast.error("Move-in payment recorded, but a receipt could not be generated", {
          description:
            error instanceof Error ? error.message : "Open Security or Payments and retry.",
        });
      }
    }
    toast.success("Move-in payment request sent", {
      description: `${formatUGX(request.amountDue)} for ${tenancy.tenantName} · Unit ${unit.unit}.`,
    });
  };

  const recordMoveInPartPayment = (amount: number) => {
    if (!openTenancy || !openMoveInRequest || !openUnit) {
      toast.error("This move-in payment request is no longer available.");
      return;
    }
    const now = new Date();
    const paymentId = `move-in-payment-${Date.now()}`;
    try {
      const payment = recordMoveInPayment({
        tenancy: openTenancy,
        request: openMoveInRequest,
        amount,
        units: rentData.units,
        rentLedger: rentData.ledger,
        depositLedger: rentData.depositLedger,
        receivedAt: localDateIso(now),
        id: paymentId,
      });
      const notification: TenantNotification = {
        id: `move-in-payment-notification-${Date.now()}`,
        unit: openUnit.unit,
        kind: "payment",
        title: "Move-in payment received",
        message: `${formatUGX(amount)} was received. ${payment.request.status === "Paid" ? "Your tenancy is active." : `${formatUGX(payment.request.amountDue - payment.request.amountPaid)} remains due.`}`,
        createdAt: now.toISOString(),
        read: false,
      };
      setRentData((current) => ({
        ...current,
        units: payment.units,
        ledger: payment.rentLedger,
        depositLedger: payment.depositLedger,
        tenancies: current.tenancies.map((tenancy) =>
          tenancy.id === payment.tenancy.id ? payment.tenancy : tenancy,
        ),
        moveInRequests: current.moveInRequests.map((request) =>
          request.id === payment.request.id ? payment.request : request,
        ),
        notifications: [notification, ...current.notifications],
      }));
      try {
        issueMoveInReceipts(payment, paymentId, openUnit.property);
      } catch (error) {
        toast.error("Part payment recorded, but a receipt could not be generated", {
          description:
            error instanceof Error ? error.message : "Open Security or Payments and retry.",
        });
      }
      if (payment.tenancy.status === "Active" && openUnit.id === "u3") {
        setTenantActive(true, openUnit.unit);
      }
      toast.success(
        payment.tenancy.status === "Active" ? "Tenancy is now active" : "Part payment recorded",
        {
          description:
            payment.tenancy.status === "Active"
              ? `${openTenancy.tenantName} has paid the move-in minimum.`
              : `${formatUGX(payment.request.amountDue - payment.request.amountPaid)} remains before activation.`,
        },
      );
    } catch (error) {
      toast.error("Could not record the part payment", {
        description: error instanceof Error ? error.message : "Check the amount and try again.",
      });
    }
  };

  const proposeDepositRefund = (
    entryId: string,
    deductions: DepositDeduction[],
    arrears: number,
    refundAmount: number,
  ) => {
    const entry = rentData.depositLedger.find((item) => item.id === entryId);
    if (!entry || entry.status === "Refunded") {
      toast.error("This deposit can no longer be refunded from this request.");
      return;
    }
    const now = new Date();
    const notification: TenantNotification = {
      id: `deposit-refund-${entry.id}-${Date.now()}`,
      unit: entry.unit,
      kind: "update",
      title: "Security deposit refund proposed",
      message: `${formatUGX(refundAmount)} is proposed after ${formatUGX(arrears)} in arrears and ${formatUGX(deductions.reduce((sum, item) => sum + item.amount, 0))} in itemised deductions. You can accept or dispute.`,
      createdAt: now.toISOString(),
      read: false,
    };
    setRentData((current) => ({
      ...current,
      depositLedger: current.depositLedger.map((item) =>
        item.id === entryId
          ? {
              ...item,
              status: "Refund pending",
              deductions,
              arrearsAtRefund: arrears,
              refundAmount,
              refundRequestedAt: now.toISOString(),
              resolvedAt: null,
            }
          : item,
      ),
      notifications: [notification, ...current.notifications],
    }));
    toast.success("Refund proposal sent to the tenant");
  };

  const recordTenantDepositDecision = (entryId: string, decision: "accept" | "dispute") => {
    const entry = rentData.depositLedger.find((item) => item.id === entryId);
    if (!entry || entry.status !== "Refund pending") {
      toast.error("This refund is no longer waiting for a tenant response.");
      return;
    }
    const resolvedAt = new Date().toISOString();
    const status = decision === "accept" ? "Refunded" : "Disputed";
    const notification: TenantNotification = {
      id: `deposit-decision-${entry.id}-${Date.now()}`,
      unit: entry.unit,
      kind: "update",
      title: decision === "accept" ? "Deposit refund accepted" : "Deposit refund disputed",
      message:
        decision === "accept"
          ? `The proposed refund of ${formatUGX(entry.refundAmount ?? 0)} was accepted.`
          : "The tenant disputed the proposed deposit deductions. Please contact them to resolve it.",
      createdAt: resolvedAt,
      read: false,
    };
    setRentData((current) => ({
      ...current,
      depositLedger: current.depositLedger.map((item) =>
        item.id === entryId
          ? { ...item, status, resolvedAt: decision === "accept" ? resolvedAt : null }
          : item,
      ),
      notifications: [notification, ...current.notifications],
    }));
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
    try {
      const nextLedger = [entry, ...ledger];
      const balanceAfter = Math.max(0, u.rent - getUnitPeriodCredit(u, nextLedger, rentPeriod));
      issueRentReceipt(entry, u.property, balanceAfter);
    } catch (error) {
      toast.error("Payment recorded, but its receipt could not be generated", {
        description: error instanceof Error ? error.message : "Open payment history and try again.",
      });
    }
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
    const confirmedEntry = { ...pending, status: "Confirmed" as const };
    const nextLedgerForReceipt = ledger.map((entry) => (entry.id === id ? confirmedEntry : entry));
    setRentData((current) => {
      const nextLedger = current.ledger.map((entry) => (entry.id === id ? confirmedEntry : entry));
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
    try {
      const unit = units.find((item) => item.id === pending.unitId);
      if (!unit) throw new Error("The property for this payment could not be found.");
      const balanceAfter = Math.max(
        0,
        unit.rent - getUnitPeriodCredit(unit, nextLedgerForReceipt, pending.rentPeriod),
      );
      issueRentReceipt(confirmedEntry, unit.property, balanceAfter);
    } catch (error) {
      toast.error("Payment confirmed, but its receipt could not be generated", {
        description: error instanceof Error ? error.message : "Open payment history and try again.",
      });
    }
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
          ledger={ledger}
          depositLedger={rentData.depositLedger}
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
      {view === "payments" && (
        <PaymentsView ledger={ledger} units={units} onConfirm={confirmPayment} />
      )}
      {view === "calendar" && (
        <CalendarView events={landlordCalendarEvents(units, requests)} audience="landlord" />
      )}
      {view === "reports" && <ReportsView units={units} ledger={ledger} />}
      {view === "advance" && (
        <AdvanceView units={units} ledger={ledger} reminded={reminded} onRemind={remindAdvance} />
      )}
      {view === "security" && (
        <SecurityView
          units={units}
          rentLedger={ledger}
          depositLedger={rentData.depositLedger}
          onRequestRefund={proposeDepositRefund}
          onTenantDecision={recordTenantDepositDecision}
        />
      )}
      {view === "notices" && (
        <ComingSoonView
          title="Notices"
          description="Prepare reminders, demands, rent-increase notices and lawful move-out notices."
        />
      )}
      {view === "ura" && (
        <ComingSoonView
          title="URA tax pack"
          description="Review rental-income estimates and quarterly reminders. Guidance only."
        />
      )}
      {view === "efris" && (
        <ComingSoonView
          title="EFRIS"
          description="Monitor mock fiscal receipt status and reconciliation. Nothing is sent to URA in the demo."
        />
      )}
      {view === "settings" && <ReceiptSettings />}

      <UnitSheet
        unit={openUnit}
        tenancy={openTenancy}
        moveInRequest={openMoveInRequest}
        onClose={() => setOpenUnitId(null)}
        reminded={!!openUnit && reminded.includes(openUnit.id)}
        onRemind={() => openUnit && remind(openUnit.id)}
        onRecordPayment={(monthsCovered) =>
          openUnit && recordRentPayment(openUnit.id, monthsCovered)
        }
        onRecordMoveInPayment={recordMoveInPartPayment}
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
            tenancies: current.tenancies.map((tenancy) =>
              tenancy.unitId === openUnit.id && tenancy.status !== "Ended"
                ? { ...tenancy, status: "Ended" }
                : tenancy,
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
      <MoveInWizard
        open={addOpen}
        onOpenChange={setAddOpen}
        vacantUnits={vacant}
        presetUnitId={presetUnit}
        onCreate={createMoveIn}
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

function ComingSoonView({ title, description }: { title: string; description: string }) {
  return (
    <section className="surface min-h-[18rem] p-6 sm:p-8">
      <p className="text-eyebrow text-primary">Coming in the next phase</p>
      <h1 className="mt-3 text-3xl font-bold text-primary-deep">{title}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">{description}</p>
    </section>
  );
}

function issueMoveInReceipts(
  payment: ReturnType<typeof recordMoveInPayment>,
  paymentId: string,
  property: string,
) {
  const rentEntry = payment.rentLedger.find((entry) => entry.id === paymentId);
  if (rentEntry) {
    const unit = payment.units.find((item) => item.id === rentEntry.unitId);
    if (!unit) throw new Error("The property for this move-in payment could not be found.");
    const balanceAfter = Math.max(
      0,
      unit.rent - getUnitPeriodCredit(unit, payment.rentLedger, rentEntry.rentPeriod),
    );
    issueRentReceipt(rentEntry, property, balanceAfter);
  }
  const depositEntry = payment.depositLedger.find(
    (entry) => entry.tenancyId === payment.tenancy.id,
  );
  if (depositEntry) issueDepositReceipt(depositEntry, property);
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
