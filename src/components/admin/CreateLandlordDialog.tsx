import { Building2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrandLogo } from "@/components/payments/BrandLogo";
import { validateLandlordPaymentDetails } from "@/lib/demo-settings";
import { bankOptions, getBankBrand } from "@/lib/payment-banks";
import {
  PROPERTY_TYPE_LABELS,
  type Landlord,
  type PropertyType,
  type SubscriptionPlan,
} from "@/lib/sample-data";

type DraftUnit = {
  id: string;
  name: string;
  rent: string;
  bedrooms: string;
  bathrooms: string;
  details: string;
  electricityMeter: string;
  waterMeter: string;
};

type DraftBlock = {
  id: string;
  name: string;
  units: DraftUnit[];
};

export type NewLandlord = Pick<
  Landlord,
  | "name"
  | "contact"
  | "phone"
  | "properties"
  | "units"
  | "tenants"
  | "collected"
  | "propertyName"
  | "propertyType"
  | "blocks"
  | "unitRents"
  | "unitDetails"
  | "expectedMonthlyRent"
  | "paymentDetails"
  | "subscriptionPlan"
  | "subscriptionPaidAmount"
>;

const createUnit = (): DraftUnit => ({
  id: `unit-${Date.now()}-${Math.random()}`,
  name: "",
  rent: "",
  bedrooms: "1",
  bathrooms: "1",
  details: "",
  electricityMeter: "",
  waterMeter: "",
});

const createBlock = (): DraftBlock => ({
  id: `block-${Date.now()}-${Math.random()}`,
  name: "",
  units: [createUnit()],
});

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment / flats" },
  { value: "rental-units", label: "Rental units / rooms" },
  { value: "standalone-house", label: "Standalone house" },
  { value: "shop", label: "Shop / retail space" },
  { value: "office", label: "Office space" },
  { value: "mixed-use", label: "Mixed-use property" },
];

function isResidential(type: PropertyType) {
  return type === "apartment" || type === "rental-units" || type === "standalone-house";
}

