import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { TransitionLink } from "@/components/motion/PageTransition";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getWhatsAppHref } from "@/lib/contact";

export function PublicSiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <WhatsAppContact />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <TransitionLink to="/" aria-label="Propatiz home">
              <Logo />
            </TransitionLink>
            <p className="mt-2 text-sm text-muted-foreground">A LandVille Ventures product.</p>
          </div>
          <nav
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium"
            aria-label="Public pages"
          >
            <TransitionLink
              to="/pilot"
              className="min-h-11 inline-flex items-center hover:text-primary"
            >
              Join the pilot
            </TransitionLink>
            <TransitionLink
              to="/trust"
              className="min-h-11 inline-flex items-center hover:text-primary"
            >
              Trust &amp; safety
            </TransitionLink>
            <TransitionLink
              to="/pricing"
              className="min-h-11 inline-flex items-center hover:text-primary"
            >
              Pricing
            </TransitionLink>
            <TransitionLink
              to="/tenant"
              className="min-h-11 inline-flex items-center hover:text-primary"
            >
              Tenant app
            </TransitionLink>
            <TransitionLink
              to="/landlord"
              className="min-h-11 inline-flex items-center hover:text-primary"
            >
              Landlord dashboard
            </TransitionLink>
            <TransitionLink
              to="/admin"
              className="min-h-11 inline-flex items-center hover:text-primary"
            >
              Platform admin
            </TransitionLink>
          </nav>
          <p className="text-sm text-muted-foreground">© 2026 LandVille Ventures</p>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppContact() {
  return (
    <a
      href={getWhatsAppHref()}
      target="_blank"
      rel="noreferrer noopener"
      className="fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#15803d] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-200 ease-out hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:bottom-6 sm:right-6"
      aria-label="Chat with us on WhatsApp"
    >
      <MessageCircle aria-hidden="true" className="size-5" />
      Chat with us
    </a>
  );
}
