# Loanarr

A mortgage loan simulator for the Belgian market, built with Next.js and hosted on Vercel.
The app UI is in Dutch (nl-BE); code, comments and docs are in English.

## Stack

| Layer | Choice |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) + TypeScript |
| Package manager | [Bun](https://bun.sh) |
| Styling | Tailwind CSS v4 |
| UI components | [shadcn/ui](https://ui.shadcn.com) (Base UI primitives) |
| Charts | Recharts via shadcn's `Chart` component |
| State | Zustand |
| Validation | Zod |
| Money math | decimal.js |
| Tests | Vitest |
| Lint & format | Biome |
| Hosting | Vercel |

## Getting started

Requirements: [Bun](https://bun.sh) 1.3+ (Node.js 20+ is also needed for Next.js).

```bash
bun install
bun dev          # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `bun dev` | Start the dev server |
| `bun run build` | Production build |
| `bun start` | Serve the production build |
| `bun run test` | Run unit tests once (Vitest) |
| `bun run test:watch` | Run tests in watch mode |
| `bun run lint` | Lint and check formatting (Biome) |
| `bun run format` | Format all files (Biome) |
| `bun run typecheck` | TypeScript check |

> Use `bun run test`, not `bun test`: the latter runs Bun's own test runner instead of Vitest.

## Project structure

```
src/
  app/              Next.js routes and layout
  components/ui/    shadcn components (generated, owned by us)
  components/sim/   Simulation UI: form, chart, table
  lib/sim/          Simulation engine: pure TypeScript, no React
  lib/format.ts     nl-BE number, currency and percent formatting
  stores/           Zustand stores
```

**Rule:** `src/lib/sim/` stays pure TypeScript with no React or browser APIs.
That keeps it easy to test, and lets it run in a Web Worker or an API route unchanged.

Add shadcn components with:

```bash
bunx --bun shadcn@latest add <component>
```

## Features

- **Jouw situatie** (first, optional step): household, net incomes, savings, investments, family
  gift, current rent, other loans and a cash buffer. Suggests a comfortable (~30 % of income) and a
  maximum monthly payment (⅓ of income, enough living money left) and the own funds to use
  (assets minus buffer). The result step then shows a traffic-light readiness check and a
  buy-vs-rent comparison with an editable break-even chart. Nothing is stored or sent anywhere.
  Living-money minimums are estimates in [`situation.ts`](src/lib/sim/situation.ts).
- **Wat kan ik kopen?** (`/`): for first-time buyers. From a desired monthly payment and own
  funds, it finds the highest purchase price, including all costs, and shows a financial plan
  (expenses = loan + own funds). The price is limited by the monthly budget or by the bank's
  maximum loan-to-value (quotiteit), whichever comes first.
- **Aflossingstabel** (`/aflossing`): monthly and yearly repayment schedule for a given loan.

## Belgian conventions

The engine follows Belgian mortgage (woonkrediet / hypothecaire lening) practice:

- **Equivalent monthly rate.** The monthly rate is `(1 + yearly)^(1/12) − 1`, as required for
  mortgage credit under Book VII of the Belgian Code of Economic Law, not `yearly / 12`.
- **Repayment types.**
  - `annuity`: fixed monthly payment (*vaste mensualiteiten*)
  - `linear`: fixed capital repayment with decreasing payments (*vaste kapitaalaflossing*)
- **Rounding.** All amounts are rounded to cents; the last payment absorbs rounding differences
  so the balance ends at exactly € 0.
- **Formatting.** Euros and percentages use the `nl-BE` locale (`€ 1.234,56`, `3,20 %`).
  Inputs accept Belgian notation (`250.000`, `3,2`).

### Interest rates

Rates live in [`src/lib/sim/rates.ts`](src/lib/sim/rates.ts), taken from banks' own published
tariff sheets (November 2026): Argenta, Belfius, Crelan, BNP Paribas Fortis (broker channel) and
Elantis. Argenta and Elantis were read directly from their PDFs; the others come from research
notes (`verified: false`). KBC, ING and vdk publish no tariff sheet.

- **Default rate: the live NBB/ECB market rate** (fixed > 10 years, what buyers actually pay after
  negotiation; see "Live market rates"). Users can switch to the bank tariff average.
- The bank tariff option is the **average across banks with the bank's own insurance**, per duration
  bracket (a 22-year loan gets the 25-year rate).
- Typing a rate switches to a custom rate; the rate hint lets users switch back.
- Why not 5 %? Tariff sheets are list prices before negotiation. Broker barometers (Immotheker
  Finotheker: ~4 %) often quote 10-year fixed periods, not fixed for the full term.
- The result step compares the maximum price per bank.

**Banks change these every few weeks: update the table and `RATES_CHECKED_ON` regularly.**

To verify: Elantis' published example (€ 200.000, 100 % inscription) lists € 4.590,89 mortgage
costs, about € 435 below our estimate. Our credit-deed costs may be slightly conservative.

### Live market rates

The homepage chart and the "after negotiation" reference rate come from the ECB Data Portal
(MFI interest rate statistics for Belgium, collected by the NBB): new housing loans to
households, fixed > 10 years, all loans, and variable/≤ 1 year. Monthly, since 2000.

- Fetched server-side in [`get-market-rates.ts`](src/lib/market/get-market-rates.ts) with
  `"use cache"` + `cacheLife("hours")`: pages are prerendered and refreshed hourly, so a new
  month appears automatically once the ECB publishes it (about two months after the fact).
- If the API is unreachable, the bundled [`snapshot.json`](src/lib/market/snapshot.json) is
  used and the footer says "Reservekopie". Refresh it with `bun run rates:snapshot`.
- The footer shows when each data source was last updated.

Bank tariff sheets are not available as an API, so they are still updated by hand in
`rates.ts`.

## Themes and dark mode

The palette icon in the navigation switches between light, dark and system mode, and five
palettes: Smaragd (default), Oceaan, Aubergine, Terracotta and Grafiet. The choice is saved in
`localStorage`, and an inline script in [`layout.tsx`](src/app/layout.tsx) applies it before the
first paint so there is no flash.

All colors in [`globals.css`](src/app/globals.css) are built from three variables: `--h` (brand
hue), `--s` (saturation) and `--ah` (contrast hue for interest and costs). A new palette is a
`:root[data-palette="…"]` block that sets those three; add it to `palettes` in
[`src/lib/theme.ts`](src/lib/theme.ts).

## Branding

Logo options are in [`public/logos/`](public/logos/) (preview: `/logos/preview.html` on the dev
server). Option A (house with rising bars, all white) is the chosen logo and favicon ([`src/app/icon.svg`](src/app/icon.svg), [`logo.tsx`](src/components/logo.tsx)). Theme: emerald green
for capital and actions, amber for interest and costs.

### Purchase and credit costs (first home)

All tariffs live in [`src/lib/sim/tariffs.ts`](src/lib/sim/tariffs.ts), each with its source
and a `TARIFFS_CHECKED_ON` date. **Re-check them when rules change** (at least every January,
when notary fixed amounts are indexed).

| Cost | Rule |
|---|---|
| Registration duty, Flanders | 2 % (deed in 2026); 3 % announced from 1 Jan 2027, not yet enacted |
| Registration duty, Wallonia | 3 % for a sole own home (price ceiling not confirmed) |
| Registration duty, Brussels | 12,5 %, first € 200.000 exempt if price ≤ € 600.000 |
| Notary fee, purchase deed | Legal scale **Jbis** (sole own home), indexed 1 Jan 2026 |
| Notary fee, credit deed | Legal scale **Gbis** (financing a sole own home) |
| Notary admin costs | € 855 excl. VAT per deed; 21 % VAT on fee + admin costs |
| Mortgage inscription | 1 % registration + 0,3 % mortgage duty on loan × 110 % (inscribed part only; a mandate avoids these) |
| Third-party expenses | Estimated (€ 900 purchase, € 280 credit); vary per file |

The notary fee code reproduces published 2026 reference values exactly (scale J and Jbis on
€ 300.000), and the credit-deed costs match a real Belgian broker simulation within € 30.

Not yet modelled: variable rates and their legal caps, the JKP (jaarlijks kostenpercentage),
the Flemish modest-home reduction, new builds (VAT instead of registration duty), and insurance. The UI shows a disclaimer that the
simulation is indicative and not a credit offer. If the tool is ever offered publicly by a credit
provider or intermediary, check the Book VII advertising rules (representative example, JKP)
before launch.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new). Vercel detects Next.js and Bun (`bun.lock`)
   automatically; no `vercel.json` is needed.
3. Every push to `main` deploys to production; other branches and pull requests get preview URLs.

Environment variables go in the Vercel project settings. For local values, copy `.env.example`
to `.env.local` (git-ignored).
