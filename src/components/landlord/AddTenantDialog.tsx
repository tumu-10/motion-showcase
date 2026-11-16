import { ArrowLeft, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AnimatedCheck } from "@/components/shared/AnimatedCheck";
import { FieldError } from "@/components/tenant/PayFlow";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatUGX, normalizeUgPhone } from "@/lib/rent";
import { ease } from "@/lib/motion";
import type { Unit } from "@/lib/sample-data";

const steps = ["Tenant details", "Unit and rent", "Review"];

export type NewTenant = { name: string; phone: string; unitId: string; rent: number; startDate: string };

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
  const [unitId, setUnitId] = useState("");
  const [rent, setRent] = useState("");
  const [startDate, setStartDate] = useState("2026-12-01");
  const [errors, setErrors] = useState<{ name?: string | undefined; phone?: string | undefined; unit?: string | undefined; rent?: string | undefined; startDate?: string | undefined }>({});
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  // Reset only when the dialog opens, not when the unit list changes after saving.
  const wasOpen = useRef(false);
  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (justOpened) {
      setStep(0);
      setName("");
      setPhone("");
      setErrors({});
      setState("idle");
      const preset = vacantUnits.find((u) => u.id === presetUnitId) ?? vacantUnits[0];
      setUnitId(preset?.id ?? "");
      setRent(preset ? preset.rent.toLocaleString("en-UG") : "");
    }
  }, [open, presetUnitId, vacantUnits]);

  const unit = vacantUnits.find((u) => u.id === unitId);
  const rentNum = Number(rent.replace(/[^\d]/g, ""));

  function validate(s: number) {
    const e: typeof errors = {};
    if (s === 0) {
      if (name.trim().split(/\s+/).length < 2) e.name = "Enter the tenant's first and last name.";
      if (!normalizeUgPhone(phone)) e.phone = "Enter a Ugandan mobile number, for example 0772 123 456.";
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
      onCreate({ name: name.trim(), phone: normalizeUgPhone(phone)!, unitId, rent: rentNum, startDate });
    }, 900);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-lg bg-card p-0">
        <div className="border-b border-border p-6 pb-5">
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

        <div className="relative min-h-[19rem] overflow-hidden p-6">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            {state === "done" ? (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-4 text-center">
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
                      <Input id="t-name" className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Namubiru" aria-invalid={!!errors.name} aria-describedby="t-name-err" autoFocus />
                      <FieldError id="t-name-err" message={errors.name} />
                    </div>
                    <div>
                      <Label htmlFor="t-phone">Mobile number</Label>
                      <Input id="t-phone" type="tel" className="figure mt-2" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0772 123 456" aria-invalid={!!errors.phone} aria-describedby="t-phone-err" />
                      <FieldError id="t-phone-err" message={errors.phone} />
                      <p className="mt-2 text-xs text-muted-foreground">Used for rent reminders and mobile money payments.</p>
                    </div>
                  </>
                )}
                {step === 1 && (
                  <>
                    <div>
                      <Label htmlFor="t-unit">Unit</Label>
                      {vacantUnits.length === 0 ? (
                        <p className="mt-2 rounded-sm bg-muted p-3 text-sm text-muted-foreground">There are no vacant units right now.</p>
                      ) : (
                        <Select
                          value={unitId}
                          onValueChange={(v) => {
                            setUnitId(v);
                            const u = vacantUnits.find((x) => x.id === v);
                            if (u) setRent(u.rent.toLocaleString("en-UG"));
                          }}
                        >
                          <SelectTrigger id="t-unit" className="mt-2 h-12 bg-card" aria-invalid={!!errors.unit}>
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
                    <div className="grid grid-cols-2 gap-4">
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
                        <Input id="t-start" type="date" className="mt-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-invalid={!!errors.startDate} />
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
                      ["Unit", unit ? `${unit.unit}, ${unit.property}` : "-"],
                      ["Monthly rent", formatUGX(rentNum)],
                      ["Lease starts", new Date(startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
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
          <div className="flex items-center justify-between gap-3 border-t border-border bg-background p-4">
            <Button variant="ghost" onClick={back} disabled={step === 0 || state === "saving"} className={step === 0 ? "invisible" : ""}>
              <ArrowLeft /> Back
            </Button>
            {step < 2 ? (
              <Button onClick={next} disabled={step === 1 && vacantUnits.length === 0}>
                Continue
              </Button>
            ) : (
              <Button onClick={submit} disabled={state === "saving"}>
                {state === "saving" ? (<><Loader2 className="animate-spin" /> Adding tenant</>) : "Add tenant"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
