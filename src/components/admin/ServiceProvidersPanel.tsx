import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createHomeServiceProvider,
  readHomeServiceProviders,
  resizeHomeServiceProviderImage,
} from "@/lib/home-service-providers";
import {
  demoHomeServiceProviders,
  homeServiceCategories,
  type DemoHomeServiceProvider,
  type HomeServiceId,
} from "@/lib/home-services";
import { formatUGX } from "@/lib/rent";

export function ServiceProvidersPanel() {
  const [providers, setProviders] = useState<DemoHomeServiceProvider[]>(demoHomeServiceProviders);
  const [serviceId, setServiceId] = useState<HomeServiceId>(homeServiceCategories[0].id);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState("per visit");
  const [imageDataUrl, setImageDataUrl] = useState<string>();
  const [imageLoading, setImageLoading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setProviders(readHomeServiceProviders());
    } catch (error) {
      console.error("Could not load service providers.", error);
      toast.error("Service providers could not be loaded.", {
        description: error instanceof Error ? error.message : "Check browser storage and retry.",
      });
    }
  }, []);

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setImageLoading(true);
    try {
      setImageDataUrl(await resizeHomeServiceProviderImage(file));
    } catch (error) {
      toast.error("Provider image could not be added.", {
        description: error instanceof Error ? error.message : "Choose another image and retry.",
      });
    } finally {
      if (imageInput.current) imageInput.current.value = "";
      setImageLoading(false);
    }
  }

  const addProvider = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const min = Number(minimumPrice);
    const max = Number(maximumPrice);
    try {
      const provider = createHomeServiceProvider({
        serviceId,
        name,
        area,
        minimumPrice: min,
        maximumPrice: max,
        priceUnit,
        ...(imageDataUrl ? { imageDataUrl } : {}),
      });
      setProviders((current) => [...current, provider]);
      setName("");
      setArea("");
      setMinimumPrice("");
      setMaximumPrice("");
      setImageDataUrl(undefined);
      toast.success("Service provider added", {
        description: `${provider.name} is now listed in the tenant services directory.`,
      });
    } catch (error) {
      toast.error("Service provider could not be added.", {
        description: error instanceof Error ? error.message : "Check the details and try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-eyebrow text-primary">Tenant services directory</p>
        <h1 className="mt-1 text-2xl font-bold text-primary-deep sm:text-3xl">Service providers</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Add local providers and indicative prices. New listings appear in the tenant and landlord
          service directories.
        </p>
      </header>

      <form className="surface grid gap-4 p-4 sm:p-5 lg:grid-cols-2" onSubmit={addProvider}>
        <div className="lg:col-span-2">
          <h2 className="font-bold text-primary-deep">Create a service provider</h2>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="provider-category">Service category</Label>
          <select
            id="provider-category"
            className="h-11 rounded-md border border-input bg-card px-3 text-sm"
            value={serviceId}
            onChange={(event) => {
              const service = homeServiceCategories.find((item) => item.id === event.target.value);
              if (service) setServiceId(service.id);
            }}
          >
            {homeServiceCategories.map((service) => (
              <option key={service.id} value={service.id}>
                {service.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="provider-name">Provider or business name</Label>
          <Input
            id="provider-name"
            className="h-11"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="provider-area">Service area</Label>
          <Input
            id="provider-area"
            className="h-11"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            placeholder="e.g. Ntinda"
            maxLength={100}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="provider-minimum-price">Minimum price (UGX)</Label>
            <Input
              id="provider-minimum-price"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className="h-11"
              value={minimumPrice}
              onChange={(event) => setMinimumPrice(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="provider-maximum-price">Maximum price (UGX)</Label>
            <Input
              id="provider-maximum-price"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className="h-11"
              value={maximumPrice}
              onChange={(event) => setMaximumPrice(event.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="provider-price-unit">Price basis</Label>
          <select
            id="provider-price-unit"
            className="h-11 rounded-md border border-input bg-card px-3 text-sm"
            value={priceUnit}
            onChange={(event) => setPriceUnit(event.target.value)}
          >
            <option value="per visit">Per visit</option>
            <option value="per month">Per month</option>
            <option value="per delivery">Per delivery</option>
            <option value="per move">Per move</option>
            <option value="per item">Per item</option>
          </select>
        </div>
        <div className="grid gap-2 lg:col-span-2">
          <Label htmlFor="provider-image">Provider image (optional)</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              ref={imageInput}
              id="provider-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="min-h-11 min-w-0 flex-1"
              onChange={(event) => void uploadImage(event.target.files?.[0])}
            />
            {imageDataUrl && (
              <>
                <img
                  src={imageDataUrl}
                  alt={`${name || "Provider"} preview`}
                  className="size-16 rounded-lg border object-cover"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setImageDataUrl(undefined)}
                >
                  Remove image
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WebP up to 3 MB. Images are resized for the browser demo.
          </p>
        </div>
        <div className="flex items-end lg:col-span-2 lg:justify-end">
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={imageLoading}>
            {imageLoading ? "Preparing image..." : "Add service provider"}
          </Button>
        </div>
      </form>

      <section className="surface overflow-hidden">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="font-bold text-primary-deep">Current directory</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {providers.length} provider listings · saved for this browser demo
          </p>
        </div>
        <ul className="divide-y divide-border">
          {providers.map((provider) => {
            const category = homeServiceCategories.find(
              (service) => service.id === provider.serviceId,
            );
            return (
              <li
                key={provider.id}
                className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {provider.imageDataUrl && (
                    <img
                      src={provider.imageDataUrl}
                      alt=""
                      className="size-12 shrink-0 rounded-lg border object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold">{provider.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {category?.label} · {provider.area}
                    </p>
                  </div>
                </div>
                <p className="figure text-sm font-semibold text-primary-deep">
                  {formatUGX(provider.minimumPrice)}–{formatUGX(provider.maximumPrice)}{" "}
                  <span className="font-normal text-muted-foreground">{provider.priceUnit}</span>
                </p>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
          Ratings and prices are indicative. Calls and WhatsApp messages remain demo-only.
        </p>
      </section>
    </div>
  );
}
