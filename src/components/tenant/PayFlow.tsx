import { Loader2, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AnimatedCheck } from "@/components/shared/AnimatedCheck";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { detectNetwork, formatUGX, networkLabel, normalizeUgPhone, type MobileNetwork } from "@/lib/rent";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Step = "form" | "approve" | "success" | "failed";

export type PaymentResult = { amount: number; method: string; reference: string; phone: string };

const APPROVE_SECONDS = 4;

export function PayFlow({
  rent,
  defaultPhone,
  onPaid,
  onClose,
}: {
  rent: number;
  defaultPhone: string;
  onPaid: (r: PaymentResult) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [amountMode, setAmountMode] = useState<"full" | "other">("full");
  const [otherAmount, setOtherAmount] = useState("");
  const [network, setNetwork] = useState<MobileNetwork>(detectNetwork(defaultPhone) ?? "mtn");
  const [phone, setPhone] = useState(defaultPhone);
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; phone?: string }>({});
  const [result, setResult] = useState<PaymentResult | null>(null);

  const amount = amountMode === "full" ? rent : Number(otherAmount.replace(/[^\d]/g, ""));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (amountMode === "other") {
      if (!amount) next.amount = "Enter an amount.";
      else if (amount < 10_000) next.amount = "The minimum payment is UGX 10,000.";
      else if (amount > rent) next.amount = `You owe ${formatUGX(rent)}. Enter that amount or less.`;
    }
    const local = normalizeUgPhone(phone);
    const detected = detectNetwork(phone);
    if (!local) next.phone = "Enter a Ugandan mobile number, for example 0772 123 456.";
    else if (!detected) next.phone = "This number is not an MTN or Airtel line.";
    else if (detected !== network)
      next.phone = `This is an ${detected === "mtn" ? "MTN" : "Airtel"} number. Switch to ${networkLabel[detected]} or use another number.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    setResult({
      amount,
      method: networkLabel[network],
      phone: local!,
      reference: `PTZ-${Math.floor(49200 + Math.random() * 700)}`,
    });
    setStep("approve");
  }

  return (
    <div className="relative min-h-[26rem]">
      <AnimatePresence mode="wait" initial={false}>
        {step === "form" && (
          <motion.form
            key="form"
            onSubmit={submit}
            noValidate
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: ease.outExpo }}
            className="space-y-6"
          >
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="figure mt-1 text-4xl font-bold">{amount ? formatUGX(amount) : "UGX 0"}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-muted p-1" role="radiogroup" aria-label="Amount">
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
                      <motion.span layoutId="amount-mode" className="absolute inset-0 rounded-full bg-card shadow-soft" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                    )}
                    <span className="relative">{m === "full" ? "Full rent" : "Part payment"}</span>
                  </button>
                ))}
              </div>
              <AnimatePresence initial={false}>
                {amountMode === "other" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
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
              <legend className="text-sm font-medium text-muted-foreground">Pay with</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["mtn", "airtel"] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={network === n}
                    onClick={() => setNetwork(n)}
                    className={cn(
                      "press flex min-h-16 flex-col items-start justify-center rounded-lg border-2 px-4 text-left",
                      network === n ? "border-primary bg-primary-soft" : "border-border bg-card",
                    )}
                  >
                    <span className="text-sm font-bold">{n === "mtn" ? "MTN MoMo" : "Airtel Money"}</span>
                    <span className="text-xs text-muted-foreground">{n === "mtn" ? "076, 077, 078" : "070, 074, 075"}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="phone">Mobile money number</Label>
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
                className="figure mt-2"
              />
              <FieldError id="phone-error" message={errors.phone} />
            </div>

            <label className="flex items-center gap-3 rounded-sm border border-dashed border-input p-3 text-sm text-muted-foreground">
              <Checkbox checked={simulateDecline} onCheckedChange={(v) => setSimulateDecline(v === true)} />
              Demo only: simulate a declined payment
            </label>

            <Button type="submit" size="lg" className="w-full">
              Pay {amount ? formatUGX(amount) : ""}
            </Button>
          </motion.form>
        )}

        {step === "approve" && result && (
          <Approve
            key="approve"
            phone={result.phone}
            method={result.method}
            onCancel={() => setStep("form")}
            onDone={() => {
              if (simulateDecline) setStep("failed");
              else {
                setStep("success");
                onPaid(result);
              }
            }}
          />
        )}

        {step === "success" && result && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center pt-4 text-center">
            <AnimatedCheck />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4, ease: ease.outExpo }} className="w-full">
              <h3 className="mt-5 text-xl font-bold">Payment received</h3>
              <p className="mt-1 text-muted-foreground">Your landlord has been notified.</p>
              <dl className="mt-6 divide-y divide-border rounded-lg border border-border text-left text-sm">
                {[
                  ["Amount", formatUGX(result.amount)],
                  ["Paid with", result.method],
                  ["Number", result.phone],
                  ["Receipt", result.reference],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="figure font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <Button size="lg" className="mt-6 w-full" onClick={onClose}>
                Done
              </Button>
            </motion.div>
          </motion.div>
        )}

        {step === "failed" && (
          <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center pt-4 text-center">
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

function Approve({ phone, method, onCancel, onDone }: { phone: string; method: string; onCancel: () => void; onDone: () => void }) {
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
        Enter your PIN on the {method} prompt sent to <span className="figure font-semibold text-foreground">{phone}</span>.
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

export function FieldError({ id, message }: { id: string; message?: string }) {
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
