export const homeServiceCategories = [
  { id: "garbage-collection", label: "Garbage collection" },
  { id: "plumber", label: "Plumber" },
  { id: "electrician", label: "Electrician" },
  { id: "cleaning", label: "Cleaning" },
  { id: "cooking-gas", label: "Cooking gas delivery" },
  { id: "water-delivery", label: "Water delivery" },
  { id: "internet", label: "Internet / Wi-Fi" },
  { id: "painter", label: "Painter" },
  { id: "carpenter", label: "Carpenter / fundi" },
  { id: "security", label: "Security guard" },
  { id: "pest-control", label: "Pest control" },
  { id: "movers", label: "Movers" },
] as const;

export type HomeServiceId = (typeof homeServiceCategories)[number]["id"];

export type DemoHomeServiceProvider = {
  id: string;
  serviceId: HomeServiceId;
  name: string;
  area: string;
  minimumPrice: number;
  maximumPrice: number;
  priceUnit: string;
  imageDataUrl?: string | undefined;
  rating: number;
  ratingCount: number;
};

export const demoHomeServiceProviders: DemoHomeServiceProvider[] = [
  {
    id: "garbage-greenloop",
    serviceId: "garbage-collection",
    name: "GreenLoop Waste",
    area: "Ntinda",
    minimumPrice: 15_000,
    maximumPrice: 35_000,
    priceUnit: "per month",
    rating: 4.7,
    ratingCount: 28,
  },
  {
    id: "garbage-cleanpath",
    serviceId: "garbage-collection",
    name: "CleanPath Kampala",
    area: "Bukoto",
    minimumPrice: 18_000,
    maximumPrice: 40_000,
    priceUnit: "per month",
    rating: 4.5,
    ratingCount: 19,
  },
  {
    id: "plumber-kira",
    serviceId: "plumber",
    name: "Kira PipeCare",
    area: "Kira",
    minimumPrice: 20_000,
    maximumPrice: 80_000,
    priceUnit: "per visit",
    rating: 4.8,
    ratingCount: 34,
  },
  {
    id: "plumber-wandegeya",
    serviceId: "plumber",
    name: "Wandegeya Plumbing",
    area: "Kawempe",
    minimumPrice: 25_000,
    maximumPrice: 90_000,
    priceUnit: "per visit",
    rating: 4.4,
    ratingCount: 16,
  },
  {
    id: "electrician-brightwire",
    serviceId: "electrician",
    name: "BrightWire Kampala",
    area: "Nakawa",
    minimumPrice: 25_000,
    maximumPrice: 100_000,
    priceUnit: "per visit",
    rating: 4.8,
    ratingCount: 41,
  },
  {
    id: "electrician-safevolt",
    serviceId: "electrician",
    name: "SafeVolt Works",
    area: "Kisaasi",
    minimumPrice: 30_000,
    maximumPrice: 110_000,
    priceUnit: "per visit",
    rating: 4.6,
    ratingCount: 22,
  },
  {
    id: "cleaning-freshnest",
    serviceId: "cleaning",
    name: "FreshNest Cleaning",
    area: "Kololo",
    minimumPrice: 30_000,
    maximumPrice: 90_000,
    priceUnit: "per visit",
    rating: 4.9,
    ratingCount: 52,
  },
  {
    id: "cleaning-sparkle",
    serviceId: "cleaning",
    name: "Sparkle & Sweep",
    area: "Naalya",
    minimumPrice: 35_000,
    maximumPrice: 95_000,
    priceUnit: "per visit",
    rating: 4.6,
    ratingCount: 25,
  },
  {
    id: "gas-quickflame",
    serviceId: "cooking-gas",
    name: "QuickFlame Delivery",
    area: "Ntinda",
    minimumPrice: 10_000,
    maximumPrice: 40_000,
    priceUnit: "delivery fee",
    rating: 4.7,
    ratingCount: 37,
  },
  {
    id: "gas-safecylinder",
    serviceId: "cooking-gas",
    name: "SafeCylinder Kampala",
    area: "Kansanga",
    minimumPrice: 12_000,
    maximumPrice: 45_000,
    priceUnit: "delivery fee",
    rating: 4.5,
    ratingCount: 20,
  },
  {
    id: "water-cleardrop",
    serviceId: "water-delivery",
    name: "ClearDrop Water",
    area: "Muyenga",
    minimumPrice: 8_000,
    maximumPrice: 25_000,
    priceUnit: "delivery fee",
    rating: 4.8,
    ratingCount: 31,
  },
  {
    id: "water-aqua",
    serviceId: "water-delivery",
    name: "AquaKampala",
    area: "Rubaga",
    minimumPrice: 10_000,
    maximumPrice: 28_000,
    priceUnit: "delivery fee",
    rating: 4.4,
    ratingCount: 14,
  },
  {
    id: "internet-homelink",
    serviceId: "internet",
    name: "HomeLink Wi-Fi",
    area: "Kampala Central",
    minimumPrice: 80_000,
    maximumPrice: 180_000,
    priceUnit: "per month",
    rating: 4.6,
    ratingCount: 39,
  },
  {
    id: "internet-bytebridge",
    serviceId: "internet",
    name: "ByteBridge Kampala",
    area: "Munyonyo",
    minimumPrice: 90_000,
    maximumPrice: 200_000,
    priceUnit: "per month",
    rating: 4.7,
    ratingCount: 27,
  },
  {
    id: "painter-freshcoat",
    serviceId: "painter",
    name: "FreshCoat Painters",
    area: "Kisaasi",
    minimumPrice: 50_000,
    maximumPrice: 200_000,
    priceUnit: "per room",
    rating: 4.5,
    ratingCount: 18,
  },
  {
    id: "painter-colourcraft",
    serviceId: "painter",
    name: "ColourCraft Kampala",
    area: "Bunga",
    minimumPrice: 60_000,
    maximumPrice: 220_000,
    priceUnit: "per room",
    rating: 4.8,
    ratingCount: 24,
  },
  {
    id: "carpenter-muwonge",
    serviceId: "carpenter",
    name: "Muwonge Woodworks",
    area: "Kawempe",
    minimumPrice: 30_000,
    maximumPrice: 150_000,
    priceUnit: "per job",
    rating: 4.7,
    ratingCount: 29,
  },
  {
    id: "carpenter-kisaasi",
    serviceId: "carpenter",
    name: "Kisaasi Fundi",
    area: "Kisaasi",
    minimumPrice: 35_000,
    maximumPrice: 160_000,
    priceUnit: "per job",
    rating: 4.4,
    ratingCount: 17,
  },
  {
    id: "security-gatewise",
    serviceId: "security",
    name: "Gatewise Security",
    area: "Bukoto",
    minimumPrice: 350_000,
    maximumPrice: 600_000,
    priceUnit: "per month",
    rating: 4.8,
    ratingCount: 32,
  },
  {
    id: "security-watch",
    serviceId: "security",
    name: "Kampala Watch",
    area: "Naalya",
    minimumPrice: 380_000,
    maximumPrice: 620_000,
    priceUnit: "per month",
    rating: 4.5,
    ratingCount: 21,
  },
  {
    id: "pest-bugshield",
    serviceId: "pest-control",
    name: "BugShield Kampala",
    area: "Nakawa",
    minimumPrice: 70_000,
    maximumPrice: 180_000,
    priceUnit: "per treatment",
    rating: 4.7,
    ratingCount: 30,
  },
  {
    id: "pest-safehome",
    serviceId: "pest-control",
    name: "SafeHome Pest Care",
    area: "Kira",
    minimumPrice: 75_000,
    maximumPrice: 190_000,
    priceUnit: "per treatment",
    rating: 4.6,
    ratingCount: 23,
  },
  {
    id: "movers-swift",
    serviceId: "movers",
    name: "SwiftMove Kampala",
    area: "Kampala Central",
    minimumPrice: 80_000,
    maximumPrice: 300_000,
    priceUnit: "per move",
    rating: 4.8,
    ratingCount: 45,
  },
  {
    id: "movers-citylift",
    serviceId: "movers",
    name: "CityLift Movers",
    area: "Entebbe Road",
    minimumPrice: 100_000,
    maximumPrice: 320_000,
    priceUnit: "per move",
    rating: 4.5,
    ratingCount: 26,
  },
];

export type HomeServiceRequestStatus = "Requested" | "Confirmed" | "Done";

export type HomeServiceRequest = {
  id: string;
  property: string;
  unitId: string;
  unit: string;
  tenant: string;
  serviceId: HomeServiceId;
  serviceLabel: string;
  providerId: string;
  providerName: string;
  details?: string | undefined;
  requestedAt: string;
  status: HomeServiceRequestStatus;
};

export type MonthlyServiceCharge = {
  label: string;
  amount: number;
  enabled: boolean;
};

export type PropertyHomeServiceSettings = {
  property: string;
  preferredProviderIds: string[];
  monthlyServiceCharge?: MonthlyServiceCharge | undefined;
};
