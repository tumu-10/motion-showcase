import { CreditCard, Landmark, Loader2, Smartphone } from "lucide-react";
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
import { bankOptions, getBankBrand, type BankBrand } from "@/lib/payment-banks";
import { cn } from "@/lib/utils";
import { mockPaymentProviders } from "@/lib/payment-provider";
import type { LucideIcon } from "lucide-react";
import type { TenantPaymentPreference } from "@/lib/demo-settings";

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
};
type PaymentMethod = TenantPaymentPreference;

const APPROVE_SECONDS = 4;

export function PayFlow({
  rent,
  balance,
  rentPeriod,
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
  defaultPhone: string;
  paymentDetails: LandlordPaymentDetails;
  preferredPaymentMethod: PaymentMethod;
  onPaid: (r: PaymentResult) => void;
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
  const [bankChoice, setBankChoice] = useState<BankBrand>(
    () => getBankBrand(paymentDetails.bankName) ?? "stanbic",
  );
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [bankProofDataUrl, setBankProofDataUrl] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState(defaultPhone);
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [errors, setErrors] = useState<{
    amount?: string | undefined;
    phone?: string | undefined;
    card?: string | undefined;
    proof?: string | undefined;
  }>({});
  const [agreed, setAgreed] = useState(false);
  const needsAgreement = amountMode === "full" && needsAdvanceAgreement(Number(monthsCovered));
  const [result, setResult] = useState<PaymentResult | null>(null);
  const receivingNetwork = paymentDetails.mobileMoneyNumber
    ? detectNetwork(paymentDetails.mobileMoneyNumber)
    : null;
  const landlordBankBrand = getBankBrand(paymentDetails.bankName);
  const bankChoiceName = bankOptions.find((bank) => bank.brand === bankChoice)?.name;

  const amount =
    amountMode === "full"
      ? balance + rent * (Number(monthsCovered) - 1)
      : Number(otherAmount.replace(/[^\d]/g, ""));
  const coverageAmounts =
    amountMode === "full"
      ? [balance, ...Array.from({ length: Number(monthsCovered) - 1 }, () => rent)]
      : [amount];
  const methods: [PaymentMethod, string, LucideIcon][] = [
    ...(paymentDetails.mobileMoneyEnabled
      ? [["mobile", "Mobile money", Smartphone] as [PaymentMethod, string, LucideIcon]]
      : []),
    ...(paymentDetails.bankEnabled
      ? [["bank", "Bank transfer", Landmark] as [PaymentMethod, string, LucideIcon]]
      : []),
    ["visa", "Visa", CreditCard],
  ];

  useEffect(() => {
    setMethod(preferredPaymentMethod);
  }, [preferredPaymentMethod]);

  useEffect(() => {
    if (method === "mobile" && !paymentDetails.mobileMoneyEnabled) {
      setMethod(paymentDetails.bankEnabled ? "bank" : "visa");
    } else if (method === "bank" && !paymentDetails.bankEnabled) {
      setMethod(paymentDetails.mobileMoneyEnabled ? "mobile" : "visa");
    }
  }, [method, paymentDetails.bankEnabled, paymentDetails.mobileMoneyEnabled]);

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
    if (method === "mobile" && !local)
      next.phone = "Enter a Ugandan mobile number, for example 0772 123 456.";
    else if (method === "mobile" && !detected)
      next.phone = "This number is not an MTN or Airtel line.";
    else if (method === "mobile" && detected && detected !== network)
      next.phone = `This is an ${detected === "mtn" ? "MTN" : "Airtel"} number. Switch to ${networkLabel[detected]} or use another number.`;
    if (needsAgreement && !agreed)
      next.amount = "Paying more than 3 months ahead needs a written agreement with your landlord.";
    if (method === "visa") {
      const digits = cardNumber.replace(/\D/g, "");
      if (
        digits.length < 12 ||
        digits.length > 19 ||
        !/^\d{2}\/\d{2}$/.test(cardExpiry) ||
        !/^\d{3,4}$/.test(cardCvc)
      ) {
        next.card = "Enter a valid demo card number, expiry (MM/YY), and security code.";
      }
    }
    if (method === "bank" && !bankProofDataUrl) {
      next.proof = "Upload your transfer receipt or screenshot to continue.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    const paymentResult: PaymentResult = {
      amount,
      rentPeriod,
      monthsCovered: amountMode === "full" ? Number(monthsCovered) : 1,
      coverageAmounts,
      method:
        method === "mobile"
          ? network === "mtn"
            ? "MTN Mobile Money"
            : "Airtel Money"
          : method === "bank"
            ? "Bank transfer"
            : cardBrand,
      phone: local ?? "",
      reference: makePaymentReference(),
      pending: method === "bank",
      bankProofDataUrl: method === "bank" ? bankProofDataUrl : undefined,
    };
    setResult(paymentResult);
    if (method === "bank") {
      setSubmitting(true);
      try {
        const providerResult = await mockPaymentProviders.bank.process({
          amount: paymentResult.amount,
          reference: paymentResult.reference,
          method: "bank",
        });
        const outcome = { ...paymentResult, pending: providerResult.status === "pending" };
        setResult(outcome);
        setStep("success");
        onPaid(outcome);
      } catch (error) {
        setErrors((current) => ({
          ...current,
          proof:
            error instanceof Error ? error.message : "Could not submit the bank transfer proof.",
        }));
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep("approve");
    }
  }

  async function completePayment(payment: PaymentResult) {
    try {
      const provider =
        method === "mobile" ? mockPaymentProviders.mobile : mockPaymentProviders.card;
      const providerResult = await provider.process({
        amount: payment.amount,
        reference: payment.reference,
        method: method === "mobile" ? "mobile" : "card",
        simulateFailure: simulateDecline,
      });
      const outcome: PaymentResult = {
        ...payment,
        pending: providerResult.status === "pending",
        failed: providerResult.status === "failed",
        providerToken: providerResult.token,
      };
      setResult(outcome);
      setStep(outcome.failed ? "failed" : "success");
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
      onPaid(outcome);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The payment provider could not be reached.";
      setStep("failed");
      setCardNumber("");
      setCardCvc("");
      setErrors((current) => ({
        ...current,
        card: message,
      }));
      toast.error("Payment could not be completed", { description: message });
    }
  }

  async function uploadBankProof(file: File | undefined) {
    setErrors((current) => ({ ...current, proof: undefined }));
    setBankProofDataUrl(undefined);
    if (!file) return;
    if (file.size > 1_500_000) {
      setErrors((current) => ({ ...current, proof: "Proof files must be smaller than 1.5 MB." }));
      return;
    }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setErrors((current) => ({ ...current, proof: "Upload a PDF, JPG, or PNG transfer proof." }));
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Could not read the selected transfer proof."));
        reader.onerror = () => reject(new Error("Could not read the selected transfer proof."));
        reader.readAsDataURL(file);
      });
      setBankProofDataUrl(dataUrl);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        proof: error instanceof Error ? error.message : "Could not read the selected file.",
      }));
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

            <fieldset>
              <legend className="text-sm font-medium text-muted-foreground">Payment method</legend>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {methods.map(([id, label]) => {
                  const brands: PayBrand[] =
                    id === "mobile"
                      ? ["mtn", "airtel"]
                      : id === "bank"
                        ? ["stanbic", "hfb", "centenary"]
                        : ["visa", "mastercard"];
                  const active = method === id;
                  const methodLabel = id === "visa" ? "Card" : label;
                  return (
                    <motion.button
                      key={id}
                      type="button"
                      aria-label={methodLabel}
                      aria-pressed={active}
                      onClick={() => setMethod(id)}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "relative flex min-h-16 min-w-0 items-center gap-3 rounded-xl border-2 py-2 pl-3 pr-10 text-left transition-colors",
                        active
                          ? "border-primary bg-primary-soft shadow-sm"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <span className="flex -space-x-2">
                        {brands.map((b) => (
                          <BrandLogo key={b} brand={b} className="h-7 w-9 ring-2 ring-card" />
                        ))}
                      </span>
                      <span className="min-w-0 text-sm font-bold">{methodLabel}</span>
                      <span
                        aria-hidden
                        className={cn(
                          "absolute right-3 top-1/2 size-4 -translate-y-1/2 rounded-full border-2 transition-all",
                          active
                            ? "border-primary bg-primary shadow-[inset_0_0_0_3px_var(--card)]"
                            : "border-input",
                        )}
                      />
                    </motion.button>
                  );
                })}
              </div>
              {method === "mobile" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["mtn", "airtel"] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={n === "mtn" ? "MTN Mobile Money" : "Airtel Money"}
                      aria-pressed={network === n}
                      onClick={() => setNetwork(n)}
                      className={cn(
                        "press flex min-h-16 min-w-0 items-center justify-center rounded-xl border-2 p-2",
                        network === n
                          ? "border-primary bg-primary-soft shadow-sm"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <BrandLogo brand={n} className="h-9 w-14" />
                    </button>
                  ))}
                </div>
              )}
            </fieldset>

            {method === "mobile" ? (
              <div className="min-w-0 space-y-4">
                <div className="min-w-0 rounded-xl border border-primary/15 bg-primary-soft/60 p-4 text-sm">
                  <p className="font-bold text-primary-deep">
                    Send rent to this account
                    {receivingNetwork ? ` · ${networkLabel[receivingNetwork]}` : ""}
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
              </div>
            ) : method === "bank" ? (
              <div className="min-w-0 rounded-xl border border-primary/15 bg-primary-soft/60 p-4 text-sm">
                <p className="font-bold text-primary-deep">Choose your bank</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {bankOptions.map(({ brand, name }) => (
                    <button
                      key={brand}
                      type="button"
                      aria-label={`Paying from ${name}`}
                      title={name}
                      aria-pressed={bankChoice === brand}
                      onClick={() => setBankChoice(brand)}
                      className={cn(
                        "press relative flex min-h-16 min-w-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-white transition-colors hover:border-primary/40 sm:min-h-20",
                        bankChoice === brand && "border-primary bg-primary-soft shadow-sm",
                      )}
                    >
                      <BrandLogo brand={brand} variant="fill" />
                    </button>
                  ))}
                </div>
                <p className="mt-4 font-bold text-primary-deep">Transfer to</p>
                <dl className="mt-2 min-w-0 space-y-2">
                  <PaymentDetail label="Paying from" value={bankChoiceName} brand={bankChoice} />
                  <PaymentDetail
                    label="Landlord bank"
                    value={paymentDetails.bankName}
                    {...(landlordBankBrand ? { brand: landlordBankBrand } : {})}
                  />
                  <PaymentDetail label="Account name" value={paymentDetails.bankAccountName} />
                  <PaymentDetail
                    label="Account number"
                    value={paymentDetails.bankAccountNumber}
                    breakAll
                  />
                </dl>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Transfers are recorded as pending until the landlord confirms receipt. Use the
                  reference shown after submitting.
                </p>
                <Label htmlFor="bank-proof" className="mt-4 block">
                  Transfer proof
                </Label>
                <Input
                  id="bank-proof"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="mt-2"
                  onChange={(event) => void uploadBankProof(event.target.files?.[0])}
                  aria-invalid={!!errors.proof}
                />
                <FieldError id="bank-proof-error" message={errors.proof} />
                {bankProofDataUrl && (
                  <p className="mt-2 text-xs font-medium text-success-ink">Proof attached</p>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-border bg-secondary/60 p-4 text-sm">
                <p className="text-muted-foreground">
                  Mock card authorization only. Card numbers are never sent to or stored by the app.
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
                <div>
                  <Label htmlFor="mock-card-number">Card number</Label>
                  <Input
                    id="mock-card-number"
                    inputMode="numeric"
                    autoComplete="off"
                    value={cardNumber}
                    placeholder="1234 5678 9012 3456"
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, "").slice(0, 19);
                      setCardNumber(digits.replace(/(.{4})/g, "$1 ").trim());
                      if (/^4/.test(digits)) setCardBrand("Visa");
                      else if (/^(5[1-5]|2[2-7])/.test(digits)) setCardBrand("Mastercard");
                    }}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="mock-card-expiry">Expiry (MM/YY)</Label>
                    <Input
                      id="mock-card-expiry"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(event) => setCardExpiry(event.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mock-card-cvc">Security code</Label>
                    <Input
                      id="mock-card-cvc"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cardCvc}
                      onChange={(event) =>
                        setCardCvc(event.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <FieldError id="card-error" message={errors.card} />
              </div>
            )}

            {method === "mobile" && paymentDetails.mobileMoneyNumber && (
              <div className="rounded-xl border border-success/20 bg-success-soft/60 p-4 text-sm">
                <p className="font-bold text-success-ink">Pay the landlord</p>
                <dl className="mt-2 space-y-2">
                  <PaymentDetail label="Registered name" value={paymentDetails.mobileMoneyName} />
                  <PaymentDetail
                    label="Mobile money number"
                    value={paymentDetails.mobileMoneyNumber}
                  />
                </dl>
              </div>
            )}

            {method !== "bank" && (
              <label className="flex items-center gap-3 rounded-sm border border-dashed border-input p-3 text-sm text-muted-foreground">
                <Checkbox
                  checked={simulateDecline}
                  onCheckedChange={(v) => setSimulateDecline(v === true)}
                />
                Demo only: simulate a declined payment
              </label>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Submitting…" : `Pay ${amount ? formatUGX(amount) : ""}`}
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
                  ? "Your bank transfer is waiting for landlord confirmation."
                  : "Your landlord has been notified."}
              </p>
              <dl className="mt-6 divide-y divide-border rounded-lg border border-border text-left text-sm">
                {[
                  ["Amount", formatUGX(result.amount)],
                  ["Paid with", result.method],
                  ...(result.phone ? [["Number", result.phone] as [string, string]] : []),
                  ["Receipt", result.reference],
                  ...(result.providerToken
                    ? [["Mock authorization token", result.providerToken] as [string, string]]
                    : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="figure font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
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
