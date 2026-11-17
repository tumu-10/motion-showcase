import { ArrowLeft, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AnimatedCheck } from "@/components/shared/AnimatedCheck";
import { FieldError } from "@/components/tenant/PayFlow";
import { Button } from "@/components/ui/button";
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
import { formatUGX, normalizeUgPhone } from "@/lib/rent";
import { ease } from "@/lib/motion";
import type { Unit } from "@/lib/sample-data";

const steps = ["Tenant details", "Unit and rent", "Review"];

export type NewTenant = {
  name: string;
  phone: string;
  email: string;
  occupants: number;
  occupation: string;
  sex: string;
  unitId: string;
  rent: number;
  startDate: string;
};

export function AddTenantDialog({
  open,
  onOpenChange,
  vacantUnits,
  presetUnitId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vacantUnits: Unit[];
  presetUnitId?: string | undefined;
  onCreate: (t: NewTenant) => void;
}) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [occupants, setOccupants] = useState("1");
  const [occupation, setOccupation] = useState("");
  const [sex, setSex] = useState("");
  const [unitId, setUnitId] = useState("");
  const [rent, setRent] = useState("");
  const [startDate, setStartDate] = useState("2026-12-01");
  const [errors, setErrors] = useState<{
    name?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    occupants?: string | undefined;
    occupation?: string | undefined;
    sex?: string | undefined;
    unit?: string | undefined;
    rent?: string | undefined;
    startDate?: string | undefined;
  }>({});
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const formContentRef = useRef<HTMLDivElement>(null);

  // Reset only when the dialog opens, not when the unit list changes after saving.
  const wasOpen = useRef(false);
  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (justOpened) {
      setStep(0);
      setName("");
      setPhone("");
      setEmail("");
      setOccupants("1");
      setOccupation("");
      setSex("");
      setErrors({});
      setState("idle");
      const preset = vacantUnits.find((u) => u.id === presetUnitId) ?? vacantUnits[0];
      setUnitId(preset?.id ?? "");
      setRent(preset ? preset.rent.toLocaleString("en-UG") : "");
    }
  }, [open, presetUnitId, vacantUnits]);

  useEffect(() => {
    formContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const unit = vacantUnits.find((u) => u.id === unitId);
  const rentNum = Number(rent.replace(/[^\d]/g, ""));

  function validate(s: number) {
    const e: typeof errors = {};
    if (s === 0) {
      if (!name.trim()) e.name = "Enter the tenant's name.";
      if (!normalizeUgPhone(phone))
        e.phone = "Enter a Ugandan mobile number, for example 0772 123 456.";
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        e.email = "Enter a valid email address.";
      if (!Number.isInteger(Number(occupants)) || Number(occupants) < 1)
        e.occupants = "Enter at least one occupant.";
    }
    if (s === 1) {
      if (!unitId) e.unit = "Choose a vacant unit.";
      if (!rentNum || rentNum < 50_000) e.rent = "Monthly rent must be at least UGX 50,000.";
      if (!startDate) e.startDate = "Choose a start date.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => {
    if (!validate(step)) return;
    setDir(1);
    setStep((s) => s + 1);
  };
  const back = () => {
    setDir(-1);
    setStep((s) => s - 1);
  };
  const submit = () => {
    setState("saving");
    window.setTimeout(() => {
      setState("done");
      onCreate({
        name: name.trim(),
        phone: normalizeUgPhone(phone) ?? phone.trim(),
        email: email.trim(),
        occupants: Number(occupants),
        occupation: occupation.trim(),
        sex,
        unitId,
        rent: rentNum,
        startDate,
      });
    }, 900);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl bg-background p-0">
        <div className="shrink-0 border-b border-primary/10 bg-primary-soft px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <DialogTitle className="text-xl font-bold">Add a tenant</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            {state === "done" ? "All set." : `Step ${step + 1} of ${steps.length}: ${steps[step]}`}
          </DialogDescription>
          <div className="mt-4 grid grid-cols-3 gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <div key={s} className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full origin-left rounded-full bg-primary"
                  initial={false}
                  animate={{ scaleX: state === "done" || i <= step ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: ease.outExpo }}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          ref={formContentRef}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6"
        >
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            {state === "done" ? (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-4 text-center"
              >
                <AnimatedCheck />
                <h3 className="mt-5 text-lg font-bold">{name.split(" ")[0]} has been added</h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  We sent an SMS to {normalizeUgPhone(phone)} with a link to set up the tenant app.
                </p>
                <Button className="mt-6" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ x: d * 40, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d * -40, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: ease.outExpo }}
                className="space-y-5"
              >
                {step === 0 && (
                  <>
                    <div>
                      <Label htmlFor="t-name">Full name</Label>
                      <Input
                        id="t-name"
                        className="mt-2"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sarah Namubiru"
                        aria-invalid={!!errors.name}
                        aria-describedby="t-name-err"
                        autoFocus
                      />
                      <FieldError id="t-name-err" message={errors.name} />
                    </div>
                    <div>
                      <Label htmlFor="t-phone">Mobile number</Label>
                      <Input
                        id="t-phone"
                        type="tel"
                        className="figure mt-2"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0772 123 456"
                        aria-invalid={!!errors.phone}
                        aria-describedby="t-phone-err"
                      />
                      <FieldError id="t-phone-err" message={errors.phone} />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Used for rent reminders and mobile money payments.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="t-email">
                        Email address{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="t-email"
                        type="email"
                        autoComplete="email"
                        className="mt-2"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tenant@example.com"
                        aria-invalid={!!errors.email}
                        aria-describedby="t-email-err"
                      />
                      <FieldError id="t-email-err" message={errors.email} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="t-occupants">Number of occupants</Label>
                        <Input
                          id="t-occupants"
                          type="number"
                          min="1"
                          step="1"
                          className="mt-2"
                          value={occupants}
                          onChange={(e) => setOccupants(e.target.value)}
                          aria-invalid={!!errors.occupants}
                          aria-describedby="t-occupants-err"
                        />
                        <FieldError id="t-occupants-err" message={errors.occupants} />
                      </div>
                      <div>
                        <Label htmlFor="t-sex">
                          Sex <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Select value={sex} onValueChange={(value) => setSex(value)}>
                          <SelectTrigger
                            id="t-sex"
                            className="mt-2 h-12 bg-card"
                            aria-invalid={!!errors.sex}
                          >
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError id="t-sex-err" message={errors.sex} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="t-occupation">
                        Occupation{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="t-occupation"
                        className="mt-2"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="e.g. Accountant"
                        aria-invalid={!!errors.occupation}
                        aria-describedby="t-occupation-err"
                      />
                      <FieldError id="t-occupation-err" message={errors.occupation} />
                    </div>
                  </>
                )}
                {step === 1 && (
                  <>
                    <div>
                      <Label htmlFor="t-unit">Unit</Label>
                      {vacantUnits.length === 0 ? (
                        <p className="mt-2 rounded-sm bg-muted p-3 text-sm text-muted-foreground">
                          There are no vacant units right now.
                        </p>
                      ) : (
                        <Select
                          value={unitId}
                          onValueChange={(v) => {
                            setUnitId(v);
                            const u = vacantUnits.find((x) => x.id === v);
                            if (u) setRent(u.rent.toLocaleString("en-UG"));
                          }}
                        >
                          <SelectTrigger
                            id="t-unit"
                            className="mt-2 h-12 bg-card"
                            aria-invalid={!!errors.unit}
                          >
                            <SelectValue placeholder="Choose a unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {vacantUnits.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.unit}, {u.property}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FieldError id="t-unit-err" message={errors.unit} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="t-rent">Monthly rent (UGX)</Label>
                        <Input
                          id="t-rent"
                          inputMode="numeric"
                          className="figure mt-2"
                          value={rent}
                          onChange={(e) => {
                            const n = e.target.value.replace(/[^\d]/g, "");
                            setRent(n ? Number(n).toLocaleString("en-UG") : "");
                          }}
                          aria-invalid={!!errors.rent}
                          aria-describedby="t-rent-err"
                        />
                        <FieldError id="t-rent-err" message={errors.rent} />
                      </div>
                      <div>
                        <Label htmlFor="t-start">Lease starts</Label>
                        <Input
                          id="t-start"
                          type="date"
                          className="mt-2"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          aria-invalid={!!errors.startDate}
                        />
                        <FieldError id="t-start-err" message={errors.startDate} />
                      </div>
                    </div>
                  </>
                )}
                {step === 2 && (
                  <dl className="divide-y divide-border rounded-lg border border-border text-sm">
                    {[
                      ["Tenant", name],
                      ["Mobile", normalizeUgPhone(phone) ?? phone],
                      ["Email", email || "Not provided"],
                      ["Occupants", String(occupants)],
                      ["Occupation", occupation],
                      ["Sex", sex],
                      ["Unit", unit ? `${unit.unit}, ${unit.property}` : "-"],
                      ["Monthly rent", formatUGX(rentNum)],
                      [
                        "Lease starts",
                        new Date(startDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }),
                      ],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="figure text-right font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {state !== "done" && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background p-3 sm:p-4">
            <Button
              type="button"
              variant="ghost"
              onClick={back}
              disabled={step === 0 || state === "saving"}
              className={step === 0 ? "invisible" : ""}
            >
              <ArrowLeft /> Back
            </Button>
            {step < 2 ? (
              <Button
                type="button"
                onClick={next}
                disabled={step === 1 && vacantUnits.length === 0}
              >
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={submit} disabled={state === "saving"}>
                {state === "saving" ? (
                  <>
                    <Loader2 className="animate-spin" /> Adding tenant
                  </>
                ) : (
                  "Add tenant"
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
