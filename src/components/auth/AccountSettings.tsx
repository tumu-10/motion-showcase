import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  authDemoCode,
  authService,
  AuthServiceError,
  normalizeAuthPhone,
} from "@/lib/auth/auth-service";
import { authErrorText, authStrings } from "@/lib/auth/strings";

type SettingsStep = "home" | "pin-code" | "pin-create" | "phone-entry" | "phone-code";

export function AccountSettingsPage() {
  const navigate = useNavigate();
  const session = authService.getSession();
  const [step, setStep] = useState<SettingsStep>("home");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  function showError(reason: unknown) {
    setError(
      reason instanceof AuthServiceError
        ? authErrorText(reason.code)
        : authStrings.errors.generic,
    );
  }

  async function startPinChange() {
    setError("");
    setBusy(true);
    try {
      if (!session) throw new AuthServiceError("sessionRequired");
      await authService.resetPin(session.phone);
      setCode("");
      setResendSeconds(30);
      setStep("pin-code");
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function startPhoneChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalized = normalizeAuthPhone(newPhone);
    if (!normalized) {
      setError(authStrings.errors.invalidPhone);
      return;
    }
    setBusy(true);
    try {
      await authService.requestCode(normalized);
      setNewPhone(normalized);
      setCode("");
      setResendSeconds(30);
      setStep("phone-code");
      setNotice(authStrings.settings.verifyNewPhone);
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const targetPhone = step === "phone-code" ? newPhone : session?.phone;
      if (!targetPhone) throw new AuthServiceError("sessionRequired");
      await authService.verifyCode(targetPhone, code);
      if (step === "pin-code") setStep("pin-create");
      else {
        await authService.updatePhone(targetPhone);
        setStep("home");
        setNotice(authStrings.settings.phoneUpdated);
      }
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
      if (step === "pin-code" && session) await authService.resetPin(session.phone);
      else if (step === "phone-code") await authService.requestCode(newPhone);
      setCode("");
      setResendSeconds(30);
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function savePin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (pin !== confirmPin) {
      setError(authStrings.pin.mismatch);
      return;
    }
    setBusy(true);
    try {
      await authService.setPin(pin);
      setStep("home");
      setNotice(authStrings.settings.pinUpdated);
      setPin("");
      setConfirmPin("");
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await authService.logout();
    await navigate({ to: "/login", search: { mode: "login", expired: false } });
  }

  async function requestDeletion() {
    setError("");
    setBusy(true);
    try {
      await authService.requestAccountDeletion();
      setNotice(authStrings.settings.deleteSent);
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  const showCode = step === "pin-code" || step === "phone-code";
  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-border bg-background p-5 shadow-card sm:p-8">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            to={session?.role === "landlord" ? "/landlord" : session?.role === "admin" ? "/admin" : "/tenant"}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {authStrings.phone.back}
          </Link>
        </div>
        <div className="mt-7 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-primary-deep">{authStrings.settings.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {authStrings.settings.description}
        </p>
        <div className="mt-6 space-y-3">
          {step === "home" && (
            <>
              {notice && <Notice message={notice} />}
              <Button
                variant="outline"
                className="h-14 w-full justify-between"
                onClick={() => void startPinChange()}
                disabled={busy}
              >
                {authStrings.settings.changePin}
                <ArrowLeft className="rotate-180" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                className="h-14 w-full justify-between"
                onClick={() => {
                  setError("");
                  setNotice("");
                  setStep("phone-entry");
                }}
              >
                {authStrings.settings.changePhone}
                <ArrowLeft className="rotate-180" aria-hidden="true" />
              </Button>
              <div className="rounded-2xl border border-destructive/20 p-4">
                <p className="text-sm text-muted-foreground">
                  {authStrings.settings.deleteDescription}
                </p>
                <Button
                  variant="destructive"
                  className="mt-3 h-12 w-full"
                  onClick={() => void requestDeletion()}
                  disabled={busy}
                >
                  {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                  {authStrings.settings.delete}
                </Button>
              </div>
              <Button
                variant="ghost"
                className="h-12 w-full"
                onClick={() => void logout()}
                disabled={busy}
              >
                {authStrings.settings.logout}
              </Button>
            </>
          )}

          {step === "phone-entry" && (
            <form className="space-y-4" onSubmit={startPhoneChange}>
              <div className="space-y-2">
                <Label htmlFor="new-phone">{authStrings.settings.newPhone}</Label>
                <div className="flex gap-2">
                  <span className="inline-flex h-14 items-center rounded-md border border-input bg-muted px-4 font-semibold">
                    {authStrings.phone.prefix}
                  </span>
                  <Input
                    id="new-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder={authStrings.phone.placeholder}
                    value={newPhone}
                    onChange={(event) => setNewPhone(event.target.value)}
                    className="h-14"
                    required
                  />
                </div>
              </div>
              <ErrorNotice message={error} />
              <Button type="submit" className="h-14 w-full" disabled={busy}>
                {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                {authStrings.phone.submit}
              </Button>
              <Button type="button" variant="ghost" className="h-12 w-full" onClick={() => setStep("home")}>
                {authStrings.settings.cancel}
              </Button>
            </form>
          )}

          {showCode && (
            <form className="space-y-4" onSubmit={verifyCode}>
              <p className="text-sm text-muted-foreground">
                {step === "phone-code" ? notice : authStrings.code.description}
              </p>
              <div className="flex justify-center">
                <InputOTP
                  value={code}
                  onChange={setCode}
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
                <p className="text-center text-xs font-medium text-primary">
                  {authStrings.code.demoHint}
                </p>
              )}
              <ErrorNotice message={error} />
              <Button type="submit" className="h-14 w-full" disabled={busy || code.length !== 6}>
                {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                {authStrings.code.submit}
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
              <Button type="button" variant="ghost" className="h-12 w-full" onClick={() => setStep("home")}>
                {authStrings.settings.cancel}
              </Button>
            </form>
          )}

          {step === "pin-create" && (
            <form className="space-y-4" onSubmit={savePin}>
              <PinField id="settings-pin" label={authStrings.pin.label} value={pin} onChange={setPin} />
              <PinField
                id="settings-confirm-pin"
                label={authStrings.pin.confirmLabel}
                value={confirmPin}
                onChange={setConfirmPin}
              />
              <ErrorNotice message={error} />
              <Button type="submit" className="h-14 w-full" disabled={busy}>
                {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                {authStrings.settings.changePin}
              </Button>
            </form>
          )}
          {error && step === "home" && <ErrorNotice message={error} />}
        </div>
      </section>
    </main>
  );
}

function PinField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        pattern="[0-9]{4,6}"
        maxLength={6}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        className="h-14 text-center text-xl tracking-[0.5em]"
        required
      />
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
      {message}
    </p>
  );
}

function Notice({ message }: { message: string }) {
  return <p className="rounded-xl bg-success-soft p-3 text-sm text-success">{message}</p>;
}
