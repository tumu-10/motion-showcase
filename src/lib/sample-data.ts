/**
 * Sample data for the interactive demo. Every name, unit and amount here is illustrative,
 * not a real customer or result. Screens that show it carry a "Sample data" tag.
 */
import listing1 from "@/assets/listing-1.jpg";
import listing2 from "@/assets/listing-2.jpg";
import listing3 from "@/assets/listing-3.jpg";
import hero from "@/assets/hero-kampala.jpg";

export const tenantProfile = {
  name: "Amina Nakato",
  firstName: "Amina",
  unit: "Unit B4",
  property: "Kololo Heights",
  landlord: "Kololo Heights Management",
  rent: 1_200_000,
  dueDay: 5,
  daysUntilDue: 5,
  cycleDays: 30,
  phone: "0772 123 456",
  paymentDetails: {
    mobileMoneyEnabled: true,
    mobileMoneyName: "Kololo Heights Management",
    mobileMoneyNumber: "0772 410 221",
    bankEnabled: true,
    bankName: "Stanbic Bank",
    bankAccountName: "Kololo Heights Management",
    bankAccountNumber: "9030012345678",
  },
};

export type LandlordPaymentDetails = {
  mobileMoneyEnabled: boolean;
  mobileMoneyName?: string | undefined;
  mobileMoneyNumber?: string | undefined;
  bankEnabled: boolean;
  bankName?: string | undefined;
  bankAccountName?: string | undefined;
  bankAccountNumber?: string | undefined;
};

export type SubscriptionPlan = "monthly" | "quarterly" | "yearly";
export const SUBSCRIPTION_RATE_PER_TENANT_MONTH = 5;
export type PropertyType =
  "apartment" | "rental-units" | "standalone-house" | "shop" | "office" | "mixed-use";
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Apartment / flats",
  "rental-units": "Rental units / rooms",
  "standalone-house": "Standalone house",
  shop: "Shop / retail space",
  office: "Office space",
  "mixed-use": "Mixed-use property",
};

export type Payment = {
  id: string;
  month: string;
  amount: number;
  method: "MTN Mobile Money" | "Airtel Money" | "Cash" | "Bank transfer" | "Visa" | "Mastercard";
  date: string;
  reference: string;
  status?: "Pending" | "Confirmed" | undefined;
};

export const tenantPayments: Payment[] = [
  {
    id: "p3",
    month: "October 2026",
    amount: 1_200_000,
    method: "MTN Mobile Money",
    date: "3 Oct 2026",
    reference: "PTZ-48213",
  },
  {
    id: "p2",
    month: "September 2026",
    amount: 1_200_000,
    method: "MTN Mobile Money",
    date: "4 Sep 2026",
    reference: "PTZ-47102",
  },
  {
    id: "p1",
    month: "August 2026",
    amount: 1_200_000,
    method: "Airtel Money",
    date: "5 Aug 2026",
    reference: "PTZ-45980",
  },
];

export type ComplaintStage = "submitted" | "assigned" | "in-progress" | "resolved";
export const stageOrder: ComplaintStage[] = ["submitted", "assigned", "in-progress", "resolved"];
export const stageLabel: Record<ComplaintStage, string> = {
  submitted: "New",
  assigned: "Under review",
  "in-progress": "Response sent",
  resolved: "Resolved",
};

export type Complaint = {
  id: string;
  title: string;
  category: string;
  unit: string;
  property: string;
  tenant: string;
  urgency: "Low" | "Normal" | "Urgent";
  stage: ComplaintStage;
  reported: string;
  description: string;
};

