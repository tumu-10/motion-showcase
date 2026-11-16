import { ArrowLeft } from "lucide-react";
import { TransitionLink, pathLabels, type AppPath } from "@/components/motion/PageTransition";
import { cn } from "@/lib/utils";

const demos: AppPath[] = ["/tenant", "/landlord", "/admin"];

/** Switches between the three role experiences with the page wipe. */
export function DemoSwitcher({ current, tone = "default", className }: { current: AppPath; tone?: "default" | "onDeep"; className?: string }) {
  const onDeep = tone === "onDeep";
  return (
    <nav aria-label="Switch view" className={cn("flex flex-col gap-1", className)}>
      <TransitionLink
        to="/"
        className={cn(
          "mb-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold",
          onDeep ? "text-on-deep-muted hover:text-on-deep" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to overview
      </TransitionLink>
      <div className={cn("flex rounded-full p-1", onDeep ? "bg-on-deep/10" : "bg-muted")}>
        {demos.map((d) => {
          const active = d === current;
          return (
            <TransitionLink
              key={d}
              to={d}
              aria-label={pathLabels[d]}
              className={cn(
                "flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-colors",
                active
                  ? onDeep
                    ? "bg-accent text-accent-foreground"
                    : "bg-card text-foreground shadow-soft"
                  : onDeep
                    ? "text-on-deep-muted hover:text-on-deep"
                    : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d === "/tenant" ? "Tenant" : d === "/landlord" ? "Landlord" : "Admin"}
            </TransitionLink>
          );
        })}
      </div>
    </nav>
  );
}
