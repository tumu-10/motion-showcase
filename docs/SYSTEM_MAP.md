# Propatiz System Map

## Tech stack

- TanStack Start with TanStack Router and server-side rendering
- React 19, TypeScript and Vite
- Tailwind CSS v4
- Motion for page and component transitions
- Recharts for charts
- Radix UI primitives through the local `src/components/ui` wrappers
- React Query for the router application context
- Vitest, Testing Library and jsdom for tests
- Nitro/Cloudflare-compatible build output through the Lovable Vite configuration
- Sonner for toasts
- Demo-only browser state in `localStorage`; no live database is configured

## Folder map

- `src/routes/`: TanStack route entry points for `/`, `/landlord`, `/tenant` and `/admin`
- `src/components/landing/` and `src/routes/index.tsx`: public landing page
- `src/components/landlord/`: landlord units, overview, payments, complaints and reports
- `src/components/tenant/`: tenant home, payment flow, complaints, swipe deck and app shell
- `src/components/admin/`: admin landlord operations and tenant onboarding dialog
- `src/components/shared/`: dashboard shell, navigation, status, calendar, offline and motion helpers
- `src/components/ui/`: reusable UI primitives
- `src/lib/`: rent rules, accounting, demo state, sample data, motion helpers and utilities
- `src/assets/`: local images and brand assets
- `public/`: public static files, including the favicon
- `src/server.ts`, `src/start.ts`: SSR and error handling plus CSRF middleware

## Routing

- `/` is the public landing page
- `/landlord` is the landlord demo dashboard
- `/tenant` is the mobile-first tenant demo
- `/admin` is the platform admin demo
- The shared `DashShell` provides landlord/admin desktop sidebar and mobile sheet navigation
- The demo switcher links all three demo audiences

## Demo data and state

- Illustrative people, properties, units, ledger entries, complaints, listings and notification records live in `src/lib/sample-data.ts`
- Rent demo state uses `src/lib/rent-demo.ts` and `src/lib/useRentDemoData.ts`
- The browser key `propatiz-demo-rent-state` persists landlord units, ledger entries and tenant notifications
- Reloading retains the browser demo state; moving-out and reset behaviour is currently page/component state or demo local state
- No Supabase project, migration, backend table or live provider adapter is present in the workspace
- The SSR server entry only wraps the TanStack server; it does not implement a persistent Propatiz data API

## Payments and receipts today

- Payment entries are records in `LedgerEntry`
- Confirmed ledger entries cover rent periods through `rentPeriod`, `monthsCovered` and optional `coverageAmounts`
- Supported demo methods are MTN Mobile Money, Airtel Money, Cash, Bank transfer, Visa and Mastercard
- Tenant and landlord flows currently mock payment success and payment recording
- The ledger identifies confirmed, pending and failed entries
- The existing reports calculate and export in-browser rent summaries
- There is no immutable receipt model, receipt number/QR verification, branded PDF template, EFRIS submission or real provider integration yet
- Cash and advance recording update the in-browser rent state and notify the tenant
- Security deposits are not yet represented by a separate ledger

## Rent status calculation

- The shared due-soon threshold is seven days in `src/lib/rent.ts`
- `getRentStatus(daysUntilDue, paid)` is used by the landing page and tenant view
- Overdue: the unit is unpaid and `daysUntilDue < 0`
- Due soon: unpaid and `daysUntilDue <= 7` and not overdue
- Upcoming: unpaid and more than seven days until due
- Paid: the passed paid flag is true
- The detailed accounting status in `src/lib/rent-accounting.ts` takes confirmed ledger credit into account
- Accounting statuses are Advance, Paid, Partially paid, Due, Overdue and Vacant
- An advance is detected when coverage was received before the period or the unit remains covered beyond the current period
- Paid status in the landlord route is derived from confirmed ledger credit for the current rent period
- Month/rent calculations use integer UGX and rent periods in `YYYY-MM` format

## Dashboard card and status consistency

- Landlord Overview currently has four near-neutral `surface` cards: cash received, expected after advances, tenants expected to pay and rent covered by advances
- The cards lack the required per-status coloured backgrounds, icon chips and one-line explanations
- Collected, Expected, Paid, Advance, Due soon, Upcoming and Overdue are represented inconsistently across Overview, Units and reports
- Paid, due-soon and overdue statuses exist in shared helpers, while Overview uses a separate accounting status vocabulary
- The landlord sidebar is not yet the requested mobile bottom-navigation plus More structure
- The route exposes Overview, Units, Repairs, Payments, Calendar and Reports; future Advance, Security, Notices, URA/EFRIS and Settings pages still need to be added
- Deposit, advance and rental income totals are not yet separated by a dedicated deposit ledger
- Money totals use the `UGX` formatter but several dashboard cards and copy still need tooltip and income-vs-collection clarifications

## Implementation plan

1. Add the system-wide `.github/copilot-instructions.md` rules and `src/lib/legal.ts` business constants.
2. Phase 1: complete the landlord design system, coloured Overview metrics, attention queue, tooltiped totals, mobile bottom navigation and motion/loading states.
3. Phase 2: add the move-in wizard, Advance and Security sections, deposit ledger and Legal Guard tests.
4. Phase 3: implement payment-provider mock adapters and premium immutable receipt PDFs, sharing and verification.
5. Phase 4: build dated and property-filtered reports, summary narratives, exports and tax/ageing tests.
6. Phase 5: build notice templates, lawful notice/escalation workflows and eviction validation tests.
7. Phase 6: add URA/EFRIS profile checks, mock fiscal provider states and reconciliation.
8. Phase 7: implement notification adapters, reminder scheduling and de-duplicated reminders.
9. Phase 8: add tenant home services and property-provider service requests without changing bottom navigation.
10. Phase 9: polish the landing page and demo data, run final desktop/mobile QA and document live-provider limitations.