export const complaints: Complaint[] = [
  {
    id: "m1",
    title: "Kitchen sink leaking",
    category: "Plumbing",
    unit: "B4",
    property: "Kololo Heights",
    tenant: "Amina Nakato",
    urgency: "Normal",
    stage: "assigned",
    reported: "12 Nov",
    description: "Water drips from the pipe under the sink when the tap is on.",
  },
  {
    id: "m2",
    title: "No power in bedroom sockets",
    category: "Electrical",
    unit: "A2",
    property: "Kololo Heights",
    tenant: "Brian Okello",
    urgency: "Urgent",
    stage: "submitted",
    reported: "15 Nov",
    description: "Both sockets in the main bedroom stopped working last night.",
  },
  {
    id: "m3",
    title: "Gate lock is stiff",
    category: "Security",
    unit: "Compound",
    property: "Ntinda Court",
    tenant: "Grace Achieng",
    urgency: "Low",
    stage: "in-progress",
    reported: "9 Nov",
    description: "The main gate padlock is hard to open in the morning.",
  },
  {
    id: "m4",
    title: "Low water pressure",
    category: "Water",
    unit: "C1",
    property: "Ntinda Court",
    tenant: "Joseph Mugisha",
    urgency: "Normal",
    stage: "resolved",
    reported: "2 Nov",
    description: "Shower pressure has been very low for a week.",
  },
  {
    id: "m5",
    title: "Cracked window pane",
    category: "Other",
    unit: "D3",
    property: "Kira Gardens",
    tenant: "Sarah Namubiru",
    urgency: "Normal",
    stage: "submitted",
    reported: "14 Nov",
    description: "The small bathroom window has a crack across the glass.",
  },
];

export type Unit = {
  id: string;
  unit: string;
  property: string;
  tenant: string | null;
  phone: string;
  rent: number;
  daysUntilDue: number;
  paid: boolean;
  leaseEnds: string;
  email?: string | undefined;
  occupants?: number | undefined;
  occupation?: string | undefined;
  sex?: string | undefined;
  block?: string | undefined;
};

export const properties = ["Kololo Heights", "Ntinda Court", "Kira Gardens"] as const;

export const units: Unit[] = [
  {
    id: "u1",
    unit: "A1",
    property: "Kololo Heights",
    tenant: "Daniel Ssempijja",
    phone: "0772 410 221",
    rent: 1_500_000,
    daysUntilDue: 5,
    paid: true,
    leaseEnds: "Mar 2027",
  },
  {
    id: "u2",
    unit: "A2",
    property: "Kololo Heights",
    tenant: "Brian Okello",
    phone: "0752 330 118",
    rent: 1_500_000,
    daysUntilDue: -6,
    paid: false,
    leaseEnds: "Jan 2027",
  },
  {
    id: "u3",
    unit: "B4",
    property: "Kololo Heights",
    tenant: "Amina Nakato",
    phone: "0772 123 456",
    email: "amina@example.com",
    occupants: 2,
    occupation: "Accountant",
    sex: "Female",
    rent: 1_200_000,
    daysUntilDue: 5,
    paid: false,
    leaseEnds: "Jul 2027",
  },
  {
    id: "u4",
    unit: "B5",
    property: "Kololo Heights",
    tenant: "Ruth Kyomuhendo",
    phone: "0701 556 902",
    rent: 1_200_000,
    daysUntilDue: 5,
    paid: true,
    leaseEnds: "Aug 2027",
  },
  {
    id: "u5",
    unit: "C1",
    property: "Ntinda Court",
    tenant: "Joseph Mugisha",
    phone: "0784 220 331",
    rent: 850_000,
    daysUntilDue: 2,
    paid: false,
    leaseEnds: "Dec 2026",
  },
  {
    id: "u6",
    unit: "C2",
    property: "Ntinda Court",
    tenant: "Grace Achieng",
    phone: "0759 118 440",
    rent: 850_000,
    daysUntilDue: 2,
    paid: true,
    leaseEnds: "May 2027",
  },
  {
    id: "u7",
    unit: "C3",
    property: "Ntinda Court",
    tenant: null,
    phone: "",
    rent: 850_000,
    daysUntilDue: 0,
    paid: false,
    leaseEnds: "-",
  },
  {
    id: "u8",
    unit: "C4",
    property: "Ntinda Court",
    tenant: "Peter Byaruhanga",
    phone: "0776 902 114",
    rent: 900_000,
    daysUntilDue: -12,
    paid: false,
    leaseEnds: "Feb 2027",
  },
  {
    id: "u9",
    unit: "D1",
    property: "Kira Gardens",
    tenant: "Esther Nabirye",
    phone: "0700 441 778",
    rent: 600_000,
    daysUntilDue: 12,
    paid: false,
    leaseEnds: "Oct 2027",
  },
  {
    id: "u10",
    unit: "D2",
    property: "Kira Gardens",
    tenant: "Moses Tumusiime",
    phone: "0782 664 019",
    rent: 600_000,
    daysUntilDue: 12,
    paid: true,
    leaseEnds: "Jun 2027",
  },
  {
    id: "u11",
    unit: "D3",
    property: "Kira Gardens",
    tenant: "Sarah Namubiru",
    phone: "0751 208 663",
    rent: 650_000,
    daysUntilDue: 4,
    paid: false,
    leaseEnds: "Sep 2027",
  },
  {
    id: "u12",
    unit: "D4",
    property: "Kira Gardens",
    tenant: "Ivan Kato",
    phone: "0774 338 902",
    rent: 650_000,
    daysUntilDue: -2,
    paid: false,
    leaseEnds: "Apr 2027",
  },
];

