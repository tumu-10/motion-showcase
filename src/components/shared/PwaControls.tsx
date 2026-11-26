import { Download, RefreshCw, Share } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaControls() {
  const installEvent = useRef<InstallPromptEvent | null>(null);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const userAgent = navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setShowIosHelp(
      ios &&
        !standalone &&
        window.localStorage.getItem("propatiz-install-help-dismissed") !== "true",
    );

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      installEvent.current = event as InstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      installEvent.current = null;
      setCanInstall(false);
      setShowIosHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    let updateInterval: number | undefined;
    let onVisibilityChange: (() => void) | undefined;
    const onOnline = () => {
      registration.current?.active?.postMessage({ type: "FLUSH_FORM_QUEUE" });
    };
    const onControllerChange = () => {
      const urls = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((url) => new URL(url, window.location.href).origin === window.location.origin);
      registration.current?.active?.postMessage({ type: "CACHE_APP_SHELL", urls });
    };

    if ("serviceWorker" in navigator && !import.meta.env.DEV) {
      window.addEventListener("online", onOnline);
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker
        .register("/service-worker.js", { scope: "/" })
        .then((activeRegistration) => {
          registration.current = activeRegistration;
          onControllerChange();
          if (activeRegistration.waiting && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
          void activeRegistration.update().catch((error: unknown) => {
            console.warn("Could not check for a Propatiz update.", error);
          });
          const checkForUpdate = () => {
            if (document.visibilityState !== "visible") return;
            void activeRegistration.update().catch((error: unknown) => {
              console.warn("Could not check for a Propatiz update.", error);
            });
          };
          onVisibilityChange = checkForUpdate;
          updateInterval = window.setInterval(checkForUpdate, 60 * 60 * 1000);
          document.addEventListener("visibilitychange", checkForUpdate);
          activeRegistration.addEventListener("updatefound", () => {
            const installing = activeRegistration.installing;
            installing?.addEventListener("statechange", () => {
              if (
                installing.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setUpdateReady(true);
              }
            });
          });
        })
        .catch((error: unknown) => {
          console.error("Could not register the Propatiz service worker.", error);
        });

    }

    return () => {
      window.removeEventListener("online", onOnline);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      }
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (updateInterval !== undefined) window.clearInterval(updateInterval);
      if (onVisibilityChange) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, []);

  async function installApp() {
    const prompt = installEvent.current;
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      installEvent.current = null;
      setCanInstall(false);
    }
  }

  function updateApp() {
    const waiting = registration.current?.waiting;
    if (!waiting) return;
    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange, {
      once: true,
    });
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  function dismissIosHelp() {
    window.localStorage.setItem("propatiz-install-help-dismissed", "true");
    setShowIosHelp(false);
  }

  if (!canInstall && !showIosHelp && !updateReady) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:max-w-sm lg:bottom-4">
      {updateReady && (
        <div
          role="status"
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 shadow-lift"
        >
          <p className="text-sm font-semibold text-primary-deep">
            New version available, tap to update
          </p>
          <Button type="button" className="min-h-11 shrink-0" onClick={updateApp}>
            <RefreshCw aria-hidden="true" />
            Update
          </Button>
        </div>
      )}
      {canInstall && (
        <Button
          type="button"
          className="min-h-12 rounded-full shadow-lift"
          onClick={() => void installApp()}
        >
          <Download aria-hidden="true" />
          Install app
        </Button>
      )}
      {showIosHelp && (
        <section
          aria-label="Install Propatiz on iPhone"
          className="w-full rounded-xl border border-border bg-background p-4 shadow-lift"
        >
          <div className="flex items-start gap-3">
            <Share className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-primary-deep">Add Propatiz to your Home Screen</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap Share, then Add to Home Screen.
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss install instructions"
              className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
              onClick={dismissIosHelp}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