export function CreateLandlordDialog({
  open,
  onClose,
  defaultPlan,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  defaultPlan: SubscriptionPlan;
  onCreate: (landlord: NewLandlord) => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment");
  const [defaultRent, setDefaultRent] = useState("");
  const [blocks, setBlocks] = useState<DraftBlock[]>([createBlock()]);
  const [mobileMoneyEnabled, setMobileMoneyEnabled] = useState(true);
  const [mobileMoneyName, setMobileMoneyName] = useState("");
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState("");
  const [bankEnabled, setBankEnabled] = useState(false);
  const [bankOther, setBankOther] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>(defaultPlan);

  function reset() {
    setName("");
    setContact("");
    setPhone("");
    setPropertyName("");
    setPropertyType("apartment");
    setDefaultRent("");
    setBlocks([createBlock()]);
    setMobileMoneyEnabled(true);
    setMobileMoneyName("");
    setMobileMoneyNumber("");
    setBankEnabled(false);
    setBankOther(false);
    setBankName("");
    setBankAccountName("");
    setBankAccountNumber("");
    setSubscriptionPlan(defaultPlan);
  }

  useEffect(() => {
    if (open) setSubscriptionPlan(defaultPlan);
  }, [defaultPlan, open]);

  function updateBlock(blockId: string, value: string) {
    setBlocks((current) =>
      current.map((block) => (block.id === blockId ? { ...block, name: value } : block)),
    );
  }

  function updateUnit(
    blockId: string,
    unitId: string,
    field:
      "name" | "rent" | "bedrooms" | "bathrooms" | "details" | "electricityMeter" | "waterMeter",
    value: string,
  ) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId
          ? {
              ...block,
              units: block.units.map((unit) =>
                unit.id === unitId ? { ...unit, [field]: value } : unit,
              ),
            }
          : block,
      ),
    );
  }

  function changePropertyType(value: PropertyType) {
    setPropertyType(value);
    const defaultRooms = isResidential(value) ? "1" : "0";
    setBlocks((current) =>
      current.map((block) => ({
        ...block,
        units: block.units.map((unit) => ({
          ...unit,
          bedrooms: defaultRooms,
          bathrooms: defaultRooms,
        })),
      })),
    );
  }

  function submit() {
    const defaultMonthlyRent = Number(defaultRent.replace(/[^\d]/g, ""));
    const configuredBlocks = blocks.map((block) => ({
      name: block.name.trim(),
      units: block.units.map((unit) => unit.name.trim()),
    }));
    const unitRents = blocks.flatMap((block) =>
      block.units.map((unit) => ({
        block: block.name.trim(),
        unit: unit.name.trim(),
        monthlyRent: unit.rent ? Number(unit.rent.replace(/[^\d]/g, "")) : defaultMonthlyRent,
      })),
    );
    const unitDetails = blocks.flatMap((block) =>
      block.units.map((unit) => ({
        block: block.name.trim(),
        unit: unit.name.trim(),
        bedrooms: Number(unit.bedrooms),
        bathrooms: Number(unit.bathrooms),
        ...(unit.details.trim() ? { details: unit.details.trim() } : {}),
        ...(unit.electricityMeter.trim() ? { electricityMeter: unit.electricityMeter.trim() } : {}),
        ...(unit.waterMeter.trim() ? { waterMeter: unit.waterMeter.trim() } : {}),
      })),
    );
    const labels = unitRents.map((unit) => unit.unit.toLowerCase());
    const phoneDigits = phone.replace(/\D/g, "");
    const paymentDetails = {
      mobileMoneyEnabled,
      ...(mobileMoneyName.trim() ? { mobileMoneyName: mobileMoneyName.trim() } : {}),
      ...(mobileMoneyNumber.trim() ? { mobileMoneyNumber: mobileMoneyNumber.trim() } : {}),
      bankEnabled,
      ...(bankName.trim() ? { bankName: bankName.trim() } : {}),
      ...(bankAccountName.trim() ? { bankAccountName: bankAccountName.trim() } : {}),
      ...(bankAccountNumber.trim() ? { bankAccountNumber: bankAccountNumber.trim() } : {}),
    };

    if (!name.trim() || !contact.trim() || !propertyName.trim() || !phoneDigits) {
      toast.error("Complete the landlord, contact, phone, and property name fields.");
      return;
    }
    if (phoneDigits.length < 9) {
      toast.error("Enter a valid phone contact with at least 9 digits.");
      return;
    }
    try {
      validateLandlordPaymentDetails(paymentDetails);
    } catch (error) {
      toast.error("Payment details are incomplete.", {
        description:
          error instanceof Error ? error.message : "Check the payment details and retry.",
      });
      return;
    }
    if (
      !blocks.length ||
      blocks.some(
        (block) =>
          !block.name.trim() ||
          !block.units.length ||
          block.units.some(
            (unit) =>
              !unit.name.trim() ||
              !unit.bedrooms.trim() ||
              !unit.bathrooms.trim() ||
              !Number.isInteger(Number(unit.bedrooms)) ||
              !Number.isInteger(Number(unit.bathrooms)) ||
              Number(unit.bedrooms) < 0 ||
              Number(unit.bathrooms) < 0,
          ),
      )
    ) {
      toast.error("Add a building/site name, unit name, and valid bedroom/bathroom counts.");
      return;
    }
    if (new Set(labels).size !== labels.length) {
      toast.error("Unit or space labels must be unique within this property.");
      return;
    }
    if (unitRents.some((unit) => !Number.isFinite(unit.monthlyRent) || unit.monthlyRent < 50_000)) {
      toast.error(
        "Set a monthly rent of at least UGX 50,000 for each unit, or provide a general rent.",
      );
      return;
    }
    if (
      unitDetails.some(
        (unit) =>
          !Number.isInteger(unit.bedrooms) ||
          unit.bedrooms < 0 ||
          !Number.isInteger(unit.bathrooms) ||
          unit.bathrooms < 0,
      )
    ) {
      toast.error("Enter valid whole-number room counts for every space.");
      return;
    }
    if (
      blocks.some((block) =>
        block.units.some((unit) => !unit.bedrooms.trim() || !unit.bathrooms.trim()),
      )
    ) {
      toast.error("Enter the bedroom and bathroom count for every unit.");
      return;
    }

    onCreate({
      name: name.trim(),
      contact: contact.trim(),
      phone: phone.trim(),
      paymentDetails,
      subscriptionPlan,
      subscriptionPaidAmount: 0,
      propertyName: propertyName.trim(),
      propertyType,
      blocks: configuredBlocks,
      properties: 1,
      units: labels.length,
      tenants: 0,
      collected: 0,
      unitRents,
      unitDetails,
      expectedMonthlyRent: unitRents.reduce((total, unit) => total + unit.monthlyRent, 0),
    });
    toast.success("Landlord account created", {
      description: `${labels.length} spaces were registered under ${propertyName}.`,
    });
    reset();
    onClose();
  }

  const unitCount = blocks.reduce((count, block) => count + block.units.length, 0);
  const selectedBankBrand = getBankBrand(bankName);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[94dvh] max-w-3xl overflow-y-auto rounded-2xl bg-background p-4 sm:p-6">
        <DialogHeader className="rounded-xl bg-primary-soft p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-primary">
              <Building2 className="size-5" aria-hidden />
            </span>
            <div>
              <DialogTitle className="text-xl sm:text-2xl">Create landlord account</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed">
                Add the landlord contact and configure residential or commercial rental spaces.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-primary-deep">
              Account details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Landlord / account name" htmlFor="landlord-name">
                <Input
                  id="landlord-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Kololo Heights Ltd"
                  className="bg-background"
                />
              </Field>
              <Field label="Contact person" htmlFor="landlord-contact">
                <Input
                  id="landlord-contact"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="e.g. Patricia Auma"
                  className="bg-background"
                />
              </Field>
              <Field label="Phone contact" htmlFor="landlord-phone">
                <Input
                  id="landlord-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="e.g. +256 772 123 456"
                  className="bg-background"
                />
              </Field>
              <Field label="Property type" htmlFor="landlord-property-type">
                <select
                  id="landlord-property-type"
                  value={propertyType}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (propertyTypes.some((type) => type.value === value)) {
                      changePropertyType(value as PropertyType);
                    }
                  }}
                  className="h-12 w-full rounded-md border border-input bg-background px-4 text-base focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
                >
                  {propertyTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Property name" htmlFor="landlord-property-name">
                <Input
                  id="landlord-property-name"
                  value={propertyName}
                  onChange={(event) => setPropertyName(event.target.value)}
                  placeholder="e.g. Kololo Heights"
                  className="bg-background"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary-deep">
              Rent collection methods
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              These account details are shown to tenants paying this landlord.
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
                <button
                  type="button"
                  aria-pressed={mobileMoneyEnabled}
                  onClick={() => setMobileMoneyEnabled((enabled) => !enabled)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
                >
                  <span className="font-semibold">Mobile money</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      mobileMoneyEnabled
                        ? "bg-success-soft text-success-ink"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {mobileMoneyEnabled ? "Enabled" : "Disabled"}
                  </span>
                </button>
                {mobileMoneyEnabled && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Registered name" htmlFor="landlord-momo-name">
                      <Input
                        id="landlord-momo-name"
                        value={mobileMoneyName}
                        onChange={(event) => setMobileMoneyName(event.target.value)}
                        placeholder={contact || "Account holder name"}
                        className="bg-card"
                      />
                    </Field>
                    <Field label="Mobile money number" htmlFor="landlord-momo-number">
                      <Input
                        id="landlord-momo-number"
                        type="tel"
                        inputMode="tel"
                        value={mobileMoneyNumber}
                        onChange={(event) => setMobileMoneyNumber(event.target.value)}
                        placeholder="e.g. 0772 123 456"
                        className="bg-card"
                      />
                    </Field>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
                <button
                  type="button"
                  aria-pressed={bankEnabled}
                  onClick={() => setBankEnabled((enabled) => !enabled)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
                >
                  <span className="font-semibold">Bank transfer</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      bankEnabled
                        ? "bg-success-soft text-success-ink"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {bankEnabled ? "Enabled" : "Disabled"}
                  </span>
                </button>
                {bankEnabled && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Bank name" htmlFor="landlord-bank-name">
                      <div className="flex min-w-0 items-center gap-2">
                        <select
                          id="landlord-bank-name"
                          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm"
                          value={
                            bankOther
                              ? "other"
                              : (bankOptions.find((bank) => bank.brand === selectedBankBrand)
                                  ?.name ?? "")
                          }
                          onChange={(event) => {
                            const selected = event.target.value;
                            setBankOther(selected === "other");
                            setBankName(selected === "other" ? "" : selected);
                          }}
                        >
                          <option value="">Choose a bank</option>
                          {bankOptions.map((bank) => (
                            <option key={bank.brand} value={bank.name}>
                              {bank.name}
                            </option>
                          ))}
                          <option value="other">Other bank</option>
                        </select>
                        {!bankOther && selectedBankBrand && (
                          <BrandLogo brand={selectedBankBrand} className="h-9 w-12" />
                        )}
                      </div>
                    </Field>
                    {bankOther && (
                      <Field label="Other bank name" htmlFor="landlord-other-bank-name">
                        <Input
                          id="landlord-other-bank-name"
                          value={bankName}
                          onChange={(event) => setBankName(event.target.value)}
                          placeholder="Enter bank name"
                          className="bg-card"
                        />
                      </Field>
                    )}
                    <Field label="Account name" htmlFor="landlord-bank-account-name">
                      <Input
                        id="landlord-bank-account-name"
                        value={bankAccountName}
                        onChange={(event) => setBankAccountName(event.target.value)}
                        placeholder="Account holder name"
                        className="bg-card"
                      />
                    </Field>
                    <Field label="Account number" htmlFor="landlord-bank-account-number">
                      <Input
                        id="landlord-bank-account-number"
                        inputMode="numeric"
                        value={bankAccountNumber}
                        onChange={(event) =>
                          setBankAccountNumber(event.target.value.replace(/[^\d]/g, ""))
                        }
                        placeholder="Bank account number"
                        className="figure bg-card sm:col-span-2"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-accent-soft/60 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-primary-deep">
                  Property and space setup
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {blocks.length} {blocks.length === 1 ? "block" : "blocks"} · {unitCount}{" "}
                  {unitCount === 1 ? "unit" : "units"}
                </p>
              </div>
              <Field label="General monthly rent (UGX)" htmlFor="landlord-default-rent">
                <Input
                  id="landlord-default-rent"
                  className="figure bg-card sm:w-56"
                  inputMode="numeric"
                  value={defaultRent}
                  onChange={(event) => setDefaultRent(event.target.value.replace(/[^\d]/g, ""))}
                  placeholder="e.g. 850000"
                />
              </Field>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Use one general rent for all units, then enter a different rent on any unit that needs
              an exception.
            </p>
          </section>

          <div className="space-y-4">
            {blocks.map((block, blockIndex) => (
              <section
                key={block.id}
                className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5"
              >
                <div className="flex items-end gap-3">
                  <Field
                    label={`Building / site ${blockIndex + 1}`}
                    htmlFor={`block-${block.id}`}
                    className="flex-1"
                  >
                    <Input
                      id={`block-${block.id}`}
                      value={block.name}
                      onChange={(event) => updateBlock(block.id, event.target.value)}
                      placeholder="e.g. Main building or standalone"
                      className="bg-background"
                    />
                  </Field>
                  {blocks.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Remove block ${blockIndex + 1}`}
                      onClick={() =>
                        setBlocks((current) => current.filter((item) => item.id !== block.id))
                      }
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {block.units.map((unit, unitIndex) => (
                    <div
                      key={unit.id}
                      className="rounded-xl border border-border/80 bg-secondary/45 p-3 sm:p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Unit {unitIndex + 1}
                        </p>
                        {block.units.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setBlocks((current) =>
                                current.map((item) =>
                                  item.id === block.id
                                    ? {
                                        ...item,
                                        units: item.units.filter((entry) => entry.id !== unit.id),
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-destructive-ink hover:bg-destructive-soft"
                          >
                            <Trash2 className="size-4" aria-hidden />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Field
                          label={
                            propertyType === "shop" || propertyType === "office"
                              ? "Space label"
                              : "Unit name"
                          }
                          htmlFor={`unit-name-${unit.id}`}
                        >
                          <Input
                            id={`unit-name-${unit.id}`}
                            value={unit.name}
                            onChange={(event) =>
                              updateUnit(block.id, unit.id, "name", event.target.value)
                            }
                            placeholder="e.g. C2"
                            className="bg-card"
                          />
                        </Field>
                        <Field label="Monthly rent (UGX)" htmlFor={`unit-rent-${unit.id}`}>
                          <Input
                            id={`unit-rent-${unit.id}`}
                            inputMode="numeric"
                            value={unit.rent}
                            onChange={(event) =>
                              updateUnit(
                                block.id,
                                unit.id,
                                "rent",
                                event.target.value.replace(/[^\d]/g, ""),
                              )
                            }
                            placeholder={defaultRent || "Use general rent"}
                            className="figure bg-card"
                          />
                        </Field>
                        <Field
                          label={
                            isResidential(propertyType) ? "Bedrooms" : "Bedrooms (if applicable)"
                          }
                          htmlFor={`unit-bedrooms-${unit.id}`}
                        >
                          <Input
                            id={`unit-bedrooms-${unit.id}`}
                            type="number"
                            min="0"
                            max="20"
                            step="1"
                            value={unit.bedrooms}
                            onChange={(event) =>
                              updateUnit(block.id, unit.id, "bedrooms", event.target.value)
                            }
                            className="bg-card"
                          />
                        </Field>
                        <Field
                          label={
                            isResidential(propertyType) ? "Bathrooms" : "Bathrooms (if applicable)"
                          }
                          htmlFor={`unit-bathrooms-${unit.id}`}
                        >
                          <Input
                            id={`unit-bathrooms-${unit.id}`}
                            type="number"
                            min="0"
                            max="20"
                            step="1"
                            value={unit.bathrooms}
                            onChange={(event) =>
                              updateUnit(block.id, unit.id, "bathrooms", event.target.value)
                            }
                            className="bg-card"
                          />
                        </Field>
                      </div>
                      <div className="mt-3">
                        <Label htmlFor={`unit-details-${unit.id}`}>
                          Special details (optional)
                        </Label>
                        <Textarea
                          id={`unit-details-${unit.id}`}
                          value={unit.details}
                          onChange={(event) =>
                            updateUnit(block.id, unit.id, "details", event.target.value)
                          }
                          placeholder="e.g. Balcony, furnished, separate water meter"
                          className="mt-1.5 min-h-20 resize-y bg-card"
                        />
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Electricity meter / Yaka number (optional)"
                          htmlFor={`unit-electricity-meter-${unit.id}`}
                        >
                          <Input
                            id={`unit-electricity-meter-${unit.id}`}
                            value={unit.electricityMeter}
                            onChange={(event) =>
                              updateUnit(block.id, unit.id, "electricityMeter", event.target.value)
                            }
                            placeholder="Meter or account reference"
                            className="bg-card"
                          />
                        </Field>
                        <Field
                          label="Water meter number (optional)"
                          htmlFor={`unit-water-meter-${unit.id}`}
                        >
                          <Input
                            id={`unit-water-meter-${unit.id}`}
                            value={unit.waterMeter}
                            onChange={(event) =>
                              updateUnit(block.id, unit.id, "waterMeter", event.target.value)
                            }
                            placeholder="Meter reference"
                            className="bg-card"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full border-dashed bg-card sm:w-auto"
                  onClick={() =>
                    setBlocks((current) =>
                      current.map((item) =>
                        item.id === block.id
                          ? { ...item, units: [...item.units, createUnit()] }
                          : item,
                      ),
                    )
                  }
                >
                  <Plus /> Add unit
                </Button>
              </section>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed bg-card sm:w-auto"
            onClick={() => setBlocks((current) => [...current, createBlock()])}
          >
            <Plus /> Add building / site
          </Button>

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-background/95 p-4 backdrop-blur sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={submit}>
              Create landlord
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