export const monthlyCollection = [
  { month: "Jun", collected: 9_150_000, expected: 10_400_000 },
  { month: "Jul", collected: 9_800_000, expected: 10_400_000 },
  { month: "Aug", collected: 10_100_000, expected: 10_400_000 },
  { month: "Sep", collected: 9_600_000, expected: 10_400_000 },
  { month: "Oct", collected: 10_250_000, expected: 11_250_000 },
  { month: "Nov", collected: 5_400_000, expected: 11_250_000 },
];

export type LedgerEntry = {
  id: string;
  date: string;
  tenant: string;
  unit: string;
  amount: number;
  method: "MTN Mobile Money" | "Airtel Money" | "Cash" | "Bank transfer" | "Visa" | "Mastercard";
  reference: string;
  status: "Confirmed" | "Pending" | "Failed";
};

export const ledger: LedgerEntry[] = [
  {
    id: "l1",
    date: "14 Nov",
    tenant: "Grace Achieng",
    unit: "C2",
    amount: 850_000,
    method: "Airtel Money",
    reference: "PTZ-49120",
    status: "Confirmed",
  },
  {
    id: "l2",
    date: "13 Nov",
    tenant: "Moses Tumusiime",
    unit: "D2",
    amount: 600_000,
    method: "MTN Mobile Money",
    reference: "PTZ-49087",
    status: "Confirmed",
  },
  {
    id: "l3",
    date: "13 Nov",
    tenant: "Ivan Kato",
    unit: "D4",
    amount: 650_000,
    method: "MTN Mobile Money",
    reference: "PTZ-49081",
    status: "Failed",
  },
  {
    id: "l4",
    date: "12 Nov",
    tenant: "Ruth Kyomuhendo",
    unit: "B5",
    amount: 1_200_000,
    method: "Airtel Money",
    reference: "PTZ-49044",
    status: "Confirmed",
  },
  {
    id: "l5",
    date: "11 Nov",
    tenant: "Daniel Ssempijja",
    unit: "A1",
    amount: 1_500_000,
    method: "Cash",
    reference: "CASH-0112",
    status: "Confirmed",
  },
  {
    id: "l6",
    date: "11 Nov",
    tenant: "Joseph Mugisha",
    unit: "C1",
    amount: 850_000,
    method: "MTN Mobile Money",
    reference: "PTZ-49012",
    status: "Pending",
  },
];

export type Listing = {
  id: string;
  title: string;
  area: string;
  bedrooms: number;
  rent: number;
  image: string;
  features: string[];
};

