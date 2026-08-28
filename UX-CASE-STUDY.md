# Vantar — Case Study

**A mobile-first operations platform for a veteran-owned medical courier company**

Role: Product design & full-stack build (solo)
Platform: Progressive Web App — React, Tailwind, Supabase, deployed on Vercel
Timeline: Ongoing, actively used in production

---

## 1. The problem

Vantar is a small SDVOSB (Service-Disabled Veteran-Owned Small Business) medical courier company that runs specimen and supply deliveries, some under federal (SAM.gov) contracts and some as commercial/broker-booked hauls. Before this product existed, the business ran on a mix of paper logs, text messages, and spreadsheets — which created three concrete failure points:

- **Chain of custody was unverifiable.** Medical specimen transport has real compliance stakes, and there was no timestamped, geotagged record tying a photo or a signature to a specific delivery.
- **The office and the road didn't share a system of record.** A dispatcher assigning a run and a driver executing it had no shared, real-time view of status.
- **Financial and compliance visibility was reactive.** SAM.gov registration lapses, contract renewals, and margin per run were things the owner found out about late, not early.

The design brief, in effect, was: *build the tool a two-person office-and-fleet operation actually needs, not a scaled-down version of enterprise TMS software they'll never fully use.*

## 2. Users

Three roles, three genuinely different jobs, one shared data model:

| Role | Primary context | Core need |
|---|---|---|
| **Owner / Head Admin** | Desk, intermittently on the road | Business health at a glance: revenue, compliance deadlines, fleet status, contract pipeline |
| **Dispatcher** | Desk | Assign runs, track them in real time, manage fleet and crew |
| **Driver / Crew** | One-handed, in a vehicle, often with poor signal | Today's run, capture proof of delivery fast, get paid correctly |

Rather than one dashboard with permission-gated widgets, each role gets a **different home screen** built around its actual task: the owner's Dashboard leads with business metrics and compliance alerts; the driver's is a "Today / Upcoming" run list with nothing else competing for attention. That split came directly from watching how differently the two roles actually open the app — a dispatcher opens it to *decide something*, a driver opens it to *do something*.

## 3. Design system

The visual language is deliberately close to black, not navy-blue-black — a near-true dark theme (`#131313` base, `#1C1C1C`–`#2C2C2C` for elevated surfaces) with a single saturated blue accent (`#0A3AFF` / `#042391` for primary actions) and status color coding (green = good/delivered, yellow = pending/warning, red = error/expired, blue = active/in-transit).

Rationale, not just preference:

- **True dark, not "dark gray."** This is used outdoors, on phone screens, often in direct sunlight or at night in a cab. Near-black backgrounds with high-contrast white text hold up better across both conditions than a lighter "dashboard dark mode" gray.
- **One accent color, used sparingly.** Every primary action (Create Run, Confirm, Save) is the same blue. There's no competing secondary-action color — if it's blue, it's the thing to tap.
- **Status is color AND text, never color alone.** `StatusPill` always renders the word (`pending`, `in_transit`, `delivered`) alongside its color, so status is legible without relying on color perception or a glance.
- **Inter typeface, Lucide icons** — a neutral, highly-legible UI face and a consistent icon set, chosen so nothing in the interface calls attention to itself except the data.

Component patterns are intentionally repetitive rather than novel: `MetricCard` for every stat, `AlertBanner` for every warning, `TopBar` for every page header, `StatusPill` for every status. A dispatcher who learns the Runs page already knows how to read the Finances page. Consistency did more for usability here than any individual screen's cleverness.

## 4. Core flows

### 4.1 Chain of custody: photos + signature

The single most safety/compliance-critical flow in the app. A driver on a delivery needs to, in order: photograph the pickup, photograph the sealed package, photograph arrival at delivery, and capture a recipient signature — each step timestamped and geotagged automatically, with no manual data entry required to prove any of it happened.

Design decisions:
- **Progress is always visible, never a checklist you scroll past.** A 4-segment progress bar sits at the top of the page for the entire flow.
- **One tap per photo.** No "take photo → review → confirm → upload" multi-step modal — tapping the file input opens the camera, and the moment a photo is selected it's compressed and uploading in the background while the driver moves to the next step.
- **The signature pad is the default state**, not a separate screen — it renders inline the moment there's no signature on file yet, because in practice signing happens in the same physical moment as the final photo.
- **Reliability *is* the UX here.** A driver on a weak cell connection who sees "Uploading…" with no feedback and no way to retry doesn't have a technical problem, they have a *lost proof-of-delivery* problem. Every upload now has an explicit timeout so a stalled request fails visibly and retryably instead of hanging forever, and photos are compressed client-side before upload (phone camera JPEGs routinely run 3–12MB) so the common case doesn't stall in the first place.

### 4.2 Dispatch and run tracking

