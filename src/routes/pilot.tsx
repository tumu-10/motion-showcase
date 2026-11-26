import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { PublicSiteLayout } from "@/components/site/PublicSiteLayout";
import { buttonVariants } from "@/components/ui/button";
import {
  normalizeWaitlistPhone,
  submitWaitlist,
  type RentCollectionMethod,
  type WaitlistRole,
} from "@/lib/waitlist";

type FormValues = {
  fullName: string;
  phone: string;
  role: WaitlistRole | "";
  units: string;
  area: string;
  collectionMethod: RentCollectionMethod | "";
  whatsappConsent: boolean;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;
type FormStatus =
  | { kind: "idle" | "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const initialValues: FormValues = {
  fullName: "",
  phone: "",
  role: "",
  units: "",
  area: "",
  collectionMethod: "",
  whatsappConsent: false,
};

export const Route = createFileRoute("/pilot")({
  head: () => ({
    meta: [
      { title: "Join the Propatiz pilot" },
      {
        name: "description",
        content: "Join the Propatiz pilot for rent management in Uganda.",
      },
    ],
  }),
  component: PilotPage,
});

function PilotPage() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });
  const [website, setWebsite] = useState("");

  function updateValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setStatus((current) => (current.kind === "submitting" ? current : { kind: "idle" }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "submitting") return;

    if (website.trim()) {
      setStatus({ kind: "success", message: "Thanks for your interest." });
      return;
    }

    const phone = normalizeWaitlistPhone(values.phone);
    const managerRole = values.role === "landlord" || values.role === "property-manager";
    const units = values.units.trim() ? Number(values.units) : null;
    const nextErrors: FormErrors = {};

    if (!values.fullName.trim()) nextErrors.fullName = "Enter your full name.";
    if (!phone)
      nextErrors.phone = "Enter a Ugandan mobile number in +256 format, e.g. +256 774 123 456.";
    if (!values.role) nextErrors.role = "Choose the role that best describes you.";
    if (managerRole && (!Number.isInteger(units) || units === null || units < 1)) {
      nextErrors.units = "Enter a whole number of units (at least 1).";
    }
    if (!values.area.trim()) nextErrors.area = "Enter your area or town.";
    if (!values.collectionMethod)
      nextErrors.collectionMethod = "Choose how you collect rent today.";
    if (!values.whatsappConsent) {
      nextErrors.whatsappConsent = "Please agree to be contacted by WhatsApp.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus({ kind: "idle" });
      const firstError = Object.keys(nextErrors)[0];
      if (firstError) document.getElementById(firstError)?.focus();
      return;
    }

    const role = values.role;
    const collectionMethod = values.collectionMethod;
    if (!phone || !role || !collectionMethod) {
      setErrors({
        ...nextErrors,
        ...(!phone ? { phone: "Enter a valid Ugandan mobile number." } : {}),
        ...(!role ? { role: "Choose your role." } : {}),
        ...(!collectionMethod ? { collectionMethod: "Choose a rent collection method." } : {}),
      });
      return;
    }

    setErrors({});
    setStatus({ kind: "submitting" });
    try {
      const destination = await submitWaitlist({
        fullName: values.fullName.trim(),
        phone,
        role,
        units: managerRole ? units : null,
        area: values.area.trim(),
        collectionMethod,
        whatsappConsent: true,
      });
      setStatus({
        kind: "success",
        message:
          destination === "local"
            ? "Thanks! Your request is saved only in this browser for now."
            : "Thanks! Your request has been sent to the Propatiz pilot team.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Your request could not be submitted. Please try again.",
      });
    }
  }

  return (
    <PublicSiteLayout>
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <Reveal>
          <p className="text-eyebrow text-primary">Propatiz pilot</p>
          <h1 className="mt-3 text-display text-primary-deep">
            Help shape rent management in Uganda.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Tell us a little about your rental setup. We’ll use your details to understand who the
            pilot can serve.
          </p>
        </Reveal>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-8"
        >
          <div
            aria-hidden="true"
            className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor="website">Leave this field empty</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          {status.kind === "success" && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-900"
            >
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p>{status.message}</p>
            </div>
          )}
          {status.kind === "error" && (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800">
              {status.message}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="fullName" label="Full name" error={errors.fullName}>
              <input
                id="fullName"
                name="fullName"
                required
                autoComplete="name"
                value={values.fullName}
                onChange={(event) => updateValue("fullName", event.target.value)}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                className={inputClassName}
              />
            </FormField>
            <FormField id="phone" label="Phone number" error={errors.phone}>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                placeholder="+256 774 123 456"
                value={values.phone}
                onChange={(event) => updateValue("phone", event.target.value)}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                className={inputClassName}
              />
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="role" label="Your role" error={errors.role}>
              <select
                id="role"
                name="role"
                required
                value={values.role}
                onChange={(event) => {
                  const role = event.target.value as WaitlistRole | "";
                  updateValue("role", role);
                  if (role !== "landlord" && role !== "property-manager") {
                    updateValue("units", "");
                  }
                }}
                aria-invalid={Boolean(errors.role)}
                aria-describedby={errors.role ? "role-error" : undefined}
                className={inputClassName}
              >
                <option value="">Select a role</option>
                <option value="landlord">Landlord</option>
                <option value="property-manager">Property manager</option>
                <option value="tenant">Tenant</option>
                <option value="agent">Agent</option>
              </select>
            </FormField>
            <FormField id="area" label="Area or town" error={errors.area}>
              <input
                id="area"
                name="area"
                required
                autoComplete="address-level2"
                placeholder="e.g. Ntinda, Kampala"
                value={values.area}
                onChange={(event) => updateValue("area", event.target.value)}
                aria-invalid={Boolean(errors.area)}
                aria-describedby={errors.area ? "area-error" : undefined}
                className={inputClassName}
              />
            </FormField>
          </div>

          {(values.role === "landlord" || values.role === "property-manager") && (
            <FormField id="units" label="Number of units" error={errors.units}>
              <input
                id="units"
                name="units"
                type="number"
                required
                inputMode="numeric"
                min="1"
                step="1"
                value={values.units}
                onChange={(event) => updateValue("units", event.target.value)}
                aria-invalid={Boolean(errors.units)}
                aria-describedby={errors.units ? "units-error" : undefined}
                className={inputClassName}
              />
            </FormField>
          )}

          <FormField
            id="collectionMethod"
            label="How do you collect rent today?"
            error={errors.collectionMethod}
          >
            <select
              id="collectionMethod"
              name="collectionMethod"
              required
              value={values.collectionMethod}
              onChange={(event) =>
                updateValue("collectionMethod", event.target.value as RentCollectionMethod | "")
              }
              aria-invalid={Boolean(errors.collectionMethod)}
              aria-describedby={errors.collectionMethod ? "collectionMethod-error" : undefined}
              className={inputClassName}
            >
              <option value="">Select a method</option>
              <option value="cash">Cash</option>
              <option value="mobile-money">Mobile money</option>
              <option value="bank">Bank</option>
              <option value="mixed">A mix of methods</option>
            </select>
          </FormField>

          <div>
            <label
              htmlFor="whatsappConsent"
              className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed"
            >
              <input
                id="whatsappConsent"
                name="whatsappConsent"
                type="checkbox"
                required
                checked={values.whatsappConsent}
                onChange={(event) => updateValue("whatsappConsent", event.target.checked)}
                aria-invalid={Boolean(errors.whatsappConsent)}
                aria-describedby={errors.whatsappConsent ? "whatsappConsent-error" : undefined}
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <span>I agree to be contacted about the pilot by WhatsApp.</span>
            </label>
            {errors.whatsappConsent && (
              <p id="whatsappConsent-error" className="mt-1 text-sm font-medium text-red-700">
                {errors.whatsappConsent}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={status.kind === "submitting"}
            className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}
          >
            {status.kind === "submitting" ? "Sending request…" : "Join the pilot"}
            <ArrowRight aria-hidden="true" />
          </button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your details are used to respond to this pilot request. If no waitlist endpoint is
            configured, this demo saves the request in this browser only; it is not sent to
            Propatiz.
          </p>
        </form>
      </section>
    </PublicSiteLayout>
  );
}

const inputClassName =
  "min-h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
