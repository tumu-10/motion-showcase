import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { BellRing, FileText, Printer, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatUGX, getMinimumNoticeDate } from "@/lib/rent";
import {
  canIncreaseRent,
  evictionNoticeEarliestDate,
  rentIncreaseNoticeDate,
} from "@/lib/compliance";
import {
  MAX_ANNUAL_RENT_INCREASE_PCT,
  MIN_EVICTION_NOTICE_DAYS,
  RENT_INCREASE_INTERVAL_MONTHS,
  RENT_INCREASE_NOTICE_DAYS,
  SMALL_CLAIMS_LIMIT_UGX,
} from "@/lib/legal";
import {
  addRentPeriodMonths,
  currentRentPeriod,
  getUnitPeriodCredit,
  localDateIso,
  rentPeriodDifference,
} from "@/lib/rent-accounting";
import type { LedgerEntry, Unit } from "@/lib/sample-data";
import { buildNoticePdf } from "@/lib/notice-pdf";
import { getReceiptBranding, type ReceiptBranding } from "@/lib/receipt-branding";
import {
  readTenantNotices,
  saveTenantNotice,
  updateTenantNoticeService,
  type EvictionReason,
  type NoticeAttachment,
  type NoticeKind,
  type NoticeServiceRecord,
  type TenantNotice,
} from "@/lib/tenant-demo";

const kindOptions: { value: NoticeKind; label: string }[] = [
  { value: "friendly-reminder", label: "Friendly reminder" },
  { value: "formal-rent-demand", label: "Formal rent demand" },
  { value: "notice-of-default", label: "Notice of default" },
  { value: "notice-to-vacate", label: "Eviction notice (notice to vacate)" },
  { value: "rent-increase", label: "Rent-increase notice" },
  { value: "end-of-tenancy", label: "End-of-tenancy notice" },
  { value: "repair", label: "Repair notice" },
];

const reasonOptions: { value: EvictionReason; label: string }[] = [
  { value: "non-payment", label: "Non-payment" },
  { value: "breach-of-terms", label: "Breach of terms" },
  { value: "end-of-term", label: "End of term" },
  { value: "other", label: "Other" },
];

const serviceMethods: { value: NoticeServiceRecord["method"]; label: string }[] = [
  { value: "hand-delivery", label: "Hand delivery" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "registered-mail", label: "Registered mail" },
  { value: "other", label: "Other" },
];

const escalation = [
  ["1", "Friendly reminder", "A courteous first follow-up."],
  ["2", "Formal rent demand", "Clearly state the rent and payment request."],
  ["3", "Notice of default", "Record the default and next steps."],
];

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const MAX_ATTACHMENT_TOTAL_BYTES = 2 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 4;

