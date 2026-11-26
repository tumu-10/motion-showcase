import { useNavigate } from "@tanstack/react-router";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authDemoCode, authService, AuthServiceError } from "@/lib/auth/auth-service";
import { authErrorText, authStrings } from "@/lib/auth/strings";

export function AdminSecondStepPage() {
  const navigate = useNavigate();
  const session = authService.getSession();
  const started = useRef(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (!session || started.current) return;
    started.current = true;
    void authService
      .requestCode(session.phone)
      .then(() => {
        setResendSeconds(30);
        setBusy(false);
      })
      .catch((reason: unknown) => {
        setError(
          reason instanceof AuthServiceError
            ? authErrorText(reason.code)
            : authStrings.errors.generic,
        );
        setBusy(false);
      });
  }, [session]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setError(authStrings.errors.sessionRequired);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await authService.verifyCode(session.phone, code);
      authService.completeAdminVerification();
      await navigate({ to: "/admin" });
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

  async function resendCode() {
    if (!session) return;
    setError("");
    setBusy(true);
    try {
      await authService.requestCode(session.phone);
      setCode("");
      setResendSeconds(30);
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

  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-border bg-background p-5 shadow-card sm:p-8">
        <Logo />
        <div className="mt-8 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-primary-deep">{authStrings.admin.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {authStrings.admin.description}
        </p>
        <form className="mt-6 space-y-4" onSubmit={verify}>
          <div className="flex justify-center">
            <InputOTP
              value={code}
              onChange={setCode}
              maxLength={6}
              pattern="[0-9]*"
              inputMode="numeric"
              aria-label={authStrings.code.label}
              disabled={busy}
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
          {error && (
            <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="h-14 w-full" disabled={busy || code.length !== 6}>
            {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            {busy ? authStrings.admin.sending : authStrings.admin.submit}
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
      </section>
    </main>
  );
}
