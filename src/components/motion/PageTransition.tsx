import { Link, useNavigate } from "@tanstack/react-router";
import { useAnimate, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { ease, setRevealAt } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type AppPath = "/" | "/tenant" | "/landlord" | "/admin";

export const pathLabels: Record<AppPath, string> = {
  "/": "Home",
  "/tenant": "Tenant app",
  "/landlord": "Landlord dashboard",
  "/admin": "Platform admin",
};

type Ctx = { go: (to: AppPath) => void };
const TransitionCtx = createContext<Ctx>({ go: () => {} });

export function usePageTransition() {
  return useContext(TransitionCtx);
}

/** Two-panel wipe between the main experiences. Content beneath reveals as panels lift. */
export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [scope, animate] = useAnimate();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const busy = useRef(false);
  const [label, setLabel] = useState("");

  const go = useCallback(
    async (to: AppPath) => {
      if (busy.current) return;
      if (reduce) {
        await navigate({ to });
        window.scrollTo(0, 0);
        return;
      }
      busy.current = true;
      setLabel(pathLabels[to]);
      const el = scope.current as HTMLDivElement;
      el.style.pointerEvents = "auto";
      el.style.visibility = "visible";
      const cover = { duration: 0.55, ease: ease.inOutQuart };
      await Promise.all([
        animate(".pt-accent", { y: ["100%", "0%"] }, cover),
        animate(".pt-deep", { y: ["100%", "0%"] }, { ...cover, delay: 0.07 }),
        animate(".pt-content", { opacity: [0, 1], y: [12, 0] }, { duration: 0.4, delay: 0.35, ease: ease.outExpo }),
      ]);
      setRevealAt(380);
      await navigate({ to });
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 140));
      await Promise.all([
        animate(".pt-content", { opacity: 0, y: -12 }, { duration: 0.2 }),
        animate(".pt-deep", { y: "-100%" }, { ...cover, delay: 0.05 }),
        animate(".pt-accent", { y: "-100%" }, { ...cover, delay: 0.12 }),
      ]);
      el.style.pointerEvents = "none";
      el.style.visibility = "hidden";
      busy.current = false;
    },
    [animate, navigate, reduce, scope],
  );

  return (
    <TransitionCtx.Provider value={{ go }}>
      {children}
      <div ref={scope} aria-hidden className="pointer-events-none invisible fixed inset-0 z-[90]">
        <div className="pt-accent absolute inset-0 bg-accent" style={{ transform: "translateY(100%)" }} />
        <div className="pt-deep deep-panel absolute inset-0 flex items-center justify-center" style={{ transform: "translateY(100%)" }}>
          <div className="pt-content flex flex-col items-center gap-4 opacity-0">
            <LogoMark className="size-12 text-on-deep" tone="onDeep" />
            <span className="text-eyebrow text-on-deep-muted">{label}</span>
          </div>
        </div>
      </div>
    </TransitionCtx.Provider>
  );
}

type TransitionLinkProps = {
  to: AppPath;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  onNavigate?: () => void;
};

export function TransitionLink({ to, className, children, onNavigate, ...rest }: TransitionLinkProps) {
  const { go } = usePageTransition();
  return (
    <Link
      to={to}
      className={cn(className)}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onNavigate?.();
        go(to);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
