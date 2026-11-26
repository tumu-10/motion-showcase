import * as sampleData from "./sample-data";
import { DEFAULT_DEPOSIT_MONTHS } from "./legal";
import { demoHomeServiceProviders } from "./home-services";
import type { DepositLedgerEntry } from "./tenancy";
import type { RentDemoState } from "./rent-demo";
import type { Unit } from "./sample-data";
import type { DataSource } from "./data-source";
import type { ReceiptBranding } from "./receipt-branding";

function createSampleDepositLedger(units: Unit[]): DepositLedgerEntry[] {
  const receivedAt = new Date().toISOString().slice(0, 10);
  return units.flatMap((unit) => {
    if (!unit.tenant) return [];
    return [
      {
        id: `sample-deposit-${unit.id}`,
        tenancyId: null,
        unitId: unit.id,
        tenant: unit.tenant,
        unit: unit.unit,
        amount: unit.rent * DEFAULT_DEPOSIT_MONTHS,
        receivedAt,
        status: "Held" as const,
        deductions: [],
        arrearsAtRefund: 0,
        refundAmount: null,
        refundRequestedAt: null,
        resolvedAt: null,
      },
    ];
  });
}

function getInitialRentDemoState(units: Unit[] = sampleData.units): RentDemoState {
  return {
    units,
    ledger: sampleData.ledger,
    notifications: sampleData.tenantNotifications,
    tenancies: [],
    depositLedger: createSampleDepositLedger(units),
    moveInRequests: [],
    homeServiceRequests: [],
    propertyHomeServiceSettings: [],
    auditLog: [],
  };
}

const defaultReceiptBranding: ReceiptBranding = {
  versionId: "propatiz-default",
  landlordName: "Kololo Heights Management",
  landlordAddress: "Kololo, Kampala, Uganda",
  landlordTin: "",
  landlordType: "individual",
  vatRegistered: false,
  efrisEnrollmentStatus: "not-enrolled",
  annualRentalIncomeUGX: null,
  logoChoice: "propatiz",
  customLogoDataUrl: null,
  brandColor: "#103b43",
  watermarkEnabled: true,
};

export const demoDataSource: DataSource = {
  ...sampleData,
  demoHomeServiceProviders,
  defaultReceiptBranding,
  getInitialRentDemoState,
};
