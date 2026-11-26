import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { TransitionLink } from "@/components/motion/PageTransition";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { duration, ease, entryDelay } from "@/lib/motion";
import { authStrings } from "@/lib/auth/strings";

const anchors = [
  { href: "#roles", label: "Who it is for" },
  { href: "#payments", label: "How rent moves" },
  { href: "#status", label: "Rent status" },
];

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [delay] = useState(() => entryDelay());
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: reduceMotion ? 0 : duration.page,
        ease: ease.outExpo,
        delay: reduceMotion ? 0 : delay + 0.1,
      }}
      className={cn(
        "sticky top-0 z-[var(--z-header)] border-b transition-[background-color,border-color,box-shadow] duration-300",
        scrolled ? "border-border bg-background shadow-soft" : "border-transparent bg-background/0",
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
        <TransitionLink to="/" aria-label="Propatiz home">
          <Logo />
        </TransitionLink>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
          {anchors.map((a) => (
            <a
              key={a.href}
              href={pathname === "/" ? a.href : `/${a.href}`}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {a.label}
            </a>
          ))}
          <TransitionLink
            to="/pilot"
            className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Pilot
          </TransitionLink>
          <TransitionLink
            to="/trust"
            className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Trust
          </TransitionLink>
          <TransitionLink
            to="/pricing"
            className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Pricing
          </TransitionLink>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to="/login"
            search={{ mode: "login", expired: false }}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {authStrings.welcome.login}
          </Link>
          <TransitionLink
            to="/landlord"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Landlord demo
          </TransitionLink>
          <TransitionLink to="/tenant" className={buttonVariants({ size: "sm" })}>
            Try the tenant app
          </TransitionLink>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="iconSm"
              className="min-h-11 min-w-11 lg:hidden"
              aria-label="Open menu"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex w-[85%] max-w-sm flex-col gap-2 bg-background p-6"
          >
            <SheetTitle className="mb-4">
              <Logo />
            </SheetTitle>
            {anchors.map((a) => (
              <a
                key={a.href}
                href={pathname === "/" ? a.href : `/${a.href}`}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center rounded-sm px-3 text-base font-medium hover:bg-secondary"
              >
                {a.label}
              </a>
            ))}
            <TransitionLink
              to="/pilot"
              onNavigate={() => setOpen(false)}
              className="flex h-12 items-center rounded-sm px-3 text-base font-medium hover:bg-secondary"
            >
              Join the pilot
            </TransitionLink>
            <TransitionLink
              to="/trust"
              onNavigate={() => setOpen(false)}
              className="flex h-12 items-center rounded-sm px-3 text-base font-medium hover:bg-secondary"
            >
              Trust &amp; safety
            </TransitionLink>
            <TransitionLink
              to="/pricing"
              onNavigate={() => setOpen(false)}
              className="flex h-12 items-center rounded-sm px-3 text-base font-medium hover:bg-secondary"
            >
              Pricing
            </TransitionLink>
            <div className="mt-auto flex flex-col gap-2">
              <Link
                to="/login"
                search={{ mode: "login", expired: false }}
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: "outline" })}
              >
                {authStrings.welcome.login}
              </Link>
              <TransitionLink
                to="/landlord"
                onNavigate={() => setOpen(false)}
                className={buttonVariants({ variant: "outline" })}
              >
                Landlord demo
              </TransitionLink>
              <TransitionLink
                to="/admin"
                onNavigate={() => setOpen(false)}
                className={buttonVariants({ variant: "outline" })}
              >
                Admin demo
              </TransitionLink>
              <TransitionLink
                to="/tenant"
                onNavigate={() => setOpen(false)}
                className={buttonVariants()}
              >
                Try the tenant app
              </TransitionLink>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </motion.header>
  );
}
