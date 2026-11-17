import { Menu, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import type { AppPath } from "@/components/motion/PageTransition";
import { DemoSwitcher } from "@/components/shared/DemoSwitcher";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type NavItem<T extends string> = { id: T; label: string; icon: LucideIcon; badge?: number };

/** Sidebar layout shared by the landlord and admin dashboards. */
export function DashShell<T extends string>({
  current,
  nav,
  view,
  onView,
  account,
  children,
}: {
  current: AppPath;
  nav: NavItem<T>[];
  view: T;
  onView: (v: T) => void;
  account: { name: string; role: string };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const sidebar = (layoutKey: string, onPick?: () => void) => (
    <div className="flex h-full flex-col gap-8 p-5">
      <Logo tone="onDeep" />
      <nav className="flex flex-col gap-1" aria-label="Dashboard">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.id === view;
          return (
            <button
              key={item.id}
              onClick={() => {
                onView(item.id);
                onPick?.();
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold transition-colors",
                active
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`dash-nav-${layoutKey}`}
                  className="absolute inset-0 rounded-lg bg-sidebar-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <Icon className="relative size-5" aria-hidden />
              <span className="relative flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "figure relative grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs",
                    active
                      ? "bg-primary-deep text-on-deep"
                      : "bg-destructive text-destructive-foreground",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto space-y-6">
        <DemoSwitcher current={current} tone="onDeep" />
        <div className="flex items-center gap-3 border-t border-sidebar-border pt-5">
          <span className="grid size-10 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
            {account.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{account.name}</p>
            <p className="truncate text-xs text-on-deep-muted">{account.role}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="deep-panel sticky top-0 hidden h-dvh lg:block">{sidebar("desktop")}</aside>

      <div className="min-w-0">
        <OfflineBanner />
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
          <Logo />
          <Button
            variant="outline"
            size="iconSm"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="left"
            className="deep-panel !bg-primary-deep w-[85%] max-w-xs border-none p-0 [&>button]:text-on-deep"
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            {sidebar("mobile", () => setOpen(false))}
          </SheetContent>
        </Sheet>

        <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-8 lg:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: ease.outExpo }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
          {title}
        </h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
