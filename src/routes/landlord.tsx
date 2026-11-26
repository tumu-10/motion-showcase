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
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdvanceView } from "@/components/landlord/AdvanceView";
import { ComplaintsView } from "@/components/landlord/ComplaintsView";
import { EfrisView } from "@/components/landlord/EfrisView";
import { HomeServicesManagement } from "@/components/landlord/HomeServicesManagement";
import { MoveInWizard, type MoveInSubmission } from "@/components/landlord/MoveInWizard";
import { NoticesView } from "@/components/landlord/NoticesView";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { Overview } from "@/components/landlord/Overview";
import { PaymentsView } from "@/components/landlord/PaymentsView";
import { ReportsView } from "@/components/landlord/ReportsView";
import { ReceiptSettings } from "@/components/landlord/ReceiptSettings";
import { SecurityView } from "@/components/landlord/SecurityView";
import { UnitSheet } from "@/components/landlord/UnitSheet";
import { UraView } from "@/components/landlord/UraView";
import { UnitsView } from "@/components/landlord/UnitsView";
import { DashShell, type NavItem } from "@/components/shared/DashShell";
import { CalendarView, type CalendarEvent } from "@/components/shared/CalendarView";
import { formatUGX, getRentStatus } from "@/lib/rent";
import { getReceiptRecords } from "@/lib/receipt-branding";
import { createNotification } from "@/lib/notifications";
import { calculateMoveInTotal, formatCoveredUntil, recordMoveInPayment } from "@/lib/tenancy";
import { issueDepositReceipt, issueRentReceipt } from "@/lib/receipt-helpers";
import type { DepositDeduction, Tenancy } from "@/lib/tenancy";
import type { PropertyHomeServiceSettings, HomeServiceRequestStatus } from "@/lib/home-services";
import {
  addRentPeriodMonths,
  currentRentPeriod,
  formatRentPeriodRange,
  getNextUncoveredRentPeriod,
  getUnitPeriodCredit,
  getUnitRentChargeForMonths,
  localDateIso,
  allocateRentPayment,
} from "@/lib/rent-accounting";
import { useRentDemoData } from "@/lib/useRentDemoData";
import type { ReportKind } from "@/lib/reports";
import { setTenantActive, type TenantNotice } from "@/lib/tenant-demo";
import { defaultLandlordDemoSettings, readLandlordDemoSettings } from "@/lib/demo-settings";
import type { RentAuditLogEntry } from "@/lib/rent-demo";
import { dataSource } from "@/lib/data-source";
import { requireRole } from "@/lib/auth/route-guards";
import { authService } from "@/lib/auth/auth-service";
import { LandlordReviewDashboard } from "@/components/auth/LandlordOnboarding";
import { SessionActivityGuard } from "@/components/auth/SessionActivityGuard";
import type {
  LedgerEntry,
  RentPaymentMethod,
  Complaint,
  TenantNotification,
  Unit,
} from "@/lib/sample-data";

