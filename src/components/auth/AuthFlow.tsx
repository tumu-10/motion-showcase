import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { authDemoCode, authService, AuthServiceError, normalizeAuthPhone } from "@/lib/auth/auth-service";
import { authErrorText, authStrings } from "@/lib/auth/strings";
import type { AuthRole } from "@/lib/auth/auth-service";
import { cn } from "@/lib/utils";

type AuthFlowMode = "welcome" | "login" | "landlord-signup" | "join-entry" | "tenant-invite";
type FlowStep = "welcome" | "join-code" | "phone" | "code" | "pin" | "create-pin";

export function AuthFlow({
  mode,
  inviteCode,
  sessionExpired = false,
}: {
  mode: AuthFlowMode;
  inviteCode?: string;
  sessionExpired?: boolean;
}) {
  const navigate = useNavigate();
  const [flowMode, setFlowMode] = useState(mode);
  const [step, setStep] = useState<FlowStep>(
    mode === "welcome" ? "welcome" : mode === "join-entry" ? "join-code" : "phone",
  );
  const [roleIntent, setRoleIntent] = useState<AuthRole | null>(
    mode === "landlord-signup" ? "landlord" : mode === "tenant-invite" ? "tenant" : null,
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteInput, setInviteInput] = useState(inviteCode ?? "");
  const [invite, setInvite] = useState(() =>
    mode === "tenant-invite" && inviteCode ? authService.getInvite(inviteCode) : null,
  );
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState(() =>
    sessionExpired ? authStrings.errors.sessionExpired : "",
  );
  const [noAccount, setNoAccount] = useState(false);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [codeActive, setCodeActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const screenTitle = useMemo(() => {
    if (step === "welcome") return authStrings.welcome.title;
    if (step === "join-code") return authStrings.join.title;
    if (step === "phone") return invite ? authStrings.join.phoneTitle : authStrings.phone.title;
    if (step === "code") return authStrings.code.title;
    if (step === "pin") return authStrings.pin.title;
    return authStrings.pin.createTitle;
  }, [invite, step]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    setFlowMode(mode);
    setStep(mode === "welcome" ? "welcome" : mode === "join-entry" ? "join-code" : "phone");
    setRoleIntent(
      mode === "landlord-signup" ? "landlord" : mode === "tenant-invite" ? "tenant" : null,
    );
  }, [mode]);

  useEffect(() => {
    if (mode === "tenant-invite" && inviteCode) {
      setInvite(authService.getInvite(inviteCode));
    }
  }, [inviteCode, mode]);

  function showError(reason: unknown) {
    setError(
      reason instanceof AuthServiceError
        ? authErrorText(reason.code)
        : authStrings.errors.generic,
    );
  }

  function roleHome(role: AuthRole) {
    if (role === "admin") return "/admin/verify";
    if (role === "landlord") {
      const current = authService.getSession();
      return current?.landlordStatus === "in_progress" ? "/onboarding/landlord" : "/landlord";
    }
    return "/tenant";
  }

  async function completeSignIn(nextPhone: string, value: string) {
    const session = await authService.loginWithPin(nextPhone, value);
    await navigate({ to: roleHome(session.role) });
  }

  async function continueWithPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalized = normalizeAuthPhone(phoneInput);
    if (!normalized) {
      setError(authStrings.errors.invalidPhone);
      return;
    }
    setPhone(normalized);
    if (authService.hasAccount(normalized) && flowMode !== "tenant-invite") {
      setStep("pin");
      return;
    }
    if (codeActive && normalized === phone) {
      setStep("code");
      return;
    }
    if (flowMode === "login" && roleIntent !== "landlord") {
      setNoAccount(true);
      return;
    }
    if (flowMode === "tenant-invite" && !invite) {
      setError(authStrings.join.invalid);
      return;
    }
    if (
      flowMode === "landlord-signup" ||
      flowMode === "tenant-invite" ||
      (flowMode === "login" && roleIntent === "landlord")
    ) {
      await requestSignupCode(normalized, roleIntent ?? "landlord");
    }
  }

  async function requestSignupCode(normalizedPhone: string, role: AuthRole) {
    setBusy(true);
    setError("");
    try {
      await authService.prepareSignup(normalizedPhone, role, invite?.code);
      await authService.requestCode(normalizedPhone);
      setRoleIntent(role);
      setCode("");
      setResendSeconds(30);
      setCodeActive(true);
      setNoAccount(false);
      setStep("code");
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function continueFromUnknownPhone(role: AuthRole) {
    if (role === "tenant") {
      await navigate({ to: "/join" });
      return;
    }
    await requestSignupCode(phone, role);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authService.verifyCode(phone, code);
      setCodeActive(false);
      if (isResettingPin) setStep("create-pin");
      else if (result.returningUser) setStep("pin");
      else setStep("create-pin");
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError("");
    setBusy(true);
    try {
      if (isResettingPin) await authService.resetPin(phone);
      else await authService.requestCode(phone);
      setCode("");
      setResendSeconds(30);
      setCodeActive(true);
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function createPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (pin !== confirmPin) {
      setError(authStrings.pin.mismatch);
      return;
    }
    setBusy(true);
    try {
      const session = await authService.setPin(pin);
      setIsResettingPin(false);
      await navigate({ to: roleHome(session.role) });
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function forgotPin() {
    setError("");
    if (codeActive && phone) {
      setStep("code");
      return;
    }
    setBusy(true);
    try {
      await authService.resetPin(phone);
      setIsResettingPin(true);
      setCode("");
      setResendSeconds(30);
      setCodeActive(true);
      setStep("code");
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await completeSignIn(phone, pin);
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function findInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const nextInvite = authService.getInvite(inviteInput);
    if (!nextInvite) {
      setError(authStrings.join.invalid);
      return;
    }
    await navigate({
      to: "/join/$code",
      params: { code: nextInvite.code },
    });
  }

  function back() {
    setError("");
    if (step === "code") {
      setStep("phone");
      return;
    }
    if (step === "pin" || step === "create-pin") {
      setStep("phone");
      return;
    }
    if (
      step === "phone" &&
      (flowMode === "welcome" || flowMode === "login" || flowMode === "landlord-signup")
    ) {
      setStep("welcome");
    }
    else if (step === "phone" && flowMode === "tenant-invite") navigate({ to: "/join" });
    else if (step === "join-code") setStep("welcome");
  }

  return (
    <main className="flex min-h-[calc(100dvh-2.75rem)] items-center justify-center bg-secondary px-4 py-8 sm:px-6">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-background shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-7">
          <Logo />
          {step !== "welcome" && (
            <button
              type="button"
              onClick={back}
              className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {authStrings.phone.back}
            </button>
          )}
        </div>
        <div className="px-5 py-7 sm:px-7 sm:py-9">
          <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {step === "welcome" ? (
              <ShieldCheck className="size-6" aria-hidden="true" />
            ) : (
              <ArrowRight className="size-6" aria-hidden="true" />
            )}
          </div>
          <p className="text-sm font-semibold text-primary">
            {step === "welcome" ? authStrings.welcome.eyebrow : authStrings.brand}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-primary-deep">{screenTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {step === "welcome" && authStrings.welcome.description}
            {step === "join-code" && authStrings.join.description}
            {step === "phone" && authStrings.phone.description}
            {step === "code" && authStrings.code.description}
            {step === "pin" && authStrings.pin.description}
            {step === "create-pin" && authStrings.pin.createDescription}
          </p>

          {step === "welcome" && (
            <div className="mt-7 space-y-3">
              <Button className="h-14 w-full justify-between px-5" onClick={() => navigate({ to: "/join" })}>
                {authStrings.welcome.tenant}
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                className="h-14 w-full justify-between px-5"
                onClick={() => {
                  setFlowMode("landlord-signup");
                  setRoleIntent("landlord");
                  setStep("phone");
                  setError("");
                }}
              >
                {authStrings.welcome.landlord}
                <ArrowRight aria-hidden="true" />
              </Button>
              <p className="pt-3 text-center text-sm text-muted-foreground">
                {authStrings.welcome.footer}
              </p>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setFlowMode("login");
                  setStep("phone");
                  setRoleIntent(null);
                  setError("");
                }}
              >
                {authStrings.welcome.login}
              </Button>
            </div>
          )}

          {step === "join-code" && (
            <form className="mt-7 space-y-4" onSubmit={findInvite}>
              <div className="space-y-2">
                <Label htmlFor="invite-code">{authStrings.join.label}</Label>
                <Input
                  id="invite-code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder={authStrings.join.placeholder}
                  value={inviteInput}
                  onChange={(event) => setInviteInput(event.target.value)}
                  className="h-14 uppercase tracking-wider"
                  required
                />
              </div>
              <ErrorNotice message={error} />
              <Button className="h-14 w-full" type="submit">
                {authStrings.join.submit}
                <ArrowRight aria-hidden="true" />
              </Button>
            </form>
          )}

          {step === "phone" && (
            <div className="mt-6 space-y-5">
              {invite && (
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {authStrings.join.inviteTitle}
                  </p>
                  <p className="mt-2 font-semibold text-primary-deep">
                    {invite.propertyName} · {invite.unitName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{invite.landlordName}</p>
                </div>
              )}
              {flowMode === "tenant-invite" && !invite && (
                <ErrorNotice message={authStrings.join.invalid} />
              )}
              <form className="space-y-4" onSubmit={continueWithPhone}>
                <div className="space-y-2">
                  <Label htmlFor="auth-phone">{authStrings.phone.label}</Label>
                  <div className="flex gap-2">
                    <span className="inline-flex h-14 shrink-0 items-center rounded-md border border-input bg-muted px-4 font-semibold text-foreground">
                      {authStrings.phone.prefix}
                    </span>
                    <Input
                      id="auth-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder={authStrings.phone.placeholder}
                      value={phoneInput}
                      onChange={(event) => {
                        setPhoneInput(event.target.value);
                        setNoAccount(false);
                      }}
                      className="h-14"
                      aria-describedby="phone-network-hint"
                      required
                    />
                  </div>
                  <p id="phone-network-hint" className="text-xs text-muted-foreground">
                    {authStrings.phone.networkHint}
                  </p>
                </div>
                <ErrorNotice message={error} />
                <Button className="h-14 w-full" type="submit" disabled={busy}>
                  {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                  {busy ? authStrings.phone.checking : authStrings.phone.submit}
                </Button>
              </form>
              {authDemoCode && (
                <p className="rounded-xl bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                  {authStrings.phone.demoHint}
                </p>
              )}
              {noAccount && (
                <div className="space-y-3 rounded-2xl border border-warning/40 bg-warning-soft p-4">
                  <p className="font-semibold text-foreground">{authStrings.phone.loginNewTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {authStrings.phone.loginNewDescription}
                  </p>
                  <Button
                    variant="outline"
                    className="h-12 w-full"
                    onClick={() => void continueFromUnknownPhone("tenant")}
                  >
                    {authStrings.phone.joinWithInvite}
                  </Button>
                  <Button className="h-12 w-full" onClick={() => void continueFromUnknownPhone("landlord")}>
                    {authStrings.phone.landlordSignup}
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "code" && (
            busy ? (
              <div className="mt-7 space-y-4" role="status" aria-busy="true">
                <span className="sr-only">{authStrings.common.loading}</span>
                <Skeleton className="mx-auto h-12 w-[17rem]" />
                <Skeleton className="h-14 w-full rounded-full" />
                <Skeleton className="mx-auto h-11 w-36" />
              </div>
            ) : (
            <form className="mt-7 space-y-5" onSubmit={verifyCode}>
              <div className="flex justify-center">
                <InputOTP
                  value={code}
                  onChange={(value) => setCode(value)}
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  aria-label={authStrings.code.label}
                >
                  <InputOTPGroup className="gap-1">
                    {Array.from({ length: 6 }, (_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-12 w-11 rounded-lg border text-lg font-bold first:rounded-lg last:rounded-lg"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {authDemoCode && (
                <p className="text-center text-xs font-medium text-primary">{authStrings.code.demoHint}</p>
              )}
              <ErrorNotice message={error} />
              <Button className="h-14 w-full" type="submit" disabled={busy || code.length !== 6}>
                {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                {busy ? authStrings.common.loading : authStrings.code.submit}
              </Button>
              <button
                type="button"
                className="min-h-11 w-full text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
                onClick={() => void resendCode()}
                disabled={busy || resendSeconds > 0}
              >
                {resendSeconds > 0
                  ? authStrings.code.resendIn.replace("{seconds}", String(resendSeconds))
                  : authStrings.code.resend}
              </button>
            </form>
            )
          )}

          {step === "pin" && (
            <form className="mt-7 space-y-4" onSubmit={submitPin}>
              <div className="space-y-2">
                <Label htmlFor="auth-pin">{authStrings.pin.label}</Label>
                <Input
                  id="auth-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={6}
                  pattern="[0-9]{4,6}"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 text-center text-xl tracking-[0.5em]"
                  required
                />
              </div>
              <ErrorNotice message={error} />
              <Button className="h-14 w-full" type="submit" disabled={busy}>
                {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                {busy ? authStrings.pin.signingIn : authStrings.pin.submit}
              </Button>
              <button
                type="button"
                className="min-h-11 w-full text-sm font-semibold text-primary"
                onClick={() => void forgotPin()}
                disabled={busy}
              >
                {authStrings.pin.forgot}
              </button>
            </form>
          )}

          {step === "create-pin" && (
            <form className="mt-7 space-y-4" onSubmit={createPin}>
              <div className="space-y-2">
                <Label htmlFor="new-pin">{authStrings.pin.label}</Label>
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  pattern="[0-9]{4,6}"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 text-center text-xl tracking-[0.5em]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pin">{authStrings.pin.confirmLabel}</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  pattern="[0-9]{4,6}"
                  value={confirmPin}
                  onChange={(event) =>
                    setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="h-14 text-center text-xl tracking-[0.5em]"
                  required
                />
              </div>
              <ErrorNotice message={error} />
              <Button className="h-14 w-full" type="submit" disabled={busy}>
                {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                {busy ? authStrings.common.loading : authStrings.pin.submit}
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

export function AuthErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  if (!message) return null;
  return <AuthErrorState message={message} />;
}
