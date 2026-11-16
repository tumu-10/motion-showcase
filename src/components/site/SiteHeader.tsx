import { Menu } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { TransitionLink } from "@/components/motion/PageTransition";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ease, entryDelay } from "@/lib/motion";

const anchors = [
  { href: "#roles", label: "Who it is for" },
  { href: "#payments", label: "How rent moves" },
  { href: "#status", label: "Rent status" },
];

export function SiteHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [delay] = useState(() => entryDelay());
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: ease.outExpo, delay: delay + 0.1 }}
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300",
        scrolled ? "border-border bg-background shadow-soft" : "border-transparent bg-background/0",
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
        <a href="/" aria-label="Propatiz home">
          <Logo />
        </a>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {anchors.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {a.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <TransitionLink to="/landlord" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Landlord demo
          </TransitionLink>
          <TransitionLink to="/tenant" className={buttonVariants({ size: "sm" })}>
            Try the tenant app
          </TransitionLink>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="iconSm" className="md:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-[85%] max-w-sm flex-col gap-2 bg-background p-6">
            <SheetTitle className="mb-4">
              <Logo />
            </SheetTitle>
            {anchors.map((a) => (
              <a
                key={a.href}
                href={a.href}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center rounded-sm px-3 text-base font-medium hover:bg-secondary"
              >
                {a.label}
              </a>
            ))}
            <div className="mt-auto flex flex-col gap-2">
              <TransitionLink to="/landlord" onNavigate={() => setOpen(false)} className={buttonVariants({ variant: "outline" })}>
                Landlord demo
              </TransitionLink>
              <TransitionLink to="/admin" onNavigate={() => setOpen(false)} className={buttonVariants({ variant: "outline" })}>
                Admin demo
              </TransitionLink>
              <TransitionLink to="/tenant" onNavigate={() => setOpen(false)} className={buttonVariants()}>
                Try the tenant app
              </TransitionLink>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </motion.header>
  );
}
