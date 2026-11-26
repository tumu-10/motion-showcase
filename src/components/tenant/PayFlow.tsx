import { Clock3, CreditCard, Landmark, Loader2, Receipt, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BrandLogo, type PayBrand } from "@/components/payments/BrandLogo";
import { AnimatedCheck } from "@/components/shared/AnimatedCheck";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  detectNetwork,
  formatUGX,
  networkLabel,
  normalizeUgPhone,
  type MobileNetwork,
} from "@/lib/rent";
import type { LandlordPaymentDetails } from "@/lib/sample-data";
import { makePaymentReference, needsAdvanceAgreement } from "@/lib/rent";
import { formatRentPeriodRange } from "@/lib/rent-accounting";
import { ease } from "@/lib/motion";
import { createCheckout, isCheckoutConfigured } from "@/lib/checkout";
import { cn } from "@/lib/utils";
import { mockPaymentProviders } from "@/lib/payment-provider";
import type { TenantPaymentPreference } from "@/lib/demo-settings";
import { buildReceiptPdf } from "@/lib/receipt-pdf";
import { getReceiptBundle } from "@/lib/receipt-branding";

type Step = "form" | "approve" | "success" | "failed";

export type PaymentResult = {
  amount: number;
  rentPeriod: string;
  monthsCovered: number;
  coverageAmounts: number[];
  method: "MTN Mobile Money" | "Airtel Money" | "Bank transfer" | "Visa" | "Mastercard";
  reference: string;
  phone: string;
  pending: boolean;
  bankProofDataUrl?: string | undefined;
  providerToken?: string | undefined;
  failed?: boolean | undefined;
  receiptNumber?: string | undefined;
  unit?: string | undefined;
  paidAt?: string | undefined;
};
type PaymentMethod = TenantPaymentPreference;

const APPROVE_SECONDS = 4;