Runs move through a fixed status pipeline — `pending → assigned → in_transit → delivered` — visualized identically everywhere they appear (Dashboard, Runs list, Run Detail) via the same `StatusPill`. A run's detail page has exactly one primary action at any given time: "Mark as [next status]," rather than a generic status dropdown, because in the field the only decision that matters is "what's the next thing that happened."

Runs also carry load-level detail relevant to how the business actually gets paid: broker/customer name, Bill of Lading number, rate per mile, and loaded vs. **deadhead** miles (unpaid empty miles) — the last of which the business explicitly needed surfaced as its own tracked number, not buried inside a single "miles" field, because deadhead percentage is a real efficiency metric for a small fleet.

Runs are also split by **contract vs. commercial** — whether a run is tied to a SAM.gov federal contract or is a broker-booked spot-market haul — as a first-class filter on the Runs list and a first-class stat split on the Dashboard, because those two categories of work have different margins, different paperwork, and get evaluated separately by the owner.

### 4.3 An AI assistant scoped to real data, not a chat toy

A floating assistant is available throughout the app, but it's deliberately narrow: it can query the business's actual runs, revenue/expenses, and contracts through defined tools rather than free-associating from a prompt, and every tool call is scoped server-side to the caller's own company — the model chooses *what to filter by*, never *whose data to see*. The assistant is also explicitly grounded in the current date server-side, because an assistant that silently reasons from stale training-data time when asked "show me this month's expenses" is worse than no assistant at all — it returns a confident, wrong answer instead of no answer.

### 4.4 Honest degradation over silent failure

The Contracts page pulls live opportunity matches from the SAM.gov federal contracting API based on the company's NAICS codes. When that live call fails — which, for a public government API, it sometimes will — the UI doesn't hide the failure behind an empty state or fake a result. It falls back to clearly labeled sample data ("SAM.gov unavailable — showing sample results") with the actual failure reason visible underneath, and it computes fallback deadlines relative to today rather than shipping hardcoded dates that quietly go stale. **The interface is honest about what it doesn't know**, rather than presenting fallback content with the same confidence as real data.

### 4.5 Compliance and financial visibility as ambient, not buried

SAM.gov registration expiry, contract renewal windows, and delivery-time anomalies surface as banners at the top of the owner's Dashboard the moment they're true — not on a separate "alerts" page that has to be checked. Each banner is dismissible, and dismissal is remembered per-alert (keyed to *what* the alert says, not just which entity it's about) — so dismissing "contract expires in 12 days" doesn't also silently suppress "contract expired" once it actually lapses three weeks later. An alert that can never be un-shown trains people to stop reading alerts; an alert that reappears the moment its content actually changes stays trustworthy.

## 5. What building it in the open taught me

A few real production issues, fixed live, that shaped the product beyond the original design:

- **A single loose bundler config check** (`id.includes('node_modules/react')`) was silently merging an unrelated signature-capture library into the wrong JavaScript chunk, producing a hard crash on the driver's signature page specifically in production (never in local development) — a reminder that "it works on my machine" is doing a lot of work in that sentence, and that field-critical flows need to be verified against the actual production build, not just the dev server.
- **Fixing the fallback, not just the ideal path, is part of the design work.** The SAM.gov "sample results" labeling existed before I touched it; what was missing was making the *fallback itself* trustworthy — dynamic dates instead of a slowly-expiring hardcoded set. A fallback state is still a state a real user sees.
- **Reliability decisions are UX decisions.** Nothing about "add a 45-second timeout to the upload call" reads like design work on paper. In practice it's the difference between a driver trusting the app to do its one job in a truck with one bar of signal, or not.

## 6. Reflection

The throughline across every decision above is the same one: **design for the actual conditions of use, not the demo conditions.** A driver captures proof of delivery one-handed, outdoors, on a connection that isn't guaranteed. An owner needs to know a contract lapsed before it costs them the contract, not after. An API that fails sometimes should say so, not paper over it. None of that shows up in a mood board — it shows up in whether the person actually using the tool trusts it enough to rely on it every day.

---

## Screenshots

*(Add screenshots here — suggested shots: owner Dashboard with metrics + alerts, driver's "Today" view, the photo/signature capture flow, the Runs list with the Contract/Commercial filter, Finances overview, Contracts page showing the SAM.gov match state.)*

## At a glance

- **Stack:** React 19, Vite, Tailwind CSS, Supabase (Postgres + Auth + Storage + Edge Functions), Vercel, PWA with offline-capable service worker
- **Roles supported:** Owner, Dispatcher, Driver — each with a tailored home screen and scoped navigation
- **Core surfaces:** Dispatch & run tracking, chain-of-custody capture (photo + signature + GPS), financials (revenue/expense/invoicing), federal contract matching (SAM.gov), fleet & vehicle inspections, driver compliance & earnings, IFTA mileage reporting, team messaging, an AI assistant scoped to live company data
