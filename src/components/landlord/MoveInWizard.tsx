import { ArrowLeft, ArrowRight, FileText, Loader2, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { FieldError } from "@/components/tenant/PayFlow";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_ADVANCE_MONTHS,
  DEFAULT_DEPOSIT_MONTHS,
  MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT,
  MAX_DEPOSIT_MONTHS,
} from "@/lib/legal";
import { formatUGX, normalizeUgPhone } from "@/lib/rent";
import {
  calculateMoveInTotal,
  getAdvanceAgreementError,
  isDepositAboveLegalLimit,
  type MoveInInput,
} from "@/lib/tenancy";
import type { Unit } from "@/lib/sample-data";
import { ease } from "@/lib/motion";

const steps = ["Unit and tenant", "Review", "Send payment request"];

type Errors = {
  name?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  unit?: string;
  rent?: string;
  startDate?: string;
  dueDay?: string;
  advanceMonths?: string;
  depositMonths?: string;
  legal?: string;
  payment?: string;
};

export type MoveInSubmission = MoveInInput & {
  initialPayment: number;
};

export function MoveInWizard({
  open,
  onOpenChange,
  vacantUnits,
  presetUnitId,
  defaultRentDueDay,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacantUnits: Unit[];
  presetUnitId?: string;
  defaultRentDueDay: number;
  onCreate: (tenancy: MoveInSubmission) => void;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [unitId, setUnitId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tenantIdType, setTenantIdType] = useState("National ID");
  const [tenantIdNumber, setTenantIdNumber] = useState("");
  const [agreementFile, setAgreementFile] = useState<string | null>(null);
  const [monthlyRent, setMonthlyRent] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDay, setDueDay] = useState("1");
  const [advanceMonths, setAdvanceMonths] = useState(String(DEFAULT_ADVANCE_MONTHS));
  const [depositMonths, setDepositMonths] = useState(String(DEFAULT_DEPOSIT_MONTHS));
  const [advanceAgreedByBoth, setAdvanceAgreedByBoth] = useState(false);
  const [advanceAgreementNote, setAdvanceAgreementNote] = useState("");
  const [copyGiven, setCopyGiven] = useState(false);
  const [initialPayment, setInitialPayment] = useState("0");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!justOpened) return;
    const unit = vacantUnits.find((item) => item.id === presetUnitId) ?? vacantUnits[0];
    setStep(0);
    setUnitId(unit?.id ?? "");
    setName("");
    setPhone("");
    setEmail("");
    setTenantIdType("National ID");
    setTenantIdNumber("");
    setAgreementFile(null);
    setMonthlyRent(unit ? unit.rent.toLocaleString("en-UG") : "");
    setStartDate(new Date().toISOString().slice(0, 10));
    setDueDay(String(defaultRentDueDay));
    setAdvanceMonths(String(DEFAULT_ADVANCE_MONTHS));
    setDepositMonths(String(DEFAULT_DEPOSIT_MONTHS));
    setAdvanceAgreedByBoth(false);
    setAdvanceAgreementNote("");
    setCopyGiven(false);
    setInitialPayment("0");
    setErrors({});
    setSaving(false);
  }, [defaultRentDueDay, open, presetUnitId, vacantUnits]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const unit = vacantUnits.find((item) => item.id === unitId);
  const rent = Number(monthlyRent.replace(/[^\d]/g, ""));
  const advance = Number(advanceMonths);
  const deposit = Number(depositMonths);
  const total = calculateMoveInTotal(
    Number.isFinite(rent) ? rent : 0,
    Number.isInteger(advance) && advance >= 0 ? advance : 0,
    Number.isInteger(deposit) && deposit >= 0 ? deposit : 0,
  );
  const firstPayment = Number(initialPayment.replace(/[^\d]/g, ""));
  const legalError = getAdvanceAgreementError(advance, advanceAgreedByBoth, advanceAgreementNote);

  function validate(currentStep: number) {
    const nextErrors: Errors = {};
    if (currentStep === 0) {
      if (!unitId) nextErrors.unit = "Choose a vacant unit.";
      if (!name.trim()) nextErrors.name = "Enter the tenant's full name.";
      if (!normalizeUgPhone(phone)) {
        nextErrors.phone = "Enter a Ugandan mobile number, for example 0772 123 456.";
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        nextErrors.email = "Enter a valid email address.";
      }
      if (!tenantIdNumber.trim()) nextErrors.idNumber = "Enter the tenant's ID number.";
      if (!rent || rent < 50_000) nextErrors.rent = "Monthly rent must be at least UGX 50,000.";
      if (!startDate) nextErrors.startDate = "Choose a tenancy start date.";
      if (!Number.isInteger(Number(dueDay)) || Number(dueDay) < 1 || Number(dueDay) > 31) {
        nextErrors.dueDay = "Choose a day from 1 to 31.";
      }
      if (!Number.isInteger(advance) || advance < 1 || advance > 12) {
        nextErrors.advanceMonths = "Choose between 1 and 12 advance months.";
      }
      if (!Number.isInteger(deposit) || deposit < 0 || deposit > 12) {
        nextErrors.depositMonths = "Choose between 0 and 12 deposit months.";
      }
    }
    if (currentStep === 1 && legalError) nextErrors.legal = legalError;
    if (
      currentStep === 2 &&
      (!Number.isFinite(firstPayment) || firstPayment < 0 || firstPayment > total)
    ) {
      nextErrors.payment = "Enter an amount between zero and the total move-in amount.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function next() {
    if (!validate(step)) return;
    setDirection(1);
    setStep((current) => current + 1);
  }

  function back() {
    setDirection(-1);
    setStep((current) => current - 1);
  }

  function submit() {
    if (!validate(2)) return;
    setSaving(true);
    window.setTimeout(() => {
      onCreate({
        unitId,
        tenantName: name.trim(),
        phone: normalizeUgPhone(phone) ?? phone.trim(),
        email: email.trim(),
        monthlyRent: rent,
        startDate,
        dueDay: Number(dueDay),
        advanceMonths: advance,
        depositMonths: deposit,
        advanceAgreedByBoth,
        advanceAgreementNote: advanceAgreementNote.trim(),
        agreementFile,
        tenantIdType,
        tenantIdNumber: tenantIdNumber.trim(),
        copyGivenToTenantAt: copyGiven ? new Date().toISOString() : null,
        initialPayment: firstPayment,
      });
      setSaving(false);
      onOpenChange(false);
    }, 350);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl bg-background p-0">
        <div className="shrink-0 border-b border-primary/10 bg-primary-soft px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <DialogTitle className="text-xl font-bold">Start a tenancy</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}: {steps[step]}
          </DialogDescription>
          <div className="mt-4 grid grid-cols-3 gap-1.5" aria-hidden="true">
            {steps.map((label, index) => (
              <div key={label} className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full origin-left rounded-full bg-primary"
                  initial={false}
                  animate={{ scaleX: index <= step ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: ease.outExpo }}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          ref={contentRef}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6"
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={{
                enter: (value: number) => ({ x: value * 32, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (value: number) => ({ x: value * -32, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: ease.outExpo }}
              className="space-y-5"
            >
              {step === 0 && (
                <>
                  <div>
                    <Label htmlFor="move-in-unit">Unit</Label>
                    <Select
                      value={unitId}
                      onValueChange={(value) => {
                        setUnitId(value);
                        const selected = vacantUnits.find((item) => item.id === value);
                        if (selected) setMonthlyRent(selected.rent.toLocaleString("en-UG"));
                      }}
                    >
                      <SelectTrigger
                        id="move-in-unit"
                        className="mt-2 h-12 bg-card"
                        aria-invalid={!!errors.unit}
                      >
                        <SelectValue placeholder="Choose a vacant unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {vacantUnits.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.unit}, {item.property}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError id="move-in-unit-error" message={errors.unit} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="move-in-name">Tenant full name</Label>
                      <Input
                        id="move-in-name"
                        className="mt-2"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        autoComplete="name"
                        aria-invalid={!!errors.name}
                      />
                      <FieldError id="move-in-name-error" message={errors.name} />
                    </div>
                    <div>
                      <Label htmlFor="move-in-phone">Mobile number</Label>
                      <Input
                        id="move-in-phone"
                        type="tel"
                        className="figure mt-2"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="0772 123 456"
                        aria-invalid={!!errors.phone}
                      />
                      <FieldError id="move-in-phone-error" message={errors.phone} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="move-in-email">Email (optional)</Label>
                      <Input
                        id="move-in-email"
                        type="email"
                        className="mt-2"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                      />
                      <FieldError id="move-in-email-error" message={errors.email} />
                    </div>
                    <div>
                      <Label htmlFor="move-in-id-type">Tenant ID type</Label>
                      <Select value={tenantIdType} onValueChange={setTenantIdType}>
                        <SelectTrigger id="move-in-id-type" className="mt-2 h-12 bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="National ID">National ID</SelectItem>
                          <SelectItem value="Passport">Passport</SelectItem>
                          <SelectItem value="Driver licence">Driver licence</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="move-in-id-number">Tenant ID number</Label>
                    <Input
                      id="move-in-id-number"
                      className="mt-2"
                      value={tenantIdNumber}
                      onChange={(event) => setTenantIdNumber(event.target.value)}
                      aria-invalid={!!errors.idNumber}
                    />
                    <FieldError id="move-in-id-number-error" message={errors.idNumber} />
                  </div>
                  <div>
                    <Label htmlFor="move-in-agreement">Tenancy agreement file (optional)</Label>
                    <Input
                      id="move-in-agreement"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="mt-2 h-12 bg-card file:mr-3 file:rounded-full file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary-deep"
                      onChange={(event) => setAgreementFile(event.target.files?.[0]?.name ?? null)}
                    />
                    {agreementFile && (
                      <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="size-4" aria-hidden />
                        {agreementFile}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      This demo records the file name only; it does not upload documents.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="move-in-rent">Monthly rent (UGX)</Label>
                      <Input
                        id="move-in-rent"
                        inputMode="numeric"
                        className="figure mt-2"
                        value={monthlyRent}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/[^\d]/g, "");
                          setMonthlyRent(digits ? Number(digits).toLocaleString("en-UG") : "");
                        }}
                        aria-invalid={!!errors.rent}
                      />
                      <FieldError id="move-in-rent-error" message={errors.rent} />
                    </div>
                    <div>
                      <Label htmlFor="move-in-start">Start date</Label>
                      <Input
                        id="move-in-start"
                        type="date"
                        className="mt-2"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        aria-invalid={!!errors.startDate}
                      />
                      <FieldError id="move-in-start-error" message={errors.startDate} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="move-in-due-day">Rent due day</Label>
                      <Input
                        id="move-in-due-day"
                        type="number"
                        min="1"
                        max="31"
                        className="mt-2"
                        value={dueDay}
                        onChange={(event) => setDueDay(event.target.value)}
                        aria-invalid={!!errors.dueDay}
                      />
                      <FieldError id="move-in-due-day-error" message={errors.dueDay} />
                    </div>
                    <div>
                      <Label htmlFor="move-in-advance">Advance months</Label>
                      <Input
                        id="move-in-advance"
                        type="number"
                        min="1"
                        max="12"
                        className="mt-2"
                        value={advanceMonths}
                        onChange={(event) => setAdvanceMonths(event.target.value)}
                        aria-invalid={!!errors.advanceMonths}
                      />
                      <FieldError id="move-in-advance-error" message={errors.advanceMonths} />
                    </div>
                    <div>
                      <Label htmlFor="move-in-deposit">Deposit months</Label>
                      <Input
                        id="move-in-deposit"
                        type="number"
                        min="0"
                        max="12"
                        className="mt-2"
                        value={depositMonths}
                        onChange={(event) => setDepositMonths(event.target.value)}
                        aria-invalid={!!errors.depositMonths}
                      />
                      <FieldError id="move-in-deposit-error" message={errors.depositMonths} />
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <dl className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
                    {[
                      ["Tenant", name],
                      ["ID", `${tenantIdType} · ${tenantIdNumber}`],
                      ["Mobile", normalizeUgPhone(phone) ?? phone],
                      ["Unit", unit ? `${unit.unit}, ${unit.property}` : "-"],
                      ["Monthly rent", formatUGX(rent)],
                      ["Start date", startDate],
                      ["Rent due day", `${dueDay} of each month`],
                      ["Advance rent", `${advance} × ${formatUGX(rent)}`],
                      ["Security deposit", `${deposit} × ${formatUGX(rent)}`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="figure text-right font-semibold">{value}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-4 bg-primary-soft px-4 py-4">
                      <dt className="font-bold text-primary-deep">Total move-in amount</dt>
                      <dd className="figure text-right text-lg font-bold text-primary-deep">
                        {formatUGX(total)}
                      </dd>
                    </div>
                  </dl>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">Advance rent</p>
                      <p className="figure mt-1 text-lg font-bold">{formatUGX(rent * advance)}</p>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">Deposit held separately</p>
                      <p className="figure mt-1 text-lg font-bold">{formatUGX(rent * deposit)}</p>
                    </div>
                  </div>
                  {legalError && (
                    <p
                      role="alert"
                      className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive-ink"
                    >
                      {legalError}
                    </p>
                  )}
                  {advance > MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT && (
                    <div className="space-y-3 rounded-lg border border-warning/40 bg-warning-soft p-4">
                      <div className="flex items-start gap-3">
                        <ShieldAlert
                          className="mt-0.5 size-5 shrink-0 text-warning-ink"
                          aria-hidden
                        />
                        <p className="text-sm text-warning-ink">
                          More than {MAX_ADVANCE_MONTHS_WITHOUT_AGREEMENT} months’ advance rent
                          requires a written agreement by both parties. This is a guidance check;
                          confirm the terms with an advocate.
                        </p>
                      </div>
                      <label className="flex items-start gap-3 text-sm font-medium">
                        <Checkbox
                          checked={advanceAgreedByBoth}
                          onCheckedChange={(checked) => setAdvanceAgreedByBoth(checked === true)}
                          aria-invalid={!!errors.legal}
                        />
                        Both parties agree to this advance in writing.
                      </label>
                      <div>
                        <Label htmlFor="move-in-agreement-note">Agreement note</Label>
                        <Textarea
                          id="move-in-agreement-note"
                          className="mt-2 min-h-20 bg-card"
                          value={advanceAgreementNote}
                          onChange={(event) => setAdvanceAgreementNote(event.target.value)}
                          placeholder="Record the agreed advance terms"
                        />
                      </div>
                    </div>
                  )}
                  {isDepositAboveLegalLimit(deposit) && (
                    <p className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-warning-ink">
                      Deposit above {MAX_DEPOSIT_MONTHS} month{MAX_DEPOSIT_MONTHS === 1 ? "" : "s"}:
                      confirm the amount is agreed and documented.
                    </p>
                  )}
                  <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
                    <Checkbox
                      checked={copyGiven}
                      onCheckedChange={(checked) => setCopyGiven(checked === true)}
                    />
                    Mark a copy of the agreement as given to the tenant.
                  </label>
                  <FieldError id="move-in-legal-error" message={errors.legal} />
                </>
              )}

              {step === 2 && (
                <>
                  <div className="rounded-xl bg-primary-soft p-5">
                    <p className="text-sm font-semibold text-primary-deep">Payment request for</p>
                    <p className="mt-1 text-lg font-bold">{name}</p>
                    <p className="text-sm text-muted-foreground">
                      Unit {unit?.unit} · {unit?.property}
                    </p>
                    <p className="figure mt-4 text-3xl font-bold text-primary-deep">
                      {formatUGX(total)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {advance} months’ rent + {deposit} months’ deposit
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="font-semibold">Move-in amount breakdown</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">
                          Advance rent ({advance} months)
                        </span>
                        <span className="figure font-semibold">{formatUGX(rent * advance)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">
                          Deposit ({deposit} months · held separately)
                        </span>
                        <span className="figure font-semibold">{formatUGX(rent * deposit)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="move-in-paid-now">Payment received today (optional)</Label>
                    <Input
                      id="move-in-paid-now"
                      inputMode="numeric"
                      className="figure mt-2"
                      value={initialPayment}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/[^\d]/g, "");
                        setInitialPayment(digits ? Number(digits).toLocaleString("en-UG") : "0");
                      }}
                      aria-invalid={!!errors.payment}
                    />
                    <FieldError id="move-in-payment-error" message={errors.payment} />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Part payments are allowed. The tenancy stays pending until the full move-in
                      amount is received; any remaining balance can be recorded from the unit.
                    </p>
                  </div>
                  {firstPayment > 0 && (
                    <div className="flex justify-between rounded-lg bg-muted p-4 text-sm">
                      <span>Balance after this payment</span>
                      <span className="figure font-bold">{formatUGX(total - firstPayment)}</span>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background p-3 sm:p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={back}
            disabled={step === 0 || saving}
            className={step === 0 ? "invisible" : ""}
          >
            <ArrowLeft /> Back
          </Button>
          {step < 2 ? (
            <Button type="button" onClick={next}>
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              {saving ? "Sending request" : "Send payment request"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