export const listings: Listing[] = [
  {
    id: "h1",
    title: "Two-bedroom apartment",
    area: "Ntinda",
    bedrooms: 2,
    rent: 1_100_000,
    image: listing1,
    features: ["Balcony", "Parking", "Water tank"],
  },
  {
    id: "h2",
    title: "Gated bungalow",
    area: "Kira",
    bedrooms: 2,
    rent: 750_000,
    image: listing2,
    features: ["Compound", "Security", "Yaka meter"],
  },
  {
    id: "h3",
    title: "Studio with balcony",
    area: "Kololo",
    bedrooms: 1,
    rent: 950_000,
    image: listing3,
    features: ["Furnished", "Hill view", "Lift"],
  },
  {
    id: "h4",
    title: "Three-bedroom flat",
    area: "Naalya",
    bedrooms: 3,
    rent: 1_600_000,
    image: hero,
    features: ["Garden", "Two bathrooms", "Parking"],
  },
];

export type Landlord = {
  id: string;
  name: string;
  contact: string;
  phone?: string | undefined;
  paymentDetails?: LandlordPaymentDetails | undefined;
  subscriptionPlan?: SubscriptionPlan | undefined;
  subscriptionPaidAmount?: number | undefined;
  subscriptionPaidAt?: string | undefined;
  properties: number;
  units: number;
  tenants?: number | undefined;
  collected?: number | undefined;
  propertyName?: string | undefined;
  propertyType?: PropertyType | undefined;
  blocks?: { name: string; units: string[] }[] | undefined;
  unitRents?: { block: string; unit: string; monthlyRent: number }[] | undefined;
  unitDetails?:
    | {
        block: string;
        unit: string;
        bedrooms: number;
        bathrooms: number;
        details?: string;
        electricityMeter?: string;
        waterMeter?: string;
      }[]
    | undefined;
  expectedMonthlyRent?: number | undefined;
  joined: string;
  verification: "Verified" | "Pending review" | "Suspended";
};

export const landlords: Landlord[] = [
  {
    id: "ll1",
    name: "Kololo Heights Management",
    contact: "Patricia Auma",
    propertyType: "apartment",
    properties: 1,
    units: 24,
    tenants: 20,
    collected: 4_250_000,
    joined: "Feb 2026",
    verification: "Verified",
  },
  {
    id: "ll2",
    name: "Ntinda Court Ltd",
    contact: "Robert Wasswa",
    propertyType: "rental-units",
    properties: 2,
    units: 18,
    tenants: 15,
    collected: 3_900_000,
    joined: "Apr 2026",
    verification: "Verified",
  },
  {
    id: "ll3",
    name: "Kira Gardens",
    contact: "Florence Nansubuga",
    propertyType: "standalone-house",
    properties: 1,
    units: 12,
    tenants: 9,
    collected: 2_100_000,
    joined: "Oct 2026",
    verification: "Pending review",
  },
  {
    id: "ll4",
    name: "Mukono Rentals",
    contact: "Henry Ochieng",
    propertyType: "mixed-use",
    properties: 3,
    units: 31,
    tenants: 26,
    collected: 5_800_000,
    joined: "Nov 2026",
    verification: "Pending review",
  },
  {
    id: "ll5",
    name: "Entebbe Road Apartments",
    contact: "Agnes Nalwoga",
    propertyType: "shop",
    properties: 1,
    units: 8,
    tenants: 6,
    collected: 1_450_000,
    joined: "Jul 2026",
    verification: "Suspended",
  },
];

export type UnmatchedTxn = {
  id: string;
  network: "MTN Mobile Money" | "Airtel Money";
  sender: string;
  phone: string;
  amount: number;
  received: string;
  reference: string;
};

export const unmatchedTransactions: UnmatchedTxn[] = [
  {
    id: "t1",
    network: "MTN Mobile Money",
    sender: "PETER BYARUHANGA",
    phone: "0776 902 114",
    amount: 900_000,
    received: "Today, 09:42",
    reference: "MP261116.0942.A1",
  },
  {
    id: "t2",
    network: "Airtel Money",
    sender: "S NAMUBIRU",
    phone: "0751 208 663",
    amount: 325_000,
    received: "Today, 08:15",
    reference: "AM261116.0815.C7",
  },
  {
    id: "t3",
    network: "MTN Mobile Money",
    sender: "UNKNOWN",
    phone: "0789 001 552",
    amount: 600_000,
    received: "Yesterday, 18:03",
    reference: "MP261115.1803.F2",
  },
];
