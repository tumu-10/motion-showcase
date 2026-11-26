import { BellRing, CircleUserRound, MoreHorizontal, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import type { AppPath } from "@/components/motion/PageTransition";
import { DemoSwitcher } from "@/components/shared/DemoSwitcher";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { authStrings } from "@/lib/auth/strings";

export type NavItem<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: number;
  mobileMore?: boolean;
};

/** Sidebar layout shared by the landlord and admin dashboards. */
export function DashShell<T extends string>({
  current,
  nav,
  view,
  onView,
  notificationCount = 0,
  onOpenNotifications,
  accountSettings = false,
  account,
  children,
}: {
  current: AppPath;
  nav: NavItem<T>[];
  view: T;
  onView: (v: T) => void;
  notificationCount?: number;
  onOpenNotifications?: () => void;
  accountSettings?: boolean;
  account: { name: string; role: string };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const primaryNav = nav.filter((item) => !item.mobileMore);
  const bottomNav = primaryNav.slice(0, 5);
  const moreNav = [...nav.filter((item) => item.mobileMore), ...primaryNav.slice(5)];
  const moreActive = moreNav.some((item) => item.id === view);
  const moreBadgeCount = moreNav.reduce((total, item) => total + (item.badge ?? 0), 0);

  const sidebar = (layoutKey: string, onPick?: () => void) => (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden p-5">
      <div className="shrink-0">
        <Logo tone="onDeepTransparent" className="text-base" />
      </div>
      <nav
        className="scrollbar-hidden min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1"
        aria-label="Dashboard"
      >
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.id === view;
          return (
            <motion.button
              key={item.id}
              onClick={() => {
                onView(item.id);
                onPick?.();
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 shrink-0 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold transition-colors",
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
              <motion.span
                className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-on-deep/5"
                {...(reduceMotion
                  ? {}
                  : {
                      whileHover: { scale: 1.12, rotateY: 180, rotateX: 8 },
                      whileTap: { scale: 0.92 },
                    })}
                style={{ transformPerspective: 420, transformStyle: "preserve-3d" }}
                transition={{ duration: reduceMotion ? 0 : 0.42, ease: ease.outExpo }}
              >
                <Icon className="size-[1.125rem]" strokeWidth={1.8} aria-hidden />
              </motion.span>
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
            </motion.button>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-6">
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
          <div className="flex items-center gap-1">
            {accountSettings && (
              <Link
                to="/account/settings"
                aria-label={authStrings.settings.title}
                title={authStrings.settings.title}
                className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <CircleUserRound className="size-5" aria-hidden="true" />
              </Link>
            )}
            {onOpenNotifications && (
              <NotificationBell count={notificationCount} onClick={onOpenNotifications} />
            )}
          </div>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="left"
            className="deep-panel !bg-primary-deep w-[85%] max-w-xs overflow-hidden border-none p-0 [&>button]:text-on-deep"
          >
            <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden p-5">
              <div className="shrink-0">
                <Logo tone="onDeep" />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <SheetTitle className="shrink-0 text-left text-lg font-bold text-on-deep">
                  More
                </SheetTitle>
                <nav
                  className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pr-1"
                  aria-label="More dashboard sections"
                >
                  {moreNav.map((item) => {
                    const Icon = item.icon;
                    const active = item.id === view;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => {
                          onView(item.id);
                          setOpen(false);
                        }}
                        aria-current={active ? "page" : undefined}
                        {...(reduceMotion
                          ? {}
                          : { whileHover: { x: 3 }, whileTap: { scale: 0.98 } })}
                        transition={{ duration: 0.22, ease: ease.outExpo }}
                        className={cn(
                          "relative flex min-h-12 shrink-0 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-on-deep-muted hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <motion.span
                          className="grid size-8 shrink-0 place-items-center rounded-lg bg-on-deep/5"
                          {...(reduceMotion
                            ? {}
                            : {
                                whileHover: { scale: 1.12, rotateY: 180, rotateX: 8 },
                                whileTap: { scale: 0.92 },
                              })}
                          style={{ transformPerspective: 420, transformStyle: "preserve-3d" }}
                          transition={{ duration: 0.42, ease: ease.outExpo }}
                        >
                          <Icon className="size-[1.125rem]" strokeWidth={1.8} aria-hidden />
                        </motion.span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge ? (
                          <span className="figure grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                            {item.badge}
                          </span>
                        ) : null}
                      </motion.button>
                    );
                  })}
                </nav>
              </div>
              <div className="shrink-0 space-y-6">
                <DemoSwitcher current={current} tone="onDeep" />
                <div className="flex items-center gap-3 border-t border-sidebar-border pt-5">
                  <span className="grid size-10 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                    {account.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-sidebar-foreground">
                      {account.name}
                    </p>
                    <p className="truncate text-xs text-on-deep-muted">{account.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {(onOpenNotifications || accountSettings) && (
          <div className="sticky top-0 z-30 hidden h-14 justify-end gap-2 border-b border-border bg-background px-8 lg:flex">
            {accountSettings && (
              <Link
                to="/account/settings"
                aria-label={authStrings.settings.title}
                title={authStrings.settings.title}
                className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <CircleUserRound className="size-5" aria-hidden="true" />
              </Link>
            )}
            {onOpenNotifications && (
              <NotificationBell count={notificationCount} onClick={onOpenNotifications} />
            )}
          </div>
        )}

        {bottomNav.length > 0 && (
          <nav
            className="fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-2 right-2 z-40 mx-auto grid h-[4.25rem] max-w-[34rem] rounded-2xl border border-sidebar-border bg-primary-deep px-1 shadow-lift lg:hidden"
            style={{
              gridTemplateColumns: `repeat(${bottomNav.length + (moreNav.length > 0 ? 1 : 0)}, minmax(0, 1fr))`,
            }}
            aria-label="Mobile dashboard navigation"
          >
            {bottomNav.map((item) => {
              const Icon = item.icon;
              const active = item.id === view;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onView(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative mx-0.5 flex min-h-[3.5rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[0.625rem] font-semibold leading-tight",
                    active ? "text-accent-foreground" : "text-on-deep-muted hover:text-accent",
                  )}
                  {...(reduceMotion
                    ? {}
                    : {
                        whileHover: { y: -2, scale: 1.025 },
                        whileTap: { scale: 0.96 },
                      })}
                  transition={{ duration: 0.2, ease: ease.outExpo }}
                >
                  <span className="relative grid size-9 place-items-center">
                    {active && (
                      <motion.span
                        layoutId="mobile-landlord-active"
                        className="absolute inset-0 rounded-full bg-accent shadow-soft ring-2 ring-accent/25"
                        initial={false}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <motion.span
                      className={cn(
                        "relative grid size-9 place-items-center rounded-full transition-colors duration-200",
                        active
                          ? "text-accent-foreground"
                          : "text-on-deep-muted group-hover:bg-accent/15 group-hover:text-accent",
                      )}
                      animate={active ? { scale: [0.88, 1.08, 1] } : { scale: 1 }}
                      {...(reduceMotion
                        ? {}
                        : {
                            whileHover: {
                              scale: 1.14,
                              rotateY: 180,
                              rotateX: 8,
                              y: -1,
                            },
                            whileTap: { scale: 0.9 },
                          })}
                      style={{ transformPerspective: 420, transformStyle: "preserve-3d" }}
                      transition={{ duration: 0.42, ease: ease.outExpo }}
                    >
                      <Icon className="size-[1.125rem]" strokeWidth={2} aria-hidden />
                    </motion.span>
                    {item.badge ? (
                      <span className="figure absolute -right-1 -top-1 z-10 grid h-5 min-w-5 place-items-center rounded-full border-2 border-primary-deep bg-destructive px-1 text-[0.625rem] font-bold leading-none text-destructive-foreground">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </span>
                  <motion.span
                    className="relative max-w-full truncate"
                    animate={active ? { y: -1, opacity: 1 } : { y: 0, opacity: 0.82 }}
                    transition={{ duration: 0.18, ease: ease.outExpo }}
                  >
                    {item.label}
                  </motion.span>
                </motion.button>
              );
            })}
            {moreNav.length > 0 && (
              <motion.button
                onClick={() => setOpen(true)}
                aria-current={moreActive ? "page" : undefined}
                className={cn(
                  "group relative mx-0.5 flex min-h-[3.5rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[0.625rem] font-semibold leading-tight",
                  moreActive ? "text-accent-foreground" : "text-on-deep-muted hover:text-accent",
                )}
                {...(reduceMotion
                  ? {}
                  : {
                      whileHover: { y: -2, scale: 1.025 },
                      whileTap: { scale: 0.96 },
                    })}
                transition={{ duration: 0.2, ease: ease.outExpo }}
              >
                <span className="relative grid size-9 place-items-center">
                  {moreActive && (
                    <motion.span
                      layoutId="mobile-landlord-active"
                      className="absolute inset-0 rounded-full bg-accent shadow-soft ring-2 ring-accent/25"
                      initial={false}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <motion.span
                    className={cn(
                      "relative grid size-9 place-items-center rounded-full transition-colors duration-200",
                      moreActive
                        ? "text-accent-foreground"
                        : "text-on-deep-muted group-hover:bg-accent/15 group-hover:text-accent",
                    )}
                    animate={moreActive ? { scale: [0.88, 1.08, 1] } : { scale: 1 }}
                    {...(reduceMotion
                      ? {}
                      : {
                          whileHover: {
                            scale: 1.14,
                            rotateY: 180,
                            rotateX: 8,
                            y: -1,
                          },
                          whileTap: { scale: 0.9 },
                        })}
                    style={{ transformPerspective: 420, transformStyle: "preserve-3d" }}
                    transition={{ duration: 0.42, ease: ease.outExpo }}
                  >
                    <MoreHorizontal className="size-[1.125rem]" strokeWidth={2} aria-hidden />
                  </motion.span>
                  {moreBadgeCount > 0 ? (
                    <span className="figure absolute -right-1 -top-1 z-10 grid h-5 min-w-5 place-items-center rounded-full border-2 border-primary-deep bg-destructive px-1 text-[0.625rem] font-bold leading-none text-destructive-foreground">
                      {moreBadgeCount > 99 ? "99+" : moreBadgeCount}
                    </span>
                  ) : null}
                </span>
                <motion.span
                  className="relative"
                  animate={moreActive ? { y: -1, opacity: 1 } : { y: 0, opacity: 0.82 }}
                  transition={{ duration: 0.18, ease: ease.outExpo }}
                >
                  More
                </motion.span>
              </motion.button>
            )}
          </nav>
        )}

        <main className="mx-auto max-w-[90rem] px-4 py-6 pb-28 sm:px-8 lg:py-10 lg:pb-10">
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

function NotificationBell({ count, onClick }: { count: number; onClick: () => void }) {
  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative grid size-11 shrink-0 place-items-center rounded-full text-primary-deep transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <BellRing className="size-5" aria-hidden />
      {count > 0 && (
        <span className="figure absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold leading-none text-destructive-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
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