export function NoticesView({
  units,
  ledger,
  tenancies,
  presetUnitId,
  onNoticeSaved,
}: {
  units: Unit[];
  ledger: LedgerEntry[];
  tenancies: { unitId: string; startDate: string; status: string }[];
  presetUnitId?: string | undefined;
  onNoticeSaved: (notice: TenantNotice) => void;
}) {
  const today = localDateIso();
  const evictionMinDate = getMinimumNoticeDate(today, MIN_EVICTION_NOTICE_DAYS);
  const rentIncreaseMinDate = getMinimumNoticeDate(today, RENT_INCREASE_NOTICE_DAYS);
  const [kind, setKind] = useState<NoticeKind>("friendly-reminder");
  const [unitId, setUnitId] = useState(presetUnitId ?? "");
  const [issuedOn, setIssuedOn] = useState(today);
  const [vacateBy, setVacateBy] = useState(evictionMinDate);
  const [effectiveDate, setEffectiveDate] = useState(rentIncreaseMinDate);
  const [endDate, setEndDate] = useState(today);
  const [reasonCategory, setReasonCategory] = useState<EvictionReason | "">("");
  const [otherReason, setOtherReason] = useState("");
  const [details, setDetails] = useState("");
  const [increasePct, setIncreasePct] = useState("");
  const [lastIncreaseDate, setLastIncreaseDate] = useState("");
  const [serviceMethod, setServiceMethod] =
    useState<NoticeServiceRecord["method"]>("hand-delivery");
  const [servedAt, setServedAt] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [lc1Witness, setLc1Witness] = useState("");
  const [attachments, setAttachments] = useState<NoticeAttachment[]>([]);
  const [notices, setNotices] = useState<TenantNotice[]>([]);
  const [savingServiceFor, setSavingServiceFor] = useState<string | null>(null);

  const occupiedUnits = useMemo(() => units.filter((unit) => unit.tenant), [units]);
  const selectedUnit = occupiedUnits.find((unit) => unit.id === unitId) ?? null;
  const activeTenancy = selectedUnit
    ? tenancies.find((tenancy) => tenancy.unitId === selectedUnit.id && tenancy.status !== "Ended")
    : undefined;
  const rentIncreaseAmount = selectedUnit
    ? Math.round((selectedUnit.rent * Number(increasePct || 0)) / 100)
    : 0;
  const newRent = selectedUnit ? selectedUnit.rent + rentIncreaseAmount : 0;
  const evictionReason =
    reasonCategory === "other"
      ? otherReason.trim()
      : (reasonOptions.find((option) => option.value === reasonCategory)?.label ?? "");
  const previousNoticeDate = useMemo(() => {
    if (!selectedUnit) return undefined;
    return notices
      .filter(
        (notice) =>
          notice.kind === "rent-increase" &&
          notice.unit === selectedUnit.unit &&
          notice.property === selectedUnit.property,
      )
      .map((notice) => notice.effectiveDate ?? notice.issuedOn)
      .sort()
      .at(-1);
  }, [notices, selectedUnit]);
  const rentNoticeDeadline = /^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)
    ? rentIncreaseNoticeDate(effectiveDate)
    : "";
  const legalError =
    kind === "notice-to-vacate"
      ? reasonCategory === "other" && !otherReason.trim()
        ? "Add the details for the other reason."
        : !reasonCategory
          ? "Choose a reason for the notice."
          : !issuedOn
            ? "Choose a valid notice date."
            : !vacateBy
              ? "Choose a move-out date."
              : vacateBy < evictionNoticeEarliestDate(issuedOn, evictionReason)
                ? `The move-out date cannot be earlier than ${evictionNoticeEarliestDate(issuedOn, evictionReason)}.`
                : null
      : kind === "rent-increase"
        ? !lastIncreaseDate
          ? "Enter the last rent increase date, or the tenancy start date if rent has not changed."
          : !selectedUnit ||
              !canIncreaseRent(lastIncreaseDate, selectedUnit.rent, newRent, issuedOn)
            ? `Rent increases require at least ${RENT_INCREASE_INTERVAL_MONTHS} months since the last increase and must not exceed ${MAX_ANNUAL_RENT_INCREASE_PCT}%.`
            : !rentNoticeDeadline || issuedOn > rentNoticeDeadline
              ? `Give at least ${RENT_INCREASE_NOTICE_DAYS} days' notice; issue this notice on or before ${rentNoticeDeadline || "the required notice date"}.`
              : null
        : kind === "repair" && !details.trim()
          ? "Describe the repair work in the notice details."
          : null;
  const serviceTouched = !!servedAt || !!receivedBy || !!lc1Witness;
  const serviceError =
    kind === "notice-to-vacate" && serviceTouched && (!servedAt || !receivedBy.trim())
      ? "Complete the service date and recipient, or leave all proof-of-service fields blank."
      : null;

  useEffect(() => {
    try {
      setNotices(readTenantNotices());
    } catch (error) {
      console.error("Could not load saved notices.", error);
      toast.error("Saved notices could not be loaded.");
    }

    function dataUrlSize(dataUrl: string) {
      const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
      return Math.floor((encoded.length * 3) / 4);
    }
  }, []);

  useEffect(() => {
    if (presetUnitId && occupiedUnits.some((unit) => unit.id === presetUnitId)) {
      setUnitId(presetUnitId);
      setKind("notice-to-vacate");
    } else if (!occupiedUnits.some((unit) => unit.id === unitId)) {
      setUnitId(occupiedUnits[0]?.id ?? "");
    }
  }, [occupiedUnits, presetUnitId, unitId]);

  useEffect(() => {
    setLastIncreaseDate(previousNoticeDate ?? activeTenancy?.startDate ?? "");
  }, [activeTenancy?.startDate, previousNoticeDate, selectedUnit?.id]);

  useEffect(() => {
    if (vacateBy < evictionMinDate) setVacateBy(evictionMinDate);
    if (effectiveDate < rentIncreaseMinDate) setEffectiveDate(rentIncreaseMinDate);
  }, [effectiveDate, evictionMinDate, rentIncreaseMinDate, vacateBy]);

  const submitNotice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUnit || !selectedUnit.tenant) {
      toast.error("Choose an occupied unit first.");
      return;
    }
    if (legalError || serviceError) {
      toast.error("This notice needs changes before it can be issued.", {
        description: legalError ?? serviceError ?? undefined,
      });
      return;
    }

    const issuedNotice: TenantNotice = {
      id: `notice-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      kind,
      unit: selectedUnit.unit,
      property: selectedUnit.property,
      tenant: selectedUnit.tenant,
      phone: selectedUnit.phone,
      email: selectedUnit.email ?? "",
      issuedOn,
      issuedBy: "Landlord demo account",
      reason:
        kind === "notice-to-vacate"
          ? evictionReason
          : kind === "rent-increase"
            ? `Rent increase of ${Number(increasePct)}%`
            : kind === "repair"
              ? "Repair notice"
              : (kindOptions.find((option) => option.value === kind)?.label ?? ""),
      ...(kind === "notice-to-vacate" ? { reasonCategory: reasonCategory as EvictionReason } : {}),
      ...(details.trim() ? { details: details.trim() } : {}),
      ...(kind === "notice-to-vacate" ? { effectiveDate: vacateBy } : {}),
      ...(kind === "rent-increase"
        ? {
            effectiveDate,
            rentIncreasePct: Number(increasePct),
            oldRent: selectedUnit.rent,
            newRent,
          }
        : {}),
      ...(kind === "end-of-tenancy" ? { effectiveDate: endDate } : {}),
      ...(kind === "formal-rent-demand" ||
      kind === "notice-of-default" ||
      kind === "notice-to-vacate"
        ? {
            arrearsStatement: createArrearsStatement(
              selectedUnit,
              ledger,
              activeTenancy?.startDate,
              today,
            ),
          }
        : {}),
      ...(serviceTouched
        ? {
            service: {
              method: serviceMethod,
              servedAt,
              receivedBy: receivedBy.trim(),
              ...(lc1Witness.trim() ? { lc1Witness: lc1Witness.trim() } : {}),
            },
          }
        : {}),
      attachments,
    };

    try {
      const saved = saveTenantNotice(issuedNotice);
      setNotices(saved);
      onNoticeSaved(issuedNotice);
      toast.success("Notice saved and added to the tenant app.");
      setDetails("");
      setAttachments([]);
      setServedAt("");
      setReceivedBy("");
      setLc1Witness("");
    } catch (error) {
      console.error("Could not save tenant notice.", error);
      toast.error("The notice could not be saved.", {
        description:
          error instanceof Error ? error.message : "Check browser storage and try again.",
      });
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files);
    const allowed = incoming.every((file) =>
      ["application/pdf", "image/jpeg", "image/png"].includes(file.type),
    );
    if (!allowed) {
      toast.error("Use PDF, JPG, or PNG attachments.");
      return;
    }
    if (incoming.some((file) => file.size > MAX_ATTACHMENT_BYTES)) {
      toast.error("Each attachment must be 2 MB or smaller.");
      return;
    }
    if (
      attachments.reduce((sum, attachment) => sum + dataUrlSize(attachment.dataUrl), 0) +
        incoming.reduce((sum, file) => sum + file.size, 0) >
      MAX_ATTACHMENT_TOTAL_BYTES
    ) {
      toast.error("Keep the total attachment size to 2 MB or less.");
      return;
    }
    if (attachments.length + incoming.length > MAX_ATTACHMENT_COUNT) {
      toast.error(`Attach up to ${MAX_ATTACHMENT_COUNT} files.`);
      return;
    }
    try {
      const added = await Promise.all(incoming.map(fileToDataUrl));
      setAttachments((current) => [...current, ...added]);
    } catch (error) {
      console.error("Could not read notice attachment.", error);
      toast.error("An attachment could not be read.");
    }
  };

  const downloadNotice = async (notice: TenantNotice) => {
    try {
      const branding: ReceiptBranding = getReceiptBranding();
      const bytes = await buildNoticePdf(notice, branding);
      const pdfBytes = new Uint8Array(bytes.byteLength);
      pdfBytes.set(bytes);
      const blob = new Blob([pdfBytes.buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${notice.kind}-${notice.unit}-${notice.issuedOn}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Could not generate notice PDF.", error);
      toast.error("The notice PDF could not be generated.", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  };

  const saveServiceProof = (notice: TenantNotice) => {
    if (!servedAt || !receivedBy.trim()) {
      toast.error("Add the service date and the name of the recipient.");
      return;
    }
    const service: NoticeServiceRecord = {
      method: serviceMethod,
      servedAt,
      receivedBy: receivedBy.trim(),
      ...(lc1Witness.trim() ? { lc1Witness: lc1Witness.trim() } : {}),
    };
    try {
      const saved = updateTenantNoticeService(notice.id, service);
      setNotices(saved);
      setSavingServiceFor(null);
      setServedAt("");
      setReceivedBy("");
      setLc1Witness("");
      toast.success("Proof of service recorded.");
    } catch (error) {
      console.error("Could not record notice service.", error);
      toast.error("Proof of service could not be recorded.");
    }
  };

  return (
    <section className="space-y-6">
      <header className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-eyebrow text-primary">Landlord tools</p>
          <h1 className="mt-2 text-2xl font-bold text-primary-deep sm:text-3xl">Notices</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Prepare a notice, save a branded PDF, and add it to the tenant app. This demo does not
            send email, WhatsApp, or legal service.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary-deep">
          <BellRing className="size-4" aria-hidden />
          {notices.length} saved {notices.length === 1 ? "notice" : "notices"}
        </span>
      </header>

      <section className="surface p-5 sm:p-6" aria-labelledby="notice-ladder-title">
        <h2 id="notice-ladder-title" className="text-lg font-bold text-primary-deep">
          Rent escalation ladder
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep a clear record as you move from a reminder to a formal notice.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {escalation.map(([step, title, description]) => (
            <li key={step} className="rounded-xl border border-border bg-card p-4">
              <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-deep">
                {step}
              </span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <form className="surface space-y-5 p-5 sm:p-6" onSubmit={submitNotice}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Notice template">
            <select
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={kind}
              onChange={(event) => setKind(event.target.value as NoticeKind)}
            >
              {kindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Occupied property / unit">
            <select
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={unitId}
              onChange={(event) => setUnitId(event.target.value)}
              required
            >
              <option value="" disabled>
                Choose an occupied unit
              </option>
              {occupiedUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.property} · {unit.block ? `${unit.block} · ` : ""}
                  {unit.unit} · {unit.tenant}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {selectedUnit && (
          <div className="grid gap-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-3">
            <p>
              <span className="text-muted-foreground">Tenant:</span> {selectedUnit.tenant}
            </p>
            <p>
              <span className="text-muted-foreground">Phone:</span> {selectedUnit.phone}
            </p>
            <p>
              <span className="text-muted-foreground">Monthly rent:</span>{" "}
              {formatUGX(selectedUnit.rent)}
            </p>
          </div>
        )}
        {kind === "end-of-tenancy" && (
          <Field label="Tenancy end date">
            <Input
              type="date"
              value={endDate}
              min={today}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Notice date">
            <Input
              type="date"
              value={issuedOn}
              min={today}
              max={today}
              onChange={(event) => setIssuedOn(event.target.value)}
              required
            />
          </Field>
          {kind === "notice-to-vacate" && (
            <Field label="Move-out date">
              <Input
                type="date"
                value={vacateBy}
                min={evictionMinDate}
                onChange={(event) => setVacateBy(event.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Cannot be earlier than {evictionMinDate}; at least {MIN_EVICTION_NOTICE_DAYS} days'
                notice is required.
              </p>
            </Field>
          )}
          {kind === "rent-increase" && (
            <>
              <Field label="Proposed annual increase (%)">
                <Input
                  type="number"
                  min="0.01"
                  max={MAX_ANNUAL_RENT_INCREASE_PCT}
                  step="0.01"
                  value={increasePct}
                  onChange={(event) => setIncreasePct(event.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Maximum {MAX_ANNUAL_RENT_INCREASE_PCT}% per year. New rent: {formatUGX(newRent)}{" "}
                  per month.
                </p>
              </Field>
              <Field label="Last rent increase date">
                <Input
                  type="date"
                  value={lastIncreaseDate}
                  max={issuedOn || today}
                  onChange={(event) => setLastIncreaseDate(event.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  If rent has not increased, use the tenancy start date.
                </p>
              </Field>
              <Field label="New rent starts">
                <Input
                  type="date"
                  value={effectiveDate}
                  min={rentIncreaseMinDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Cannot be earlier than {rentIncreaseMinDate}; at least {RENT_INCREASE_NOTICE_DAYS}{" "}
                  days' notice is required.
                </p>
              </Field>
            </>
          )}
        </div>

        {kind === "notice-to-vacate" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mandatory reason">
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={reasonCategory}
                onChange={(event) => setReasonCategory(event.target.value as EvictionReason | "")}
                required
              >
                <option value="" disabled>
                  Choose a reason
                </option>
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            {reasonCategory === "other" && (
              <Field label="Reason details">
                <Input
                  value={otherReason}
                  onChange={(event) => setOtherReason(event.target.value)}
                  maxLength={300}
                  required
                />
              </Field>
            )}
          </div>
        )}

        <Field
          label={
            kind === "notice-to-vacate"
              ? "Additional details"
              : kind === "repair"
                ? "Repair details"
                : "Message / details"
          }
        >
          <Textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={1000}
            required={kind === "repair"}
            placeholder={
              kind === "notice-to-vacate"
                ? "Add relevant details. The reason above is required."
                : kind === "repair"
                  ? "Describe the repair work and any proposed access arrangements."
                  : "Add payment instructions or other relevant details."
            }
          />
        </Field>

        {kind === "notice-to-vacate" && (
          <fieldset className="space-y-4 rounded-xl border border-border p-4 sm:p-5">
            <legend className="px-1 text-sm font-semibold">
              Proof of service (optional until served)
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Service method">
                <select
                  className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={serviceMethod}
                  onChange={(event) =>
                    setServiceMethod(event.target.value as NoticeServiceRecord["method"])
                  }
                >
                  {serviceMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date and time served">
                <Input
                  type="datetime-local"
                  value={servedAt}
                  onChange={(event) => setServedAt(event.target.value)}
                />
              </Field>
              <Field label="Who received it">
                <Input
                  value={receivedBy}
                  onChange={(event) => setReceivedBy(event.target.value)}
                  maxLength={120}
                />
              </Field>
              <Field label="LC1 witness (optional)">
                <Input
                  value={lc1Witness}
                  onChange={(event) => setLc1Witness(event.target.value)}
                  maxLength={120}
                />
              </Field>
            </div>
            {serviceError && <p className="text-sm text-destructive">{serviceError}</p>}
          </fieldset>
        )}

        <Field label="Optional attachments (PDF, JPG, PNG)">
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 text-sm font-medium hover:bg-muted/60">
            <Upload className="size-4" aria-hidden />
            Add supporting files
            <input
              className="sr-only"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              multiple
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {attachments.length > 0 && (
            <ul className="mt-2 space-y-2">
              {attachments.map((attachment, index) => (
                <li key={`${attachment.name}-${index}`} className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                    aria-label={`Remove ${attachment.name}`}
                    onClick={() =>
                      setAttachments((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>

        {legalError && <p className="text-sm font-medium text-destructive">{legalError}</p>}

        {kind === "notice-to-vacate" && (
          <div className="space-y-2 rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm leading-relaxed text-warning-ink">
            <p className="font-semibold">Lawful next steps</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Serve notice first and allow the full notice period to expire.</li>
              <li>No force, lock-outs, or seizing belongings.</li>
              <li>
                If the tenant stays after the notice, a court order is required. Do not remove a
                tenant yourself.
              </li>
              <li>
                Use court for arrears; small claims may apply up to{" "}
                {formatUGX(SMALL_CLAIMS_LIMIT_UGX)}.
              </li>
            </ol>
            <p className="font-semibold">
              This is a notice, not an eviction order. Have an advocate review before serving.
            </p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            className="min-h-12 w-full sm:w-auto"
            disabled={!selectedUnit || !!legalError || !!serviceError}
          >
            <BellRing className="size-4" aria-hidden />
            Save and notify tenant
          </Button>
        </div>
      </form>

      <section className="surface space-y-4 p-5 sm:p-6" aria-labelledby="saved-notices-title">
        <div>
          <h2 id="saved-notices-title" className="text-lg font-bold text-primary-deep">
            Saved notices
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Notices remain in this browser demo.</p>
        </div>
        {notices.length === 0 ? (
          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            No notices yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {notices.map((notice) => (
              <li key={notice.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {kindOptions.find((option) => option.value === notice.kind)?.label ??
                        "Notice"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {notice.property} · Unit {notice.unit} · {notice.tenant}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Issued {notice.issuedOn}</p>
                    <p className="mt-2 text-xs">
                      {notice.service
                        ? `Served by ${notice.service.method} to ${notice.service.receivedBy} · ${notice.service.servedAt}`
                        : "Proof of service not recorded"}
                    </p>
                    {notice.response && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        Tenant response: {notice.response.status.replace("-", " ")}
                        {notice.response.message ? ` · ${notice.response.message}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => void downloadNotice(notice)}
                    >
                      <Printer className="size-4" aria-hidden />
                      PDF
                    </Button>
                    {!notice.service && (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() =>
                          setSavingServiceFor(savingServiceFor === notice.id ? null : notice.id)
                        }
                      >
                        Record service
                      </Button>
                    )}
                  </div>
                </div>
                {savingServiceFor === notice.id && (
                  <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                    <Field label="Service method">
                      <select
                        className="min-h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
                        value={serviceMethod}
                        onChange={(event) =>
                          setServiceMethod(event.target.value as NoticeServiceRecord["method"])
                        }
                      >
                        {serviceMethods.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Date and time served">
                      <Input
                        type="datetime-local"
                        value={servedAt}
                        onChange={(event) => setServedAt(event.target.value)}
                      />
                    </Field>
                    <Field label="Who received it">
                      <Input
                        value={receivedBy}
                        onChange={(event) => setReceivedBy(event.target.value)}
                      />
                    </Field>
                    <Field label="LC1 witness (optional)">
                      <Input
                        value={lc1Witness}
                        onChange={(event) => setLc1Witness(event.target.value)}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        className="min-h-11 w-full sm:w-auto"
                        onClick={() => saveServiceProof(notice)}
                      >
                        Save proof of service
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="min-w-0 space-y-1.5">
      <span className="block">{label}</span>
      <span className="block">{children}</span>
    </Label>
  );
}

function createArrearsStatement(
  unit: Unit,
  ledger: LedgerEntry[],
  tenancyStart?: string,
  today = localDateIso(),
) {
  const currentPeriod = currentRentPeriod(new Date(`${today}T00:00:00`));
  const unitEntries = ledger.filter(
    (entry) => entry.unitId === unit.id && entry.tenant === unit.tenant,
  );
  const earliestLedgerPeriod = unitEntries.map((entry) => entry.rentPeriod).sort()[0];
  const startPeriod = tenancyStart?.slice(0, 7) ?? earliestLedgerPeriod ?? currentPeriod;
  const months = Math.max(0, rentPeriodDifference(startPeriod, currentPeriod));
  if (months > 360) throw new RangeError("The notice arrears period exceeds 30 years.");
  const rows = Array.from({ length: months + 1 }, (_, index) =>
    addRentPeriodMonths(startPeriod, index),
  )
    .filter((period) => period < currentPeriod || unit.daysUntilDue < 0)
    .map((period) => {
      const paid = getUnitPeriodCredit(unit, ledger, period);
      return {
        period,
        rentDue: unit.rent,
        paid,
        balance: Math.max(0, unit.rent - paid),
      };
    })
    .filter((row) => row.balance > 0);
  return {
    asOf: today,
    rows,
    total: rows.reduce((sum, row) => sum + row.balance, 0),
  };
}

function fileToDataUrl(file: File): Promise<NoticeAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Could not read ${file.name}.`));
        return;
      }
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
        reject(new Error(`Unsupported file type: ${file.type}`));
        return;
      }
      resolve({
        name: file.name,
        mimeType: file.type as NoticeAttachment["mimeType"],
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  });
}

function dataUrlSize(dataUrl: string) {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((encoded.length * 3) / 4);
}
