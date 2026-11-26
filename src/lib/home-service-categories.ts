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
