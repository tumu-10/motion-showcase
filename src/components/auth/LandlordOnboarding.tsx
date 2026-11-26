import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileUp,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthServiceError,
  authService,
  normalizeAuthPhone,
  type LandlordOnboarding as OnboardingData,
} from "@/lib/auth/auth-service";
import { authErrorText, authStrings } from "@/lib/auth/strings";
import { cn } from "@/lib/utils";

const steps = [
  authStrings.onboarding.name,
  authStrings.onboarding.property,
  authStrings.onboarding.documents,
  authStrings.onboarding.payout,
  authStrings.onboarding.reviewTitle,
];

export function LandlordOnboardingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<OnboardingData>(() => authService.getOnboarding());
  const [idFile, setIdFile] = useState<File | null>(
    () => authService.getOnboardingFiles().idFile,
  );
  const [proofFile, setProofFile] = useState<File | null>(
    () => authService.getOnboardingFiles().proofFile,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    const updated = { ...form, [key]: value };
    setForm(updated);
    authService.saveOnboarding({ [key]: value });
  }

  function setFile(
    event: ChangeEvent<HTMLInputElement>,
    field: "idFile" | "proofFile",
  ) {
    const selected = event.target.files?.[0] ?? null;
    if (field === "idFile") {
      setIdFile(selected);
      authService.saveOnboardingFiles({ idFile: selected });
      update("idFileName", selected?.name ?? "");
    } else {
      setProofFile(selected);
      authService.saveOnboardingFiles({ proofFile: selected });
      update("proofFileName", selected?.name ?? "");
    }
  }

  function validateStep() {
    if (form.currentStep === 1 && (!form.name.trim() || !form.role)) {
      return authStrings.onboarding.required;
    }
    if (
      form.currentStep === 2 &&
      (!form.propertyName.trim() || !/^[1-9]\d*$/.test(form.unitCount))
    ) {
      return authStrings.onboarding.invalidUnits;
    }
    if (
      form.currentStep === 3 &&
      (!form.idFileName || !form.proofFileName || !idFile || !proofFile)
    ) {
      return authStrings.onboarding.fileMissing;
    }
    if (form.currentStep === 4) {
      if (!form.payoutName.trim() || !form.payoutMethod) return authStrings.onboarding.required;
      if (form.payoutMethod === "mobile-money" && !normalizeAuthPhone(form.payoutPhone)) {
        return authStrings.onboarding.invalidPayoutPhone;
      }
      if (
        form.payoutMethod === "bank" &&
        (!form.bankName.trim() || !form.bankAccountNumber.trim())
      ) {
        return authStrings.onboarding.required;
      }
    }
    return "";
  }

  async function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issue = validateStep();
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    setBusy(true);
    try {
      if (form.currentStep === 4) {
        authService.saveOnboarding({ currentStep: 5 });
        authService.finishOnboarding();
        setForm(authService.getOnboarding());
      } else {
        const updated = authService.saveOnboarding({
          currentStep: form.currentStep + 1,
        });
        setForm(updated);
        if (updated.currentStep === 5) authService.finishOnboarding();
      }
    } catch (reason) {
      setError(
        reason instanceof AuthServiceError
          ? authErrorText(reason.code)
          : authStrings.errors.generic,
      );
    } finally {
      setBusy(false);
    }
  }

  function previous() {
    if (form.currentStep > 1) {
      const updated = authService.saveOnboarding({ currentStep: form.currentStep - 1 });
      setForm(updated);
      setError("");
    }
  }

  return (
    <AuthPanel
      title={authStrings.onboarding.title}
      description={authStrings.onboarding.description}
      backTo="/landlord"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-primary">
            {authStrings.onboarding.step
              .replace("{current}", String(form.currentStep))
              .replace("{total}", String(steps.length))}
          </p>
          <span className="text-xs text-muted-foreground">{steps[form.currentStep - 1]}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${(form.currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {form.currentStep === 5 ? (
        <div className="space-y-5">
          <div className="rounded-2xl bg-success-soft p-5">
            <ShieldCheck className="size-8 text-success" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-bold text-primary-deep">
              {authStrings.onboarding.reviewTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {authStrings.onboarding.reviewDescription}
            </p>
          </div>
          <OnboardingChecklist data={form} />
          <Button className="h-14 w-full" asChild>
            <Link to="/landlord">
              {authStrings.onboarding.dashboardLink}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={next}>
          {form.currentStep === 1 && (
            <>
              <Field label={authStrings.onboarding.name} htmlFor="landlord-name">
                <Input
                  id="landlord-name"
                  autoComplete="name"
                  placeholder={authStrings.onboarding.namePlaceholder}
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  className="h-14"
                  required
                />
              </Field>
              <Field label={authStrings.onboarding.role} htmlFor="landlord-role">
                <select
                  id="landlord-role"
                  value={form.role}
                  onChange={(event) => update("role", event.target.value as OnboardingData["role"])}
                  className="h-14 w-full rounded-md border border-input bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                  required
                >
                  <option value="" disabled>
                    {authStrings.onboarding.role}
                  </option>
                  <option value="owner">{authStrings.onboarding.owner}</option>
                  <option value="manager">{authStrings.onboarding.manager}</option>
                </select>
              </Field>
            </>
          )}

          {form.currentStep === 2 && (
            <>
              <Field label={authStrings.onboarding.propertyName} htmlFor="property-name">
                <Input
                  id="property-name"
                  placeholder={authStrings.onboarding.propertyPlaceholder}
                  value={form.propertyName}
                  onChange={(event) => update("propertyName", event.target.value)}
                  className="h-14"
                  required
                />
              </Field>
              <Field label={authStrings.onboarding.unitCount} htmlFor="unit-count">
                <Input
                  id="unit-count"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={form.unitCount}
                  onChange={(event) => update("unitCount", event.target.value)}
                  className="h-14"
                  required
                />
              </Field>
            </>
          )}

          {form.currentStep === 3 && (
            <div className="space-y-4">
              <FileField
                id="id-document"
                label={authStrings.onboarding.idUpload}
                file={idFile}
                onChange={(event) => setFile(event, "idFile")}
              />
              <FileField
                id="right-to-let"
                label={authStrings.onboarding.proofUpload}
                file={proofFile}
                onChange={(event) => setFile(event, "proofFile")}
              />
              <p className="text-sm text-muted-foreground">{authStrings.onboarding.uploadHint}</p>
            </div>
          )}

          {form.currentStep === 4 && (
            <>
              <Field label={authStrings.onboarding.payoutName} htmlFor="payout-name">
                <Input
                  id="payout-name"
                  value={form.payoutName}
                  onChange={(event) => update("payoutName", event.target.value)}
                  className="h-14"
                  autoComplete="name"
                  required
                />
              </Field>
              <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning-ink">
                {authStrings.onboarding.nameMatch}
              </p>
              <Field label={authStrings.onboarding.payoutMethod} htmlFor="payout-method">
                <select
                  id="payout-method"
                  value={form.payoutMethod}
                  onChange={(event) =>
                    update("payoutMethod", event.target.value as OnboardingData["payoutMethod"])
                  }
                  className="h-14 w-full rounded-md border border-input bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                  required
                >
                  <option value="" disabled>
                    {authStrings.onboarding.payoutMethod}
                  </option>
                  <option value="mobile-money">{authStrings.onboarding.mobileMoney}</option>
                  <option value="bank">{authStrings.onboarding.bank}</option>
                </select>
              </Field>
              {form.payoutMethod === "mobile-money" && (
                <Field label={authStrings.onboarding.payoutPhone} htmlFor="payout-phone">
                  <Input
                    id="payout-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder={authStrings.phone.placeholder}
                    value={form.payoutPhone}
                    onChange={(event) => update("payoutPhone", event.target.value)}
                    className="h-14"
                    required
                  />
                </Field>
              )}
              {form.payoutMethod === "bank" && (
                <>
                  <Field label={authStrings.onboarding.bankName} htmlFor="bank-name">
                    <Input
                      id="bank-name"
                      value={form.bankName}
                      onChange={(event) => update("bankName", event.target.value)}
                      className="h-14"
                      required
                    />
                  </Field>
                  <Field
                    label={authStrings.onboarding.bankAccountNumber}
                    htmlFor="bank-account-number"
                  >
                    <Input
                      id="bank-account-number"
                      inputMode="numeric"
                      value={form.bankAccountNumber}
                      onChange={(event) => update("bankAccountNumber", event.target.value)}
                      className="h-14"
                      required
                    />
                  </Field>
                </>
              )}
            </>
          )}

          {error && <ErrorBanner>{error}</ErrorBanner>}
          <div className="flex gap-3 pt-2">
            {form.currentStep > 1 && (
              <Button
                className="h-14 flex-1"
                type="button"
                variant="outline"
                onClick={previous}
              >
                <ArrowLeft aria-hidden="true" />
                {authStrings.onboarding.previous}
              </Button>
            )}
            <Button className="h-14 flex-1" type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              {busy ? authStrings.onboarding.saving : authStrings.onboarding.next}
              {!busy && <ArrowRight aria-hidden="true" />}
            </Button>
          </div>
        </form>
      )}
    </AuthPanel>
  );
}

export function LandlordReviewDashboard() {
  const navigate = useNavigate();
  const session = authService.getSession();
  const data = authService.getOnboarding();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary px-4 py-8">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-background p-5 shadow-card sm:p-8">
        <Logo />
        <div className="mt-8 rounded-2xl bg-warning-soft p-5">
          <ShieldCheck className="size-8 text-warning-ink" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-bold text-primary-deep">
            {authStrings.onboarding.limitedTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {authStrings.onboarding.limitedDescription}
          </p>
        </div>
        <div className="mt-6">
          <OnboardingChecklist data={data} />
        </div>
        <div className="mt-6 grid gap-3">
          {session?.landlordStatus !== "under_review" && (
            <Button className="h-14 w-full" onClick={() => navigate({ to: "/onboarding/landlord" })}>
              {authStrings.onboarding.continueSetup}
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
          <Button variant="outline" className="h-14 w-full" asChild>
            <Link to="/account/settings">{authStrings.settings.title}</Link>
          </Button>
          <Button
            variant="ghost"
            className="h-12 w-full"
            onClick={async () => {
              await authService.logout();
              await navigate({ to: "/login", search: { mode: "login", expired: false } });
            }}
          >
            {authStrings.settings.logout}
          </Button>
        </div>
      </section>
    </main>
  );
}

function OnboardingChecklist({ data }: { data: OnboardingData }) {
  const payoutComplete =
    !!data.payoutName &&
    (data.payoutMethod === "mobile-money"
      ? !!normalizeAuthPhone(data.payoutPhone)
      : data.payoutMethod === "bank" && !!data.bankName && !!data.bankAccountNumber);
  const items: { label: string; done: boolean; pending?: boolean }[] = [
    { label: authStrings.onboarding.propertyChecklist, done: !!data.propertyName && !!data.unitCount },
    {
      label: authStrings.onboarding.documentsChecklist,
      done: !!data.idFileName && !!data.proofFileName,
    },
    { label: authStrings.onboarding.payoutChecklist, done: payoutComplete },
    {
      label: authStrings.onboarding.reviewChecklist,
      done: false,
      pending: data.status === "under_review",
    },
  ];
  return (
    <div className="rounded-2xl border border-border p-4">
      <h2 className="font-semibold text-primary-deep">{authStrings.onboarding.checklist}</h2>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3 text-sm">
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                item.done
                  ? "bg-success text-white"
                  : item.pending
                    ? "bg-warning-soft text-warning-ink"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {item.done ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <Clock3 className="size-3.5" aria-hidden="true" />
              )}
            </span>
            <span className="flex-1">{item.label}</span>
            <span className="text-xs text-muted-foreground">
              {item.done
                ? authStrings.onboarding.complete
                : item.pending
                  ? authStrings.onboarding.reviewPending
                  : authStrings.onboarding.inProgress}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FileField({
  id,
  label,
  file,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input bg-card px-4 py-3 text-sm font-medium hover:bg-secondary"
      >
        <FileUp className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">
          {file?.name ?? authStrings.onboarding.uploadHint}
        </span>
      </label>
      <Input
        id={id}
        type="file"
        accept="image/*,.pdf"
        className="sr-only"
        onChange={onChange}
      />
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
      {children}
    </p>
  );
}

function AuthPanel({
  title,
  description,
  backTo,
  children,
}: {
  title: string;
  description: string;
  backTo: "/landlord";
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary px-4 py-8">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-background p-5 shadow-card sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <Link
            to={backTo}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {authStrings.phone.back}
          </Link>
        </div>
        <h1 className="mt-7 text-2xl font-bold tracking-tight text-primary-deep">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}
