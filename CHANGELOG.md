# Changelog

## UI polish series

- **Public demo access** (`31c93f1`): made the sample tenant, landlord and admin demos available
  without login; authentication remains available through the login page.
- **Shared foundation** (`321f134`, `b208353`, `1aed295`): refined shared design and motion
  foundations and bounded preloader timing.
- **Authentication** (`9ae0cd2`): improved the responsive login flow, demo-account quick fill,
  progress feedback, accessible errors and session continuation.
- **Landing page** (`704ffd6`): improved reduced-motion navigation, transition-aware logo links,
  mobile menu sizing and keyboard access to role tabs.
- **Tenant experience** (`b66ab69`): refined mobile navigation, payment and complaint flows,
  sheets, reduced-motion handling and notification announcements.
- **Landlord and admin dashboards** (`5b42453`): aligned status colors, made dashboard dates and
  rent-period labels current, and improved reduced-motion navigation and focus behavior.
- **Public pages** (`67148f5`): added shared page reveals, made WhatsApp hover motion respect the
  reduced-motion preference and stabilized shared motion initial styles for server rendering.
- **Motion consistency and documentation** (`f7eb4e4`): aligned reveal timing with shared tokens,
  stabilized preloader, hero and rent-ring initial styles, and documented motion practices.

## Validation

- Targeted route, rent-accounting and waitlist tests passed for the relevant phases.
- Production builds passed after the dashboard and public-page changes.
- Browser checks at 360 px found no horizontal overflow on the landlord dashboard, landing page,
  pilot, trust and pricing pages. Dashboard bottom-navigation targets measured 50 x 66 px.
- Reduced-motion browser checks confirmed page navigation without hydration mismatch.
