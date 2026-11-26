import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { TransitionLink } from "@/components/motion/PageTransition";
import { PublicSiteLayout } from "@/components/site/PublicSiteLayout";
import { buttonVariants } from "@/components/ui/button";
import { getWhatsAppHref } from "@/lib/contact";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing | Propatiz" },
      {
        name: "description",
        content:
          "Simple, transparent Propatiz pricing for landlords and property managers in Uganda.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <PublicSiteLayout>
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-eyebrow text-primary">Simple pricing</p>
        <h1 className="mt-3 text-display text-primary-deep">
          Start small. Grow with your properties.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Straightforward plans for landlords and property managers. Pilot prices are placeholders
          and may change.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <article className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-xl font-bold text-primary-deep">Free</h2>
            <p className="mt-3 text-3xl font-extrabold text-primary-deep">UGX 0</p>
            <p className="mt-1 text-sm text-muted-foreground">Up to 5 units</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
                Rent records for up to 5 units
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
                Tenant and property records
              </li>
            </ul>
            <TransitionLink
              to="/pilot"
              className={buttonVariants({
                variant: "outline",
                className: "mt-auto min-h-12 w-full",
              })}
            >
              Join the pilot
            </TransitionLink>
          </article>

          <article className="flex flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-soft">
            <h2 className="text-xl font-bold text-primary-deep">Per-unit plan</h2>
            <p className="mt-3 text-3xl font-extrabold text-primary-deep">UGX 1,500</p>
            <p className="mt-1 text-sm text-muted-foreground">per unit per month, pilot price</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
                For properties with more than 5 units
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
                Pilot pricing placeholder
              </li>
            </ul>
            <TransitionLink
              to="/pilot"
              className={buttonVariants({ className: "mt-auto min-h-12 w-full" })}
            >
              Join the pilot
              <ArrowRight aria-hidden="true" />
            </TransitionLink>
          </article>

          <article className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-xl font-bold text-primary-deep">Property manager</h2>
            <p className="mt-3 text-3xl font-extrabold text-primary-deep">Contact us</p>
            <p className="mt-1 text-sm text-muted-foreground">
              For teams managing multiple properties
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
                Talk through your portfolio needs
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
                Pilot onboarding information
              </li>
            </ul>
            <a
              href={getWhatsAppHref()}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({
                variant: "outline",
                className: "mt-auto min-h-12 w-full",
              })}
            >
              Contact us
            </a>
          </article>
        </div>
        <p className="mt-6 text-center text-sm font-semibold text-primary-deep">
          Tenants never pay Propatiz fees.
        </p>
      </section>
    </PublicSiteLayout>
  );
}
