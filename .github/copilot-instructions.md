# Propatiz project instructions

## Product

Propatiz is a rent-collection and records app for Ugandan landlords, caretakers and tenants.
Uganda comes first: use UGX, +256 phone formats, MTN MoMo and Airtel Money, and Kampala demo data.

## Working rules

- Study existing code before changing it. Extend existing features and match the current stack.
- Make small, reviewable changes. Run build, lint and tests after each task.
- Money is stored as integer UGX and formatted as `UGX 1,200,000`.
- Demo dates are relative to today.
- Every status uses colour plus a word and icon.
- Keep tap targets at least 44px and verify at 360px width.
- Use 4/8px spacing, limited radius, short 150-250ms ease-out transitions and reduced-motion support.
- Keep locale-ready UI strings and avoid hardcoded legal thresholds outside `src/lib/legal.ts`.
- Payment, SMS, WhatsApp and EFRIS integrations remain mock adapters behind interfaces.
- Deposits are refundable and excluded from rental-income totals.

## Dashboard tokens

- Collected: `#1d4ed8` on `#dbeafe`
- Expected: `#4338ca` on `#e0e7ff`
- Paid: `#15803d` on `#dcfce7`
- Paid in advance: `#0f766e` on `#ccfbf1`
- Due soon: `#b45309` on `#fef3c7`
- Overdue: `#b91c1c` on `#fee2e2`
- Deposits held: `#6d28d9` on `#ede9fe`
- Occupied: `#334155` on `#e2e8f0`
- Vacant: `#c2410c` on `#ffedd5`
- Open repairs: `#be123c` on `#ffe4e6`
- Brand deep green: `#1f3d30`