export function PayFlow({
  rent,
  balance,
  rentPeriod,
  invoiceId,
  unit,
  defaultPhone,
  paymentDetails,
  preferredPaymentMethod,
  onPaid,
  onOpenServices,
  onClose,
}: {
  rent: number;
  balance: number;
  rentPeriod: string;
  invoiceId: string;
  unit: string;
  defaultPhone: string;
  paymentDetails: LandlordPaymentDetails;
  preferredPaymentMethod: PaymentMethod;
  onPaid: (r: PaymentResult) => string | null;
  onOpenServices: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [amountMode, setAmountMode] = useState<"full" | "other">("full");
  const [monthsCovered, setMonthsCovered] = useState("1");
  const [otherAmount, setOtherAmount] = useState("");
  const [network, setNetwork] = useState<MobileNetwork>(detectNetwork(defaultPhone) ?? "mtn");
  const [method, setMethod] = useState<PaymentMethod>(preferredPaymentMethod);
  const [cardBrand, setCardBrand] = useState<"Visa" | "Mastercard">("Visa");
  const [phone, setPhone] = useState(defaultPhone);
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; phone?: string }>({});
  const [agreed, setAgreed] = useState(false);
  const needsAgreement = amountMode === "full" && needsAdvanceAgreement(Number(monthsCovered));
  const [result, setResult] = useState<PaymentResult | null>(null);
  const mobileMoneyConfigured =
    paymentDetails.mobileMoneyEnabled &&
    Boolean(paymentDetails.mobileMoneyNumber?.trim()) &&
    Boolean(detectNetwork(paymentDetails.mobileMoneyNumber ?? ""));
  const checkoutConfigured =
    method === "bank"
      ? isCheckoutConfigured("bank")
      : method === "visa"
        ? isCheckoutConfigured(cardBrand === "Visa" ? "visa" : "mastercard")
        : mobileMoneyConfigured;

  const amount =
    amountMode === "full"
      ? balance + rent * (Number(monthsCovered) - 1)
      : Number(otherAmount.replace(/[^\d]/g, ""));
  const coverageAmounts =
    amountMode === "full"
      ? [balance, ...Array.from({ length: Number(monthsCovered) - 1 }, () => rent)]
      : [amount];
  useEffect(() => {
    setMethod(preferredPaymentMethod);
  }, [preferredPaymentMethod]);

  useEffect(() => {
    if (method === "mobile" && !mobileMoneyConfigured) setMethod("visa");
  }, [method, mobileMoneyConfigured]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (amountMode === "other") {
      if (!amount) next.amount = "Enter an amount.";
      else if (amount < 10_000) next.amount = "The minimum payment is UGX 10,000.";
      else if (amount > balance)
        next.amount = `Your remaining balance is ${formatUGX(balance)}. Enter that amount or less.`;
    }
    const local = method === "mobile" ? normalizeUgPhone(phone) : null;
    const detected = method === "mobile" ? detectNetwork(phone) : null;
    if (method === "mobile" && !mobileMoneyConfigured) {
      next.phone = "Mobile money is not configured for this tenancy.";
    } else if (method === "mobile" && !local)
      next.phone = "Enter a Ugandan mobile number, for example 0772 123 456.";
    else if (method === "mobile" && !detected)
      next.phone = "This number is not an MTN or Airtel line.";
    else if (method === "mobile" && detected && detected !== network)
      next.phone = `This is an ${detected === "mtn" ? "MTN" : "Airtel"} number. Switch to ${networkLabel[detected]} or use another number.`;
    if (needsAgreement && !agreed)
      next.amount = "Paying more than 3 months ahead needs a written agreement with your landlord.";
    setErrors(next);
    if (Object.keys(next).length) return;
    if (method !== "mobile") {
      try {
        const checkoutMethod =
          method === "bank" ? "bank" : cardBrand === "Visa" ? "visa" : "mastercard";
        window.location.assign(createCheckout(invoiceId, checkoutMethod));
      } catch (error) {
        toast.error("Hosted checkout is unavailable", {
          description: error instanceof Error ? error.message : "Try another payment method.",
        });
      }
      return;
    }
    const paymentResult: PaymentResult = {
      amount,
      rentPeriod,
      monthsCovered: amountMode === "full" ? Number(monthsCovered) : 1,
      coverageAmounts,
      method: network === "mtn" ? "MTN Mobile Money" : "Airtel Money",
      phone: local ?? "",
      reference: makePaymentReference(),
      pending: false,
      unit,
      paidAt: new Date().toISOString(),
    };
    setResult(paymentResult);
    setStep("approve");
  }

  async function completePayment(payment: PaymentResult) {
    let outcome: PaymentResult;
    try {
      const providerResult = await mockPaymentProviders.mobile.process({
        amount: payment.amount,
        reference: payment.reference,
        method: "mobile",
        simulateFailure: simulateDecline,
      });
      outcome = {
        ...payment,
        pending: providerResult.status === "pending",
        failed: providerResult.status === "failed",
        providerToken: providerResult.token,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The payment provider could not be reached.";
      setStep("failed");
      toast.error("Payment could not be completed", { description: message });
      return;
    }

    setStep(outcome.failed ? "failed" : "success");
    try {
      const receiptNumber = onPaid(outcome);
      setResult({
        ...outcome,
        ...(receiptNumber ? { receiptNumber, unit, paidAt: new Date().toISOString() } : {}),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The payment record could not be saved locally.";
      setResult(outcome);
      toast.error("Payment succeeded, but its local record could not be saved", {
        description: message,
      });
    }
  }

  async function downloadReceipt(receiptNumber: string) {
    try {
      const bundle = getReceiptBundle(receiptNumber);
      if (!bundle) throw new Error("The receipt is not available in this browser.");
      const bytes = await buildReceiptPdf(bundle);
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${receiptNumber}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error("Receipt PDF could not be downloaded", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  }

  return (
    <div className="relative min-h-[26rem]">
      <AnimatePresence mode="wait" initial={false}>
        {step === "form" && (
          <motion.form
            key="form"
            onSubmit={(event) => void submit(event)}
            noValidate
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: ease.outExpo }}
            className="space-y-6"
          >
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {balance < rent ? "Remaining balance" : "Amount"}
              </p>
              <p className="figure mt-1 text-4xl font-bold">
                {amount ? formatUGX(amount) : "UGX 0"}
              </p>
              <div
                className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-muted p-1"
                role="radiogroup"
                aria-label="Amount"
              >
                {(["full", "other"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={amountMode === m}
                    onClick={() => setAmountMode(m)}
                    className="relative h-11 rounded-full text-sm font-semibold"
                  >
                    {amountMode === m && (
                      <motion.span
                        layoutId="amount-mode"
                        className="absolute inset-0 rounded-full bg-card shadow-soft"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{m === "full" ? "Full rent" : "Part payment"}</span>
                  </button>
                ))}
              </div>
              {amountMode === "full" && (
                <div className="mt-4">
                  <Label htmlFor="rent-months">Months of rent</Label>
                  <Select value={monthsCovered} onValueChange={setMonthsCovered}>
                    <SelectTrigger id="rent-months" className="mt-2 h-12 bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((months) => (
                        <SelectItem key={months} value={months}>
                          {months} {months === "1" ? "month" : "months"} ·{" "}
                          {formatRentPeriodRange(rentPeriod, Number(months))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {needsAgreement && (
                    <label className="mt-3 flex items-start gap-3 rounded-xl bg-warning-soft p-3 text-sm text-warning-ink">
                      <Checkbox
                        checked={agreed}
                        onCheckedChange={(v) => setAgreed(v === true)}
                        className="mt-0.5"
                      />
                      <span>
                        I have a written agreement with my landlord to pay more than 3 months ahead.
                      </span>
                    </label>
                  )}
                  {errors.amount && needsAgreement && (
                    <p className="mt-2 text-sm text-destructive">{errors.amount}</p>
                  )}
                </div>
              )}
              <AnimatePresence initial={false}>
                {amountMode === "other" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4">
                      <Label htmlFor="amount">Amount in UGX</Label>
                      <Input
                        id="amount"
                        inputMode="numeric"
                        placeholder="e.g. 600,000"
                        value={otherAmount}
                        onChange={(e) => {
                          const n = e.target.value.replace(/[^\d]/g, "");
                          setOtherAmount(n ? Number(n).toLocaleString("en-UG") : "");
                        }}
                        aria-invalid={!!errors.amount}
                        aria-describedby="amount-error"
                        className="figure mt-2"
                      />
                      <FieldError id="amount-error" message={errors.amount} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div
              role="tablist"
              aria-label="Payment options"
              className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
            >
              {(
                [
                  ["mobile", "Mobile money", Smartphone],
                  ["visa", "Card", CreditCard],
                  ["bank", "Bank transfer", Landmark],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`payment-tab-${id}`}
                  aria-selected={method === id}
                  aria-controls="payment-options-panel"
                  onClick={() => setMethod(id)}
                  className={cn(
                    "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.65rem] font-semibold leading-tight sm:flex-row sm:text-xs",
                    method === id
                      ? "bg-card text-primary-deep shadow-soft"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {method === "mobile" ? (
              <div
                id="payment-options-panel"
                role="tabpanel"
                aria-labelledby="payment-tab-mobile"
                className="min-w-0 space-y-4"
              >
                <div className="grid grid-cols-2 gap-2">
                  {(["mtn", "airtel"] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={n === "mtn" ? "MTN Mobile Money" : "Airtel Money"}
                      aria-pressed={network === n}
                      onClick={() => setNetwork(n)}
                      className={cn(
                        "press flex min-h-12 min-w-0 items-center justify-center rounded-xl border-2 p-2",
                        network === n
                          ? "border-primary bg-primary-soft shadow-sm"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <BrandLogo brand={n} className="h-8 w-14" />
                    </button>
                  ))}
                </div>
                <div className="min-w-0 rounded-xl border border-primary/15 bg-primary-soft/60 p-4 text-sm">
                  <p className="font-bold text-primary-deep">
                    Send rent to this account · {networkLabel[network]}
                  </p>
                  <dl className="mt-3 min-w-0 space-y-2">
                    <PaymentDetail
                      label="Registered name"
                      value={paymentDetails.mobileMoneyName ?? "Not provided"}
                    />
                    <PaymentDetail
                      label="Mobile money number"
                      value={paymentDetails.mobileMoneyNumber ?? "Not configured"}
                    />
                  </dl>
                </div>
                <div className="min-w-0">
                  <Label htmlFor="phone">Your mobile money number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      const d = detectNetwork(e.target.value);
                      if (d) setNetwork(d);
                    }}
                    aria-invalid={!!errors.phone}
                    aria-describedby="phone-error"
                    className="figure mt-2 min-w-0"
                  />
                  <FieldError id="phone-error" message={errors.phone} />
                </div>
                {!mobileMoneyConfigured && (
                  <p className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning-ink">
                    Mobile money details are not configured for this tenancy.
                  </p>
                )}
              </div>
            ) : method === "bank" ? (
              <div
                id="payment-options-panel"
                role="tabpanel"
                aria-labelledby="payment-tab-bank"
                className="rounded-xl border border-border bg-secondary/60 p-4 text-sm"
              >
                <p className="font-bold text-primary-deep">Bank transfer</p>
                <p className="mt-2 text-muted-foreground">
                  {checkoutConfigured
                    ? "Continue to the configured secure bank checkout. Propatiz will not collect banking credentials."
                    : "Coming soon — a bank checkout provider has not been configured."}
                </p>
                {!checkoutConfigured && (
                  <p className="mt-3 inline-flex items-center gap-2 font-semibold text-warning-ink">
                    <Clock3 className="size-4" aria-hidden />
                    Coming soon
                  </p>
                )}
              </div>
            ) : (
              <div
                id="payment-options-panel"
                role="tabpanel"
                aria-labelledby="payment-tab-visa"
                className="space-y-3 rounded-xl border border-border bg-secondary/60 p-4 text-sm"
              >
                <p className="text-muted-foreground">
                  Card details are entered only on the configured hosted checkout. Propatiz never
                  collects or stores card numbers.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["Visa", "Mastercard"] as const).map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      aria-label={`Pay with ${brand}`}
                      title={brand}
                      aria-pressed={cardBrand === brand}
                      onClick={() => setCardBrand(brand)}
                      className={cn(
                        "press flex min-h-16 min-w-0 items-center justify-center rounded-xl border-2 bg-card p-2 transition-colors hover:border-primary/40",
                        cardBrand === brand && "border-primary bg-primary-soft shadow-sm",
                      )}
                    >
                      <BrandLogo
                        brand={brand === "Visa" ? "visa" : "mastercard"}
                        className="h-9 w-14"
                      />
                    </button>
                  ))}
                </div>
                {!checkoutConfigured && (
                  <p className="inline-flex items-center gap-2 font-semibold text-warning-ink">
                    <Clock3 className="size-4" aria-hidden />
                    Coming soon — hosted card checkout is not configured.
                  </p>
                )}
              </div>
            )}

            {method === "mobile" && (
              <label className="flex items-center gap-3 rounded-sm border border-dashed border-input p-3 text-sm text-muted-foreground">
                <Checkbox
                  checked={simulateDecline}
                  onCheckedChange={(v) => setSimulateDecline(v === true)}
                />
                Demo only: simulate a declined payment
              </label>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={!checkoutConfigured}>
              {method !== "mobile"
                ? checkoutConfigured
                  ? "Continue to secure checkout"
                  : "Coming soon"
                : `Pay ${amount ? formatUGX(amount) : ""}`}
            </Button>
          </motion.form>
        )}

        {step === "approve" && result && (
          <Approve
            key="approve"
            phone={result.phone}
            method={result.method}
            onCancel={() => setStep("form")}
            onDone={() => void completePayment(result)}
          />
        )}

        {step === "success" && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center pt-4 text-center"
          >
            <AnimatedCheck />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4, ease: ease.outExpo }}
              className="w-full"
            >
              <h3 className="mt-5 text-xl font-bold">Payment received</h3>
              <p className="mt-1 text-muted-foreground">
                {result.pending
                  ? "Your payment is waiting for landlord confirmation."
                  : "Your landlord has been notified."}
              </p>
              <dl className="mt-6 divide-y divide-border rounded-lg border border-border text-left text-sm">
                {[
                  ["Unit", result.unit ?? unit],
                  ["Amount", formatUGX(result.amount)],
                  ["Method", result.method],
                  ["Reference", result.reference],
                  [
                    "Date",
                    new Intl.DateTimeFormat("en-UG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(result.paidAt ?? new Date())),
                  ],
                  ...(result.receiptNumber
                    ? [["Receipt", result.receiptNumber] as [string, string]]
                    : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="figure font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {result.receiptNumber ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 min-h-11 w-full"
                  onClick={() => void downloadReceipt(result.receiptNumber!)}
                >
                  <Receipt className="mr-2 size-4" aria-hidden />
                  Download branded receipt PDF
                </Button>
              ) : (
                <p className="mt-3 rounded-lg border border-warning/30 bg-warning-soft p-3 text-left text-sm text-warning-ink">
                  {result.pending
                    ? "A receipt will be available after the payment is confirmed."
                    : "Payment succeeded, but a receipt could not be prepared. Check payment history or try again."}
                </p>
              )}
              {!result.pending && (
                <div className="mt-5 rounded-xl border border-primary/15 bg-primary-soft/60 p-4 text-left">
                  <p className="font-bold text-primary-deep">Need a hand around your home?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Browse demo plumbers, cleaners, electricians, and more.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 min-h-11 w-full"
                    onClick={onOpenServices}
                  >
                    Services for your home
                  </Button>
                </div>
              )}
              <Button size="lg" className="mt-6 w-full" onClick={onClose}>
                Done
              </Button>
            </motion.div>
          </motion.div>
        )}

        {step === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center pt-4 text-center"
          >
            <AnimatedCheck tone="danger" />
            <h3 className="mt-5 text-xl font-bold">Payment not approved</h3>
            <p className="mt-1 max-w-xs text-muted-foreground">
              The prompt was declined or timed out. No money has left your account.
            </p>
            <Button size="lg" className="mt-8 w-full" onClick={() => setStep("form")}>
              Try again
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={onClose}>
              Pay later
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Approve({
  phone,
  method,
  onCancel,
  onDone,
}: {
  phone: string;
  method: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [left, setLeft] = useState(APPROVE_SECONDS);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const t = window.setInterval(() => setLeft((s) => s - 1), 1000);
    const finish = window.setTimeout(() => doneRef.current(), APPROVE_SECONDS * 1000);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(finish);
    };
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.3, ease: ease.outExpo }}
      className="flex flex-col items-center pt-6 text-center"
      aria-live="polite"
    >
      <div className="relative grid size-24 place-items-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-primary-soft"
          animate={{ scale: [1, 1.18, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <Smartphone className="relative size-10 text-primary" aria-hidden />
      </div>
      <h3 className="mt-6 text-xl font-bold">Check your phone</h3>
      <p className="mt-2 max-w-xs text-muted-foreground">
        {method === "Visa" || method === "Mastercard" ? (
          "This is a demo card authorization. No real card will be charged."
        ) : (
          <>
            Enter your PIN on the {method} prompt sent to{" "}
            <span className="figure font-semibold text-foreground">{phone}</span>.
          </>
        )}
      </p>
      <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full origin-left rounded-full bg-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: APPROVE_SECONDS, ease: "linear" }}
        />
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Waiting for approval{left > 0 ? ` (${left}s)` : ""}
      </p>
      <Button variant="ghost" className="mt-8" onClick={onCancel}>
        Cancel
      </Button>
    </motion.div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          id={id}
          role="alert"
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 text-sm font-medium text-destructive-ink"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function PaymentDetail({
  label,
  value,
  brand,
  breakAll = false,
}: {
  label: string;
  value?: string | undefined;
  brand?: PayBrand;
  breakAll?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="grid min-w-0 grid-cols-[7rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "figure min-w-0 text-right font-semibold",
          breakAll ? "break-all" : "break-words",
        )}
      >
        <span className="inline-flex max-w-full items-center justify-end gap-2">
          {brand && <BrandLogo brand={brand} className="h-7 w-10" />}
          <span className={cn("min-w-0", breakAll ? "break-all" : "break-words")}>{value}</span>
        </span>
      </dd>
    </div>
  );
}