export const Route = createFileRoute("/landlord")({
  beforeLoad: () => requireRole("landlord", { allowDemo: true }),
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
  | "notifications"
  | "ura"
  | "efris"
  | "home-services"
  | "settings";

function LandlordPage() {
  const session = authService.getSession();
  if (
    session?.role === "landlord" &&
    session.landlordStatus !== "verified"
  ) {
    return (
      <SessionActivityGuard>
        <LandlordReviewDashboard />
      </SessionActivityGuard>
    );
  }
  return (
    <SessionActivityGuard>
      <LandlordDashboard />
    </SessionActivityGuard>
  );
}

function LandlordDashboard() {
  const [view, setView] = useState<View>("overview");
  const [defaultRentDueDay, setDefaultRentDueDay] = useState(
    defaultLandlordDemoSettings.defaultRentDueDay,
  );
  const [reportsInitialReport, setReportsInitialReport] = useState<ReportKind | undefined>();
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
  const landlordNotifications = rentData.notifications.filter(
    (notification) => notification.audience === "landlord",
  );
  const unreadLandlordNotifications = landlordNotifications.filter(
    (notification) => !notification.read,
  ).length;
  const [requests, setRequests] = useState<Complaint[]>(() => dataSource.complaints);
  const [reminded, setReminded] = useState<string[]>([]);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [presetUnit, setPresetUnit] = useState<string | undefined>();
  const [noticePresetUnitId, setNoticePresetUnitId] = useState<string | undefined>();

  useEffect(() => {
    try {
      setDefaultRentDueDay(readLandlordDemoSettings().defaultRentDueDay);
    } catch (error) {
      toast.error("Landlord settings could not be loaded.", {
        description: error instanceof Error ? error.message : "Check browser storage and retry.",
      });
    }
  }, []);

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
    {
      id: "notifications",
      label: "Notifications",
      icon: BellRing,
      badge: unreadLandlordNotifications,
      mobileMore: true,
    },
    { id: "advance", label: "Advance", icon: BadgeDollarSign, mobileMore: true },
    { id: "security", label: "Security", icon: ShieldCheck, mobileMore: true },
    { id: "notices", label: "Notices", icon: BellRing, mobileMore: true },
    { id: "ura", label: "URA", icon: Landmark, mobileMore: true },
    { id: "efris", label: "EFRIS", icon: ChartNoAxesCombined, mobileMore: true },
    { id: "home-services", label: "Home services", icon: Wrench, mobileMore: true },
    { id: "calendar", label: "Calendar", icon: CalendarRange, mobileMore: true },
    { id: "settings", label: "Settings", icon: Settings, mobileMore: true },
  ];

  const remind = (id: string) => {
    const u = units.find((x) => x.id === id);
    const reminderId = u ? `reminder-${u.id}-${Date.now()}` : null;
    setReminded((r) => [...r, id]);
    if (u) {
      const now = new Date();
      const notification = createNotification({
        id: reminderId!,
        unitId: u.id,
        unit: u.unit,
        audience: "tenant",
        eventType: "rent-due-soon",
        kind: "rent",
        title: "Rent reminder from your landlord",
        message: `Your rent of ${formatUGX(u.rent)} is due. Please contact your landlord if you need help.`,
        createdAt: now.toISOString(),
        read: false,
      });
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
    const notification = createNotification({
      id: `advance-reminder-${unit.id}-${Date.now()}`,
      unitId: unit.id,
      unit: unit.unit,
      audience: "tenant",
      eventType: "advance-running-out",
      kind: "advance",
      title: "Your rent advance is running out",
      message: `Your rent is covered through ${formatCoveredUntil(coveredUntil)}. Please plan for your next rent payment.`,
      createdAt: now.toISOString(),
      read: false,
    });
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
    const notification = createNotification({
      id: `move-in-notification-${request.id}`,
      unitId: unit.id,
      unit: unit.unit,
      audience: "tenant",
      kind: "rent",
      title: "Move-in payment request",
      message: `${formatUGX(request.amountDue)} is due to start your tenancy at ${unit.unit}. Part payments are allowed.`,
      createdAt: now.toISOString(),
      read: false,
    });
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
        const paymentNotifications: TenantNotification[] = [
          createNotification({
            id: `move-in-receipt:${moveInPaymentId}`,
            audience: "tenant",
            eventType: "receipt",
            unitId: unit.id,
            unit: unit.unit,
            kind: "payment",
            title: "Move-in payment receipt",
            message: `${formatUGX(initialPayment)} was recorded for ${unit.property} · Unit ${unit.unit}.`,
            createdAt: now.toISOString(),
            read: false,
          }),
        ];
        if (payment.request.rentPaid > 0) {
          paymentNotifications.push(
            createNotification({
              id: `move-in-rent-received:${moveInPaymentId}`,
              audience: "landlord",
              eventType: tenancy.advanceMonths > 1 ? "advance-received" : "payment-received",
              unitId: unit.id,
              unit: unit.unit,
              kind: tenancy.advanceMonths > 1 ? "advance" : "payment",
              title: tenancy.advanceMonths > 1 ? "Advance rent received" : "Rent payment received",
              message: `${formatUGX(payment.request.rentPaid)} was received for ${tenancy.tenantName} · ${unit.property} · Unit ${unit.unit}.`,
              createdAt: now.toISOString(),
              read: false,
            }),
          );
        }
        if (payment.request.depositPaid > 0) {
          paymentNotifications.push(
            createNotification({
              id: `move-in-deposit-received:${moveInPaymentId}`,
              audience: "landlord",
              eventType: "deposit-received",
              unitId: unit.id,
              unit: unit.unit,
              kind: "update",
              title: "Security deposit received",
              message: `${formatUGX(payment.request.depositPaid)} deposit was received for ${tenancy.tenantName} · ${unit.property} · Unit ${unit.unit}.`,
              createdAt: now.toISOString(),
              read: false,
            }),
          );
        }
        nextState = {
          ...nextState,
          units: payment.units,
          ledger: payment.rentLedger,
          depositLedger: payment.depositLedger,
          tenancies: [payment.tenancy, ...rentData.tenancies],
          moveInRequests: [payment.request, ...rentData.moveInRequests],
          notifications: [...paymentNotifications, ...nextState.notifications],
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
      const paymentNotifications: TenantNotification[] = [
        createNotification({
          id: `move-in-payment-notification-${Date.now()}`,
          unitId: openUnit.id,
          unit: openUnit.unit,
          audience: "tenant",
          eventType: "receipt",
          kind: "payment",
          title: "Move-in payment received",
          message: `${formatUGX(amount)} was received. ${payment.request.status === "Paid" ? "Your tenancy is active." : `${formatUGX(payment.request.amountDue - payment.request.amountPaid)} remains due.`}`,
          createdAt: now.toISOString(),
          read: false,
        }),
      ];
      const rentReceived = payment.request.rentPaid - openMoveInRequest.rentPaid;
      const depositReceived = payment.request.depositPaid - openMoveInRequest.depositPaid;
      if (rentReceived > 0) {
        paymentNotifications.push(
          createNotification({
            id: `move-in-rent-received:${paymentId}`,
            audience: "landlord",
            eventType: payment.tenancy.advanceMonths > 1 ? "advance-received" : "payment-received",
            unitId: openUnit.id,
            unit: openUnit.unit,
            kind: payment.tenancy.advanceMonths > 1 ? "advance" : "payment",
            title:
              payment.tenancy.advanceMonths > 1 ? "Advance rent received" : "Rent payment received",
            message: `${formatUGX(rentReceived)} was received for ${openTenancy.tenantName} · ${openUnit.property} · Unit ${openUnit.unit}.`,
            createdAt: now.toISOString(),
            read: false,
          }),
        );
      }
      if (depositReceived > 0) {
        paymentNotifications.push(
          createNotification({
            id: `move-in-deposit-received:${paymentId}`,
            audience: "landlord",
            eventType: "deposit-received",
            unitId: openUnit.id,
            unit: openUnit.unit,
            kind: "update",
            title: "Security deposit received",
            message: `${formatUGX(depositReceived)} deposit was received for ${openTenancy.tenantName} · ${openUnit.property} · Unit ${openUnit.unit}.`,
            createdAt: now.toISOString(),
            read: false,
          }),
        );
      }
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
        notifications: [...paymentNotifications, ...current.notifications],
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
    if (!entry || entry.status === "Refunded" || entry.status === "Partly refunded") {
      toast.error("This deposit can no longer be refunded from this request.");
      return;
    }
    const now = new Date();
    const notification = createNotification({
      id: `deposit-refund-${entry.id}-${Date.now()}`,
      unitId: entry.unitId,
      unit: entry.unit,
      audience: "tenant",
      eventType: "refund-update",
      kind: "update",
      title: "Security deposit refund proposed",
      message: `${formatUGX(refundAmount)} is proposed after ${formatUGX(arrears)} in arrears and ${formatUGX(deductions.reduce((sum, item) => sum + item.amount, 0))} in itemised deductions. You can accept or dispute.`,
      createdAt: now.toISOString(),
      read: false,
    });
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
    const status =
      decision === "accept"
        ? (entry.refundAmount ?? 0) < entry.amount
          ? "Partly refunded"
          : "Refunded"
        : "Disputed";
    const notification = createNotification({
      id: `deposit-decision-${entry.id}-${Date.now()}`,
      unitId: entry.unitId,
      unit: entry.unit,
      audience: "landlord",
      eventType: "refund-update",
      kind: "update",
      title: decision === "accept" ? "Deposit refund accepted" : "Deposit refund disputed",
      message:
        decision === "accept"
          ? `The proposed refund of ${formatUGX(entry.refundAmount ?? 0)} was accepted.`
          : "The tenant disputed the proposed deposit deductions. Please contact them to resolve it.",
      createdAt: resolvedAt,
      read: false,
    });
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

  const recordRentPayment = (
    id: string,
    monthsCovered: number,
    method: RentPaymentMethod,
    reference: string,
    receiptPhotoDataUrl?: string,
  ) => {
    const u = units.find((x) => x.id === id);
    if (!u?.tenant) {
      toast.error("Choose an occupied unit before recording rent.");
      return false;
    }
    if (!Number.isInteger(monthsCovered) || monthsCovered < 1 || monthsCovered > 12) {
      toast.error("Choose between 1 and 12 rent months.");
      return false;
    }
    if (!reference.trim() || reference.trim().length > 120) {
      toast.error("Enter a payment reference of 120 characters or fewer.");
      return false;
    }
    if (receiptPhotoDataUrl && method !== "Cash") {
      toast.error("A cash receipt photo can only be attached to a cash payment.");
      return false;
    }
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
      method,
      reference: reference.trim(),
      status: "Confirmed",
      rentPeriod,
      monthsCovered,
      coverageAmounts,
      ...(receiptPhotoDataUrl ? { receiptPhotoDataUrl } : {}),
    };
    const nextLedger = [entry, ...ledger];
    const paidAfter = getUnitPeriodCredit(u, nextLedger, period) >= u.rent;
    const auditEntry: RentAuditLogEntry = {
      id: `audit-${entry.id}`,
      unitId: u.id,
      actor: "Landlord demo account",
      createdAt: now.toISOString(),
      action: "Rent payment recorded",
      changes: `${formatUGX(entry.amount)} recorded via ${method}; reference ${entry.reference}; ${monthsCovered} rent month${monthsCovered === 1 ? "" : "s"} added. Rent status: ${u.paid ? "Paid" : "Not fully paid"} → ${paidAfter ? "Paid" : "Not fully paid"}${receiptPhotoDataUrl ? "; cash receipt photo attached" : ""}.`,
    };
    const notification = createNotification({
      id: `payment-${entry.id}`,
      unitId: u.id,
      unit: u.unit,
      audience: "tenant",
      eventType: "receipt",
      kind: monthsCovered > 1 ? "advance" : "payment",
      title: monthsCovered > 1 ? "Advance rent recorded" : "Rent payment recorded",
      message: `${formatUGX(entry.amount)} was recorded for ${formatRentPeriodRange(
        entry.rentPeriod,
        monthsCovered,
      )}.`,
      createdAt: now.toISOString(),
      read: false,
    });
    const landlordNotification = createNotification({
      id: `payment-received:landlord:${entry.id}`,
      unitId: u.id,
      unit: u.unit,
      audience: "landlord",
      eventType: monthsCovered > 1 ? "advance-received" : "payment-received",
      kind: monthsCovered > 1 ? "advance" : "payment",
      title: monthsCovered > 1 ? "Advance rent received" : "Rent payment received",
      message: `${formatUGX(entry.amount)} was recorded for ${u.tenant} · ${u.property} · Unit ${u.unit}.`,
      createdAt: now.toISOString(),
      read: false,
    });
    setRentData((current) => {
      return {
        ...current,
        ledger: [entry, ...current.ledger],
        auditLog: [auditEntry, ...current.auditLog],
        units: current.units.map((unit) =>
          unit.id === u.id
            ? {
                ...unit,
                paid: getUnitPeriodCredit(unit, [entry, ...current.ledger], period) >= unit.rent,
              }
            : unit,
        ),
        notifications: [
          notification,
          landlordNotification,
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
    return true;
  };

  const recordCashPayment = (unitId: string, amount: number, receivedAt: string) => {
    const now = new Date();
    const unit = units.find((item) => item.id === unitId);
    if (!unit?.tenant) {
      toast.error("Choose an occupied unit before recording rent.");
      return false;
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      toast.error("Enter a positive whole-UGX amount.");
      return false;
    }
    const receivedDate = new Date(`${receivedAt}T12:00:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(receivedAt) ||
      Number.isNaN(receivedDate.getTime()) ||
      localDateIso(receivedDate) !== receivedAt ||
      receivedAt > localDateIso(now)
    ) {
      toast.error("Choose a valid received date that is not in the future.");
      return false;
    }

    const allocationPeriod = currentRentPeriod(receivedDate);
    let coverage: ReturnType<typeof allocateRentPayment>;
    try {
      coverage = allocateRentPayment(unit, ledger, allocationPeriod, amount);
    } catch (error) {
      toast.error("Cash payment could not be recorded.", {
        description:
          error instanceof Error ? error.message : "Check the amount and outstanding rent.",
      });
      return false;
    }

    const reference = `CASH-${receivedAt.replace(/-/g, "")}-${Date.now().toString(36).toUpperCase()}`;
    const entry: LedgerEntry = {
      id: `cash-${reference}`,
      date: new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short" }).format(
        receivedDate,
      ),
      receivedAt,
      tenant: unit.tenant,
      unitId: unit.id,
      unit: unit.unit,
      amount,
      method: "Cash",
      reference,
      status: "Confirmed",
      ...coverage,
    };
    const createdAt = now.toISOString();
    let notification: TenantNotification;
    let landlordNotification: TenantNotification;
    try {
      notification = createNotification({
        id: `cash-receipt:tenant:${entry.id}`,
        unitId: unit.id,
        unit: unit.unit,
        audience: "tenant",
        eventType: "receipt",
        kind: entry.monthsCovered > 1 ? "advance" : "payment",
        title: "Cash payment received",
        message: `${formatUGX(amount)} recorded for ${formatRentPeriodRange(
          entry.rentPeriod,
          entry.monthsCovered,
        )}. Receipt reference ${reference}.`,
        createdAt,
        read: false,
      });
      landlordNotification = createNotification({
        id: `cash-payment:landlord:${entry.id}`,
        unitId: unit.id,
        unit: unit.unit,
        audience: "landlord",
        eventType: entry.monthsCovered > 1 ? "advance-received" : "payment-received",
        kind: entry.monthsCovered > 1 ? "advance" : "payment",
        title: "Cash rent payment recorded",
        message: `${formatUGX(amount)} received from ${unit.tenant} · ${unit.property} · Unit ${unit.unit}.`,
        createdAt,
        read: false,
      });
    } catch (error) {
      toast.error("Payment notifications could not be prepared.", {
        description: error instanceof Error ? error.message : "Check notification settings.",
      });
      return false;
    }

    const nextLedger = [entry, ...ledger];
    const paidAfter = getUnitPeriodCredit(unit, nextLedger, period) >= unit.rent;
    const auditEntry: RentAuditLogEntry = {
      id: `audit-${entry.id}`,
      unitId: unit.id,
      actor: "Landlord demo account",
      createdAt,
      action: "Cash rent payment recorded",
      changes: `${formatUGX(entry.amount)} recorded via Cash; reference ${entry.reference}; ${entry.monthsCovered} rent month${entry.monthsCovered === 1 ? "" : "s"} allocated. Rent status: ${unit.paid ? "Paid" : "Not fully paid"} → ${paidAfter ? "Paid" : "Not fully paid"}.`,
    };
    setRentData((current) => ({
      ...current,
      ledger: [entry, ...current.ledger],
      auditLog: [auditEntry, ...current.auditLog],
      units: current.units.map((currentUnit) =>
        currentUnit.id === unit.id
          ? {
              ...currentUnit,
              paid: getUnitPeriodCredit(currentUnit, nextLedger, period) >= currentUnit.rent,
            }
          : currentUnit,
      ),
      notifications: [notification, landlordNotification, ...current.notifications],
    }));

    try {
      const balanceAfter = Math.max(
        0,
        unit.rent - getUnitPeriodCredit(unit, nextLedger, entry.rentPeriod),
      );
      issueRentReceipt(entry, unit.property, balanceAfter);
    } catch (error) {
      toast.error("Payment recorded, but its receipt could not be generated.", {
        description: error instanceof Error ? error.message : "Open payment history to try again.",
      });
    }
    toast.success("Cash payment recorded", {
      description: `${formatUGX(amount)} for ${unit.tenant} · ${unit.unit}.`,
    });
    return true;
  };

  const confirmPayment = (id: string) => {
    const pending = ledger.find((entry) => entry.id === id);
    if (!pending || pending.status !== "Pending") {
      toast.error("This payment is no longer waiting for confirmation.");
      return;
    }
    const now = new Date();
    const notification = createNotification({
      id: `payment-${pending.id}`,
      unitId: pending.unitId,
      unit: pending.unit,
      audience: "tenant",
      eventType: "receipt",
      kind: "payment",
      title: "Rent payment confirmed",
      message: `${formatUGX(pending.amount)} was confirmed for ${pending.unit}.`,
      createdAt: now.toISOString(),
      read: false,
    });
    const landlordNotification = createNotification({
      id: `payment-received:landlord:${pending.id}`,
      unitId: pending.unitId,
      unit: pending.unit,
      audience: "landlord",
      eventType: pending.monthsCovered > 1 ? "advance-received" : "payment-received",
      kind: pending.monthsCovered > 1 ? "advance" : "payment",
      title: pending.monthsCovered > 1 ? "Advance rent confirmed" : "Rent payment received",
      message: `${formatUGX(pending.amount)} was confirmed for ${pending.tenant} · Unit ${pending.unit}.`,
      createdAt: now.toISOString(),
      read: false,
    });
    const confirmedEntry = { ...pending, status: "Confirmed" as const };
    const nextLedgerForReceipt = ledger.map((entry) => (entry.id === id ? confirmedEntry : entry));
    setRentData((current) => {
      const nextLedger = current.ledger.map((entry) => (entry.id === id ? confirmedEntry : entry));
      const unit = current.units.find((item) => item.id === pending.unitId);
      const paidAfter = unit ? getUnitPeriodCredit(unit, nextLedger, period) >= unit.rent : false;
      const auditEntry: RentAuditLogEntry = {
        id: `audit-${pending.id}`,
        unitId: pending.unitId,
        actor: "Landlord demo account",
        createdAt: now.toISOString(),
        action: "Pending rent payment confirmed",
        changes: `${formatUGX(pending.amount)} confirmed via ${pending.method}; reference ${pending.reference}. Rent status is now ${paidAfter ? "Paid" : "Not fully paid"}.`,
      };
      return {
        ...current,
        ledger: nextLedger,
        auditLog: [auditEntry, ...current.auditLog],
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
          landlordNotification,
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
    const request = requests.find((item) => item.id === id);
    if (!request || request.stage === "resolved") return;
    const next =
      dataSource.stageOrder[
        Math.min(dataSource.stageOrder.indexOf(request.stage) + 1, dataSource.stageOrder.length - 1)
      ];
    if (!next || next === request.stage) return;
    setRequests((list) => list.map((item) => (item.id === id ? { ...item, stage: next } : item)));
    const unit = units.find(
      (item) => item.unit === request.unit && item.property === request.property,
    );
    const notification = createNotification({
      id: `repair-update:${request.id}:${next}`,
      audience: "tenant",
      eventType: "repair-update",
      ...(unit ? { unitId: unit.id } : {}),
      unit: request.unit,
      kind: "update",
      title: `Repair update: ${dataSource.stageLabel[next]}`,
      message: `${request.title} · ${request.property} · Unit ${request.unit} is now ${dataSource.stageLabel[next].toLowerCase()}.`,
      createdAt: new Date().toISOString(),
      read: false,
    });
    setRentData((current) => ({
      ...current,
      notifications: [notification, ...current.notifications],
    }));
  };

  return (
    <DashShell
      current="/landlord"
      nav={nav}
      view={view}
      accountSettings={!!authService.getSession()}
      notificationCount={unreadLandlordNotifications}
      onOpenNotifications={() => setView("notifications")}
      onView={(nextView) => {
        if (nextView === "reports") setReportsInitialReport(undefined);
        setView(nextView);
      }}
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
        <PaymentsView
          ledger={ledger}
          units={units}
          onConfirm={confirmPayment}
          onRecordCashPayment={recordCashPayment}
        />
      )}
      {view === "calendar" && (
        <CalendarView events={landlordCalendarEvents(units, requests)} audience="landlord" />
      )}
      {view === "reports" && (
        <ReportsView
          {...(reportsInitialReport ? { initialReport: reportsInitialReport } : {})}
          units={units}
          ledger={ledger}
          deposits={rentData.depositLedger}
          notifications={rentData.notifications}
          complaints={requests}
          tenancies={rentData.tenancies}
          receipts={getReceiptRecords()}
        />
      )}
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
        <NoticesView
          units={units}
          ledger={ledger}
          tenancies={rentData.tenancies}
          presetUnitId={noticePresetUnitId}
          onNoticeSaved={(notice: TenantNotice) => {
            const now = new Date();
            const noticeUnit = units.find(
              (unit) => unit.unit === notice.unit && unit.property === notice.property,
            );
            const notification = createNotification({
              id: `notice-${notice.id}`,
              ...(noticeUnit ? { unitId: noticeUnit.id } : {}),
              unit: notice.unit,
              audience: "tenant",
              eventType: "notice-received",
              kind: "update",
              title: "A notice from your landlord",
              message: `${notice.reason}${notice.effectiveDate ? ` · Effective ${notice.effectiveDate}` : ""}`,
              createdAt: now.toISOString(),
              read: false,
            });
            setRentData((current) => ({
              ...current,
              notifications: [notification, ...current.notifications],
            }));
          }}
        />
      )}
      {view === "notifications" && (
        <NotificationCenter
          audience="landlord"
          notifications={landlordNotifications}
          onRead={(id) =>
            setRentData((current) => ({
              ...current,
              notifications: current.notifications.map((item) =>
                item.id === id ? { ...item, read: true } : item,
              ),
            }))
          }
          onMarkAllRead={() =>
            setRentData((current) => ({
              ...current,
              notifications: current.notifications.map((item) =>
                item.audience === "landlord" ? { ...item, read: true } : item,
              ),
            }))
          }
        />
      )}
      {view === "ura" && (
        <UraView
          units={units}
          onOpenTaxPack={() => {
            setReportsInitialReport("annual-tax");
            setView("reports");
          }}
          onOpenEfris={() => setView("efris")}
        />
      )}
      {view === "efris" && (
        <EfrisView
          units={units}
          onEfrisFailure={(receipt, errorMessage) => {
            const unit = units.find(
              (item) =>
                item.property === receipt.content.property && item.unit === receipt.content.unit,
            );
            const notification = createNotification({
              id: `efris-failure:${receipt.receiptNumber}:${receipt.efris.attemptCount}`,
              audience: "landlord",
              eventType: "efris-failure",
              ...(unit ? { unitId: unit.id } : {}),
              unit: receipt.content.unit,
              kind: "update",
              title: "Mock EFRIS submission failed",
              message: `${receipt.content.tenant} · ${receipt.content.property} · Unit ${receipt.content.unit}: ${errorMessage}`,
              createdAt: new Date().toISOString(),
              read: false,
            });
            setRentData((current) => ({
              ...current,
              notifications: [notification, ...current.notifications],
            }));
          }}
          onOpenReconciliation={() => {
            setReportsInitialReport("efris");
            setView("reports");
          }}
        />
      )}
      {view === "home-services" && (
        <HomeServicesManagement
          properties={[...new Set(rentData.units.map((unit) => unit.property))]}
          requests={rentData.homeServiceRequests}
          settings={rentData.propertyHomeServiceSettings}
          onSaveSettings={(property, updates: Partial<PropertyHomeServiceSettings>) =>
            setRentData((current) => {
              const existing = current.propertyHomeServiceSettings.find(
                (item) => item.property === property,
              );
              const next = {
                property,
                preferredProviderIds: [],
                ...existing,
                ...updates,
              };
              return {
                ...current,
                propertyHomeServiceSettings: [
                  next,
                  ...current.propertyHomeServiceSettings.filter(
                    (item) => item.property !== property,
                  ),
                ],
              };
            })
          }
          onRequestStatusChange={(id, status: HomeServiceRequestStatus) => {
            setRentData((current) => ({
              ...current,
              homeServiceRequests: current.homeServiceRequests.map((request) =>
                request.id === id ? { ...request, status } : request,
              ),
            }));
          }}
        />
      )}
      {view === "settings" && (
        <ReceiptSettings
          defaultRentDueDay={defaultRentDueDay}
          onDefaultRentDueDayChange={setDefaultRentDueDay}
        />
      )}

      <UnitSheet
        unit={openUnit}
        tenancy={openTenancy}
        moveInRequest={openMoveInRequest}
        auditLog={rentData.auditLog.filter((entry) => entry.unitId === openUnit?.id)}
        onClose={() => setOpenUnitId(null)}
        reminded={!!openUnit && reminded.includes(openUnit.id)}
        onRemind={() => openUnit && remind(openUnit.id)}
        onRecordPayment={(monthsCovered, method, reference, receiptPhotoDataUrl) =>
          openUnit
            ? recordRentPayment(openUnit.id, monthsCovered, method, reference, receiptPhotoDataUrl)
            : false
        }
        onRecordMoveInPayment={recordMoveInPartPayment}
        amountForMonths={(monthsCovered) =>
          openUnit ? getUnitRentChargeForMonths(openUnit, ledger, period, monthsCovered) : 0
        }
        onMoveOut={() => {
          if (!openUnit) return;
          const endingNotification = createNotification({
            id: `tenancy-ending:tenant:${openUnit.id}:${Date.now()}`,
            audience: "tenant",
            eventType: "tenancy-ending",
            unitId: openUnit.id,
            unit: openUnit.unit,
            kind: "update",
            title: "Tenancy ending recorded",
            message: `Your tenancy at ${openUnit.property} · Unit ${openUnit.unit} has been marked as ended by the landlord.`,
            createdAt: new Date().toISOString(),
            read: false,
          });
          setRentData((current) => ({
            ...current,
            notifications: [endingNotification, ...current.notifications],
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
                    vacantSince: localDateIso(),
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
          if (!openUnit) return;
          setNoticePresetUnitId(openUnit.id);
          setView("notices");
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
        {...(presetUnit ? { presetUnitId: presetUnit } : {})}
        defaultRentDueDay={defaultRentDueDay}
        onCreate={createMoveIn}
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
