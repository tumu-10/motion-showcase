import {
  demoHomeServiceProviders,
  homeServiceCategories,
  type DemoHomeServiceProvider,
  type HomeServiceId,
} from "@/lib/home-services";

const storageKey = "propatiz-demo-home-service-providers";

export type NewHomeServiceProvider = Omit<DemoHomeServiceProvider, "id" | "rating" | "ratingCount">;

export async function resizeHomeServiceProviderImage(file: File): Promise<string> {
  if (file.size > 3 * 1024 * 1024) throw new Error("Choose an image smaller than 3 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Upload a JPG, PNG, or WebP image.");
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot resize the provider image.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.82);
    if (imageDataUrl.length > 1_000_000) {
      throw new Error("This image is too detailed to save. Choose a smaller image.");
    }
    return imageDataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function readHomeServiceProviders(): DemoHomeServiceProvider[] {
  if (typeof localStorage === "undefined") return demoHomeServiceProviders;
  const saved = localStorage.getItem(storageKey);
  if (!saved) return demoHomeServiceProviders;

  const value: unknown = JSON.parse(saved);
  if (!Array.isArray(value) || !value.every(isHomeServiceProvider)) {
    throw new Error("Saved service providers have an invalid shape.");
  }
  const ids = new Set(demoHomeServiceProviders.map((provider) => provider.id));
  for (const provider of value) {
    if (ids.has(provider.id)) {
      throw new Error("Saved service providers contain a duplicate identifier.");
    }
    ids.add(provider.id);
  }
  return [...demoHomeServiceProviders, ...value];
}

export function createHomeServiceProvider(input: NewHomeServiceProvider) {
  if (typeof localStorage === "undefined") {
    throw new Error("Service providers can only be saved in the browser demo.");
  }
  const name = input.name.trim();
  const area = input.area.trim();
  if (!name || !area) throw new Error("Enter a provider name and service area.");
  if (!isHomeServiceId(input.serviceId)) throw new Error("Choose a valid service category.");
  if (
    !Number.isSafeInteger(input.minimumPrice) ||
    input.minimumPrice < 0 ||
    !Number.isSafeInteger(input.maximumPrice) ||
    input.maximumPrice < input.minimumPrice
  ) {
    throw new Error("Enter valid whole-UGX prices with the maximum at least the minimum.");
  }
  if (!input.priceUnit.trim()) throw new Error("Choose how the service is priced.");
  if (input.imageDataUrl && !isProviderImageDataUrl(input.imageDataUrl)) {
    throw new Error("Choose a valid resized provider image.");
  }

  const providers = readHomeServiceProviders();
  if (
    providers.some(
      (provider) =>
        provider.serviceId === input.serviceId &&
        provider.name.toLocaleLowerCase() === name.toLocaleLowerCase() &&
        provider.area.toLocaleLowerCase() === area.toLocaleLowerCase(),
    )
  ) {
    throw new Error("A provider with this name and service area is already listed.");
  }

  const created: DemoHomeServiceProvider = {
    ...input,
    id: `provider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    area,
    priceUnit: input.priceUnit.trim(),
    rating: 0,
    ratingCount: 0,
  };
  const saved = providers.filter(
    (provider) => !demoHomeServiceProviders.some((sample) => sample.id === provider.id),
  );
  localStorage.setItem(storageKey, JSON.stringify([...saved, created]));
  return created;
}

function isHomeServiceProvider(value: unknown): value is DemoHomeServiceProvider {
  if (typeof value !== "object" || value === null) return false;
  const provider = value as Record<string, unknown>;
  return (
    typeof provider["id"] === "string" &&
    isHomeServiceId(provider["serviceId"]) &&
    typeof provider["name"] === "string" &&
    typeof provider["area"] === "string" &&
    typeof provider["minimumPrice"] === "number" &&
    Number.isSafeInteger(provider["minimumPrice"]) &&
    provider["minimumPrice"] >= 0 &&
    typeof provider["maximumPrice"] === "number" &&
    Number.isSafeInteger(provider["maximumPrice"]) &&
    provider["maximumPrice"] >= provider["minimumPrice"] &&
    typeof provider["priceUnit"] === "string" &&
    (provider["imageDataUrl"] === undefined ||
      (typeof provider["imageDataUrl"] === "string" &&
        isProviderImageDataUrl(provider["imageDataUrl"]))) &&
    typeof provider["rating"] === "number" &&
    Number.isFinite(provider["rating"]) &&
    provider["rating"] >= 0 &&
    typeof provider["ratingCount"] === "number" &&
    Number.isInteger(provider["ratingCount"]) &&
    provider["ratingCount"] >= 0
  );
}

function isProviderImageDataUrl(value: string) {
  return value.length <= 1_000_000 && value.startsWith("data:image/jpeg;base64,");
}

function isHomeServiceId(value: unknown): value is HomeServiceId {
  return homeServiceCategories.some((service) => service.id === value);
}
