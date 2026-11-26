import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeading } from "@/components/shared/DashShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/payments/BrandLogo";
import {
  getDefaultLandlordPaymentDetails,
  readLandlordPaymentDetails,
  saveLandlordDemoSettings,
  saveLandlordPaymentDetails,
} from "@/lib/demo-settings";
import type { LandlordPaymentDetails } from "@/lib/sample-data";
import { bankOptions, getBankBrand } from "@/lib/payment-banks";
import {
  getDefaultReceiptBranding,
  getReceiptBranding,
  resizeReceiptLogo,
  saveReceiptBranding,
  type ReceiptBranding,
} from "@/lib/receipt-branding";

export function ReceiptSettings({
  defaultRentDueDay,
  onDefaultRentDueDayChange,
}: {
  defaultRentDueDay: number;
  onDefaultRentDueDayChange: (day: number) => void;
}) {
  const [branding, setBranding] = useState<ReceiptBranding>(() =>
    getDefaultReceiptBranding(),
  );
  const [dueDayDraft, setDueDayDraft] = useState(String(defaultRentDueDay));
  const [loaded, setLoaded] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<LandlordPaymentDetails>(
    () => getDefaultLandlordPaymentDetails(),
  );
  const [bankOther, setBankOther] = useState(false);
  const [paymentDetailsLoaded, setPaymentDetailsLoaded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDueDayDraft(String(defaultRentDueDay));
  }, [defaultRentDueDay]);

  useEffect(() => {
    try {
      setBranding(getReceiptBranding());
    } catch (error) {
      toast.error("Could not load receipt branding", {
        description: error instanceof Error ? error.message : "Check browser storage and retry.",
      });
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = readLandlordPaymentDetails();
      setPaymentDetails(saved);
      setBankOther(!!saved.bankName && !getBankBrand(saved.bankName));
    } catch (error) {
      console.error("Could not load landlord payment details.", error);
      toast.error("Landlord payment details could not be loaded.", {
        description: error instanceof Error ? error.message : "Check browser storage and retry.",
      });
    } finally {
      setPaymentDetailsLoaded(true);
    }
  }, []);

  const logo =
    branding.logoChoice === "custom" && branding.customLogoDataUrl
      ? branding.customLogoDataUrl
      : "/propatiz-logo-transparent-dark-text.svg";
  const landlordBankBrand = getBankBrand(paymentDetails.bankName);

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    try {
      const customLogoDataUrl = await resizeReceiptLogo(file);
      setBranding((current) => ({ ...current, logoChoice: "custom", customLogoDataUrl }));
    } catch (error) {
      toast.error("Could not use this logo", {
        description: error instanceof Error ? error.message : "Choose another image and retry.",
      });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function save() {
    try {
      const saved = saveReceiptBranding(branding);
      setBranding(saved);
      toast.success("Receipt branding saved", {
        description:
          "New receipts will use this version. Existing receipts keep their original branding.",
      });
    } catch (error) {
      toast.error("Could not save receipt branding", {
        description: error instanceof Error ? error.message : "Check browser storage and retry.",
      });
    }
  }

  function savePortfolioDefaults() {
    try {
      const saved = saveLandlordDemoSettings({ defaultRentDueDay: Number(dueDayDraft) });
      setDueDayDraft(String(saved.defaultRentDueDay));
      onDefaultRentDueDayChange(saved.defaultRentDueDay);
      toast.success("Portfolio defaults saved", {
        description: "New move-ins will start with this rent due day.",
      });
    } catch (error) {
      toast.error("Could not save portfolio defaults", {
        description: error instanceof Error ? error.message : "Check the due day and retry.",
      });
    }
  }

  function savePaymentDetails() {
    try {
      setPaymentDetails(saveLandlordPaymentDetails(paymentDetails));
      toast.success("Rent collection details saved", {
        description: "Tenants will see these payment instructions in the rent payment form.",
      });
    } catch (error) {
      toast.error("Rent collection details could not be saved.", {
        description:
          error instanceof Error ? error.message : "Check the payment details and retry.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading eyebrow="Landlord workspace" title="Settings" />
      <section className="surface grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-primary-deep">Portfolio defaults</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set the starting rent due day for new tenancies. Existing agreements are not changed.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="default-rent-due-day">Rent due day</Label>
          <Input
            id="default-rent-due-day"
            type="number"
            min="1"
            max="31"
            inputMode="numeric"
            className="min-h-11"
            value={dueDayDraft}
            onChange={(event) => setDueDayDraft(event.target.value)}
          />
        </div>
        <Button
          type="button"
          className="min-h-11"
          onClick={savePortfolioDefaults}
          disabled={!loaded}
        >
          Save default
        </Button>
      </section>
      <section className="surface space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-primary-deep">Rent collection details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tenants see these receiving account details before submitting a rent payment.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border bg-secondary/30 p-4">
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
              <Checkbox
                checked={paymentDetails.mobileMoneyEnabled}
                onCheckedChange={(checked) =>
                  setPaymentDetails((current) => ({
                    ...current,
                    mobileMoneyEnabled: checked === true,
                  }))
                }
              />
              Accept MTN or Airtel Mobile Money
            </label>
            {paymentDetails.mobileMoneyEnabled && (
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="landlord-payment-momo-name">Registered account name</Label>
                  <Input
                    id="landlord-payment-momo-name"
                    className="min-h-11"
                    value={paymentDetails.mobileMoneyName ?? ""}
                    onChange={(event) =>
                      setPaymentDetails((current) => ({
                        ...current,
                        mobileMoneyName: event.target.value,
                      }))
                    }
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landlord-payment-momo-number">
                    Receiving mobile money number
                  </Label>
                  <Input
                    id="landlord-payment-momo-number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="figure min-h-11"
                    value={paymentDetails.mobileMoneyNumber ?? ""}
                    onChange={(event) =>
                      setPaymentDetails((current) => ({
                        ...current,
                        mobileMoneyNumber: event.target.value,
                      }))
                    }
                    placeholder="e.g. 0772 123 456"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-secondary/30 p-4">
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
              <Checkbox
                checked={paymentDetails.bankEnabled}
                onCheckedChange={(checked) =>
                  setPaymentDetails((current) => ({ ...current, bankEnabled: checked === true }))
                }
              />
              Accept bank transfers
            </label>
            {paymentDetails.bankEnabled && (
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="landlord-payment-bank-name">Bank name</Label>
                  <div className="flex min-w-0 items-center gap-2">
                    <select
                      id="landlord-payment-bank-name"
                      className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                      value={
                        bankOther
                          ? "other"
                          : (bankOptions.find((bank) => bank.brand === landlordBankBrand)?.name ??
                            "")
                      }
                      onChange={(event) => {
                        const selected = event.target.value;
                        setBankOther(selected === "other");
                        setPaymentDetails((current) => ({
                          ...current,
                          bankName: selected === "other" ? "" : selected,
                        }));
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
                    {!bankOther && landlordBankBrand && (
                      <BrandLogo brand={landlordBankBrand} className="h-9 w-12" />
                    )}
                  </div>
                  {bankOther && (
                    <Input
                      id="landlord-payment-other-bank-name"
                      aria-label="Other bank name"
                      className="min-h-11"
                      value={paymentDetails.bankName ?? ""}
                      onChange={(event) =>
                        setPaymentDetails((current) => ({
                          ...current,
                          bankName: event.target.value,
                        }))
                      }
                      placeholder="Enter bank name"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landlord-payment-bank-account-name">Account name</Label>
                  <Input
                    id="landlord-payment-bank-account-name"
                    className="min-h-11"
                    value={paymentDetails.bankAccountName ?? ""}
                    onChange={(event) =>
                      setPaymentDetails((current) => ({
                        ...current,
                        bankAccountName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landlord-payment-bank-account-number">Account number</Label>
                  <Input
                    id="landlord-payment-bank-account-number"
                    className="figure min-h-11"
                    value={paymentDetails.bankAccountNumber ?? ""}
                    onChange={(event) =>
                      setPaymentDetails((current) => ({
                        ...current,
                        bankAccountNumber: event.target.value,
                      }))
                    }
                    autoComplete="off"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <Button
          type="button"
          className="min-h-11"
          onClick={savePaymentDetails}
          disabled={!paymentDetailsLoaded}
        >
          Save rent collection details
        </Button>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <section className="surface space-y-5 p-5 sm:p-7">
          <div>
            <h2 className="text-lg font-bold text-primary-deep">Landlord details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These details are saved as a new immutable branding version for future receipts.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="receipt-landlord-name">Landlord or business name</Label>
              <Input
                id="receipt-landlord-name"
                value={branding.landlordName}
                onChange={(event) =>
                  setBranding((current) => ({ ...current, landlordName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-address">Address</Label>
              <Input
                id="receipt-address"
                value={branding.landlordAddress}
                onChange={(event) =>
                  setBranding((current) => ({ ...current, landlordAddress: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-tin">TIN</Label>
              <Input
                id="receipt-tin"
                value={branding.landlordTin}
                onChange={(event) =>
                  setBranding((current) => ({ ...current, landlordTin: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Receipt logo</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={branding.logoChoice === "propatiz" ? "default" : "outline"}
                onClick={() => setBranding((current) => ({ ...current, logoChoice: "propatiz" }))}
              >
                Use Propatiz logo
              </Button>
              <Button
                type="button"
                size="sm"
                variant={branding.logoChoice === "custom" ? "default" : "outline"}
                onClick={() => fileInput.current?.click()}
              >
                Upload landlord logo
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="sr-only"
                aria-label="Upload landlord logo"
                onChange={(event) => void uploadLogo(event.target.files?.[0])}
              />
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, or static SVG · up to 2 MB</p>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <Label htmlFor="receipt-brand-colour">Brand colour</Label>
              <Input
                id="receipt-brand-colour"
                type="color"
                className="h-10 w-16 p-1"
                value={branding.brandColor}
                onChange={(event) =>
                  setBranding((current) => ({ ...current, brandColor: event.target.value }))
                }
              />
            </div>
            <label className="flex items-center gap-3 pb-2 text-sm">
              <Checkbox
                checked={branding.watermarkEnabled}
                onCheckedChange={(checked) =>
                  setBranding((current) => ({ ...current, watermarkEnabled: checked === true }))
                }
              />
              Add faint diagonal logo watermark
            </label>
          </div>
          <Button onClick={save} disabled={!loaded || !branding.landlordName.trim()}>
            Save receipt branding
          </Button>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-primary-deep">Live receipt preview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New rent and deposit receipts will reflect these settings.
            </p>
          </div>
          <article className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-soft">
            {branding.watermarkEnabled && (
              <img
                src={logo}
                alt=""
                className="pointer-events-none absolute left-1/4 top-1/3 w-3/4 opacity-[0.06]"
                style={{ transform: "rotate(-25deg)" }}
              />
            )}
            <div
              className="relative flex items-start justify-between gap-4 border-b pb-4"
              style={{ borderColor: branding.brandColor }}
            >
              <div>
                <img
                  src={logo}
                  alt="Receipt logo preview"
                  className="h-14 max-w-48 object-contain object-left"
                />
                <p className="mt-3 font-semibold">{branding.landlordName || "Landlord name"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {branding.landlordAddress || "Landlord address"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  TIN: {branding.landlordTin || "Not provided"}
                </p>
              </div>
              <div className="size-16 rounded border border-dashed p-2 text-center text-[10px] text-muted-foreground">
                VERIFY
                <br />
                QR
              </div>
            </div>
            <h3
              className="relative my-5 font-display text-2xl"
              style={{ color: branding.brandColor }}
            >
              Rent payment receipt
            </h3>
            <div className="relative space-y-3 rounded-lg border p-4 text-sm">
              <PreviewRow label="Tenant" value="Sample tenant" />
              <PreviewRow label="Amount" value="UGX 1,200,000" />
              <PreviewRow
                label="Amount in words"
                value="One million two hundred thousand Ugandan shillings only"
              />
              <PreviewRow label="Method" value="Mobile money" />
              <PreviewRow label="EFRIS" value="Pending · mock only" />
            </div>
            <div className="relative mt-5 flex justify-between text-xs text-muted-foreground">
              <span>Computer-generated receipt</span>
              <strong style={{ color: branding.brandColor }}>Powered by Propatiz</strong>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <strong className="font-medium">{value}</strong>
    </div>
  );
}
