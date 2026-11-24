import { useEffect, useState } from "react";
import { BadgeCheck, CircleCheck, CircleHelp, Clock3, Wrench, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUGX } from "@/lib/rent";
import {
  demoHomeServiceProviders,
  homeServiceCategories,
  type HomeServiceRequest,
  type HomeServiceRequestStatus,
  type PropertyHomeServiceSettings,
} from "@/lib/home-services";
import { readHomeServiceProviders } from "@/lib/home-service-providers";

const requestStatusClass: Record<HomeServiceRequestStatus, string> = {
  Requested: "bg-warning-soft text-warning-ink",
  Confirmed: "bg-primary-soft text-primary-deep",
  Done: "bg-success-soft text-success-ink",
};
const requestStatusIcon: Record<HomeServiceRequestStatus, LucideIcon> = {
  Requested: Clock3,
  Confirmed: BadgeCheck,
  Done: CircleCheck,
};

export function HomeServicesManagement({
  properties,
  requests,
  settings,
  onSaveSettings,
  onRequestStatusChange,
}: {
  properties: string[];
  requests: HomeServiceRequest[];
  settings: PropertyHomeServiceSettings[];
  onSaveSettings: (property: string, updates: Partial<PropertyHomeServiceSettings>) => void;
  onRequestStatusChange: (id: string, status: HomeServiceRequestStatus) => void;
}) {
  const [property, setProperty] = useState(properties[0] ?? "");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [providers, setProviders] = useState(demoHomeServiceProviders);
  const currentSettings = settings.find((item) => item.property === property);
  const charge = currentSettings?.monthlyServiceCharge;
  const [chargeEnabled, setChargeEnabled] = useState(charge?.enabled ?? false);
  const [chargeLabel, setChargeLabel] = useState(charge?.label ?? "Garbage collection");
  const [chargeAmount, setChargeAmount] = useState(charge?.amount ? String(charge.amount) : "");

  useEffect(() => {
    try {
      setProviders(readHomeServiceProviders());
    } catch (error) {
      console.error("Could not load service providers.", error);
      toast.error("Service providers could not be loaded.");
    }
  }, []);

  useEffect(() => {
    if (!properties.includes(property)) setProperty(properties[0] ?? "");
  }, [properties, property]);

  useEffect(() => {
    setChargeEnabled(charge?.enabled ?? false);
    setChargeLabel(charge?.label ?? "Garbage collection");
    setChargeAmount(charge?.amount ? String(charge.amount) : "");
  }, [property, charge?.amount, charge?.enabled, charge?.label]);

  const preferredIds = currentSettings?.preferredProviderIds ?? [];
  const visibleProviders = providers.filter(
    (provider) => serviceFilter === "all" || provider.serviceId === serviceFilter,
  );
  const propertyRequests = requests.filter((request) => request.property === property);

  const togglePreferred = (providerId: string, preferred: boolean) => {
    const next = new Set(preferredIds);
    if (preferred) next.add(providerId);
    else next.delete(providerId);
    onSaveSettings(property, { preferredProviderIds: [...next] });
  };

  const saveMonthlyCharge = () => {
    const amount = Number(chargeAmount.replace(/[^\d]/g, ""));
    if (chargeEnabled && (!chargeLabel.trim() || !Number.isSafeInteger(amount) || amount <= 0)) {
      return;
    }
    onSaveSettings(property, {
      monthlyServiceCharge: {
        label: chargeLabel.trim() || "Service charge",
        amount,
        enabled: chargeEnabled,
      },
    });
  };

  if (!properties.length) {
    return (
      <section className="surface p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-primary-deep">Home services</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a property to manage preferred providers and service requests.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-eyebrow text-primary">Provider preferences and requests</p>
          <h1 className="mt-1 text-2xl font-bold text-primary-deep sm:text-3xl">Home services</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Set providers tenants should see first, review quote requests, and add an optional
            monthly service charge as a separate invoice line.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Label htmlFor="services-property">Property</Label>
          <select
            id="services-property"
            className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={property}
            onChange={(event) => setProperty(event.target.value)}
          >
            {properties.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="rounded-xl border border-primary/15 bg-primary-soft/60 p-4 text-sm text-primary-deep">
        <CircleHelp className="mr-2 inline size-4" aria-hidden />
        Prices are indicative. Call and WhatsApp actions remain demo-only and do not contact anyone.
      </div>

      <section className="surface space-y-4 p-4 sm:p-5" aria-labelledby="preferred-providers-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="preferred-providers-title" className="font-bold text-primary-deep">
              Preferred providers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Selected providers appear first in this property’s tenant directory.
            </p>
          </div>
          <select
            aria-label="Filter providers by service"
            className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm sm:w-56"
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
          >
            <option value="all">All services</option>
            {homeServiceCategories.map((service) => (
              <option key={service.id} value={service.id}>
                {service.label}
              </option>
            ))}
          </select>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {visibleProviders.map((provider) => {
            const preferred = preferredIds.includes(provider.id);
            const service = homeServiceCategories.find((item) => item.id === provider.serviceId);
            return (
              <li key={provider.id}>
                <label className="flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    checked={preferred}
                    onChange={(event) => togglePreferred(provider.id, event.target.checked)}
                    aria-label={`Set ${provider.name} as preferred`}
                  />
                  {provider.imageDataUrl && (
                    <img
                      src={provider.imageDataUrl}
                      alt=""
                      loading="lazy"
                      className="size-12 shrink-0 rounded-lg border object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {provider.name}
                      {preferred && (
                        <BadgeCheck className="size-4 text-success-ink" aria-label="Preferred" />
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {service?.label} · {provider.area} · {provider.rating.toFixed(1)} demo rating
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="surface space-y-4 p-4 sm:p-5"
        aria-labelledby="monthly-service-charge-title"
      >
        <div>
          <h2 id="monthly-service-charge-title" className="font-bold text-primary-deep">
            Monthly service-charge line item
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kept separate from rent and the rent ledger. Tenants see it as its own invoice line.
          </p>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={chargeEnabled}
            onChange={(event) => setChargeEnabled(event.target.checked)}
          />
          <span className="text-sm font-semibold">
            Add a monthly service charge for this property
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="monthly-service-label">Invoice line label</Label>
            <Input
              id="monthly-service-label"
              className="mt-1 h-11"
              value={chargeLabel}
              onChange={(event) => setChargeLabel(event.target.value)}
              placeholder="Garbage collection"
            />
          </div>
          <div>
            <Label htmlFor="monthly-service-amount">Monthly amount (UGX)</Label>
            <Input
              id="monthly-service-amount"
              className="figure mt-1 h-11"
              inputMode="numeric"
              value={chargeAmount}
              onChange={(event) => setChargeAmount(event.target.value.replace(/[^\d]/g, ""))}
              placeholder="e.g. 25000"
            />
          </div>
        </div>
        {chargeEnabled && Number(chargeAmount) > 0 && (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm">
            Invoice preview: {chargeLabel || "Service charge"} · {formatUGX(Number(chargeAmount))}{" "}
            per month
          </p>
        )}
        <Button
          type="button"
          className="min-h-11 w-full sm:w-auto"
          onClick={saveMonthlyCharge}
          disabled={
            chargeEnabled &&
            (!chargeLabel.trim() ||
              !Number.isSafeInteger(Number(chargeAmount)) ||
              Number(chargeAmount) <= 0)
          }
        >
          Save service-charge line
        </Button>
      </section>

      <section className="surface space-y-4 p-4 sm:p-5" aria-labelledby="service-requests-title">
        <div>
          <h2 id="service-requests-title" className="font-bold text-primary-deep">
            Tenant quote requests
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update a request so the tenant sees its latest status.
          </p>
        </div>
        {propertyRequests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            <Wrench className="mx-auto mb-2 size-5" aria-hidden />
            No service requests for this property yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {propertyRequests.map((request) => {
              const StatusIcon = requestStatusIcon[request.status];
              return (
                <li
                  key={request.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {request.serviceLabel} · {request.providerName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.tenant} · Unit {request.unit}
                    </p>
                    <span
                      className={`mt-2 inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold ${requestStatusClass[request.status]}`}
                    >
                      <StatusIcon className="size-3.5" aria-hidden />
                      {request.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    {request.status === "Requested" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => onRequestStatusChange(request.id, "Confirmed")}
                      >
                        Confirm
                      </Button>
                    )}
                    {request.status === "Confirmed" && (
                      <Button
                        type="button"
                        className="min-h-11"
                        onClick={() => onRequestStatusChange(request.id, "Done")}
                      >
                        Mark done
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
