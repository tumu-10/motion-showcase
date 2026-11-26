import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { authService } from "@/lib/auth/auth-service";

const SESSION_IDLE_MS = 30 * 60 * 1000;

export function SessionActivityGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const initial = authService.getSession();
    if (!initial || (initial.role !== "landlord" && initial.role !== "admin")) return;

    let timer: number;
    const expire = () => {
      void authService.logout().then(() =>
        navigate({
          to: "/login",
          search: { mode: "login", expired: true },
          state: { expiredPhone: initial.phone },
          replace: true,
        }),
      );
    };
    const refresh = () => {
      authService.touchSession();
      window.clearTimeout(timer);
      timer = window.setTimeout(
        expire,
        Math.max(SESSION_IDLE_MS - (Date.now() - initial.lastActivityAt), 0),
      );
    };
    const activityEvents = ["pointerdown", "keydown", "touchstart", "mousemove", "wheel"];
    activityEvents.forEach((event) => window.addEventListener(event, refresh, { passive: true }));
    timer = window.setTimeout(expire, SESSION_IDLE_MS);

    return () => {
      window.clearTimeout(timer);
      activityEvents.forEach((event) => window.removeEventListener(event, refresh));
    };
  }, [navigate]);

  return children;
}
