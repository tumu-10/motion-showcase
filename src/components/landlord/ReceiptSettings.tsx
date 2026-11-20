import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeading } from "@/components/shared/DashShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  defaultReceiptBranding,
  getReceiptBranding,
  resizeReceiptLogo,
  saveReceiptBranding,
  type ReceiptBranding,
} from "@/lib/receipt-branding";

export function ReceiptSettings() {
  const [branding, setBranding] = useState<ReceiptBranding>(defaultReceiptBranding);
  const [loaded, setLoaded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const logo =
    branding.logoChoice === "custom" && branding.customLogoDataUrl
      ? branding.customLogoDataUrl
      : "/propatiz-logo.svg";

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

  return (
    <div className="space-y-6">
      <PageHeading eyebrow="Receipt identity" title="Brand & receipt settings" />
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
              <PreviewRow label="EFRIS" value="Pending integration" />
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
