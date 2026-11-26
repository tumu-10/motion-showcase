import { createFileRoute } from "@tanstack/react-router";
import { LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { PublicSiteLayout } from "@/components/site/PublicSiteLayout";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust & safety | Propatiz" },
      {
        name: "description",
        content:
          "How Propatiz approaches account security, rental records and payment traceability.",
      },
    ],
  }),
  component: TrustPage,
});

function TrustPage() {
  const sections = [
    {
      title: "Security",
      icon: LockKeyhole,
      content: (
        <p>
          Phone verification is planned for real accounts; this prototype does not verify
          identities. Production records should be encrypted in transit and at rest. The demo uses
          sample data, and Propatiz does not store card numbers.
        </p>
      ),
    },
    {
      title: "Legal records",
      icon: ReceiptText,
      content: (
        <p>
          Propatiz is designed to help landlords keep receipts, notice-period records and deposit
          information in line with Uganda’s Landlord and Tenant Act, 2022. The prototype provides
          record-keeping guidance, not legal advice; confirm the requirements and deposit limits for
          your tenancy.
        </p>
      ),
    },
    {
      title: "Fraud protection",
      icon: ShieldCheck,
      content: (
        <p>
          Landlord verification is planned and is not active in this prototype. Keep a traceable
          payment trail with the payer, date, amount and provider reference, and confirm payments
          against the provider’s records.
        </p>
      ),
    },
  ];

  return (
    <PublicSiteLayout>
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <Reveal>
          <p className="text-eyebrow text-primary">Trust &amp; safety</p>
          <h1 className="mt-3 text-display text-primary-deep">
            Clear records. Honest protections.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Propatiz is currently a front-end prototype. Here is what the product is designed to
            support and what is not yet active.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {sections.map(({ title, icon: Icon, content }) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
            >
              <div className="grid size-12 place-items-center rounded-full bg-secondary text-primary">
                <Icon className="size-6" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-primary-deep">{title}</h2>
              <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{content}</div>
            </article>
          ))}
        </div>
      </section>
    </PublicSiteLayout>
  );
}
