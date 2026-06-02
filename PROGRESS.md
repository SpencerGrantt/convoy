# Convoy — Build Progress

## Week 1 — Test Product (live URL by Friday)

### Day 1 — Scaffolding ✅
- [x] `npm create vite@latest convoy -- --template react`
- [x] Install all dependencies
- [x] Configure Tailwind CSS
- [x] Configure vite-plugin-pwa with manifest
- [x] Create GitHub repo (`SpencerGrantt/convoy`) and connect to Vercel
- [x] Deploy placeholder to get a live URL (`convoy-lake-rho.vercel.app`)

### Day 2 — Supabase Setup ✅
- [x] Create Supabase project
- [x] Add `.env.local` with `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- [x] Create `src/lib/supabase.js`
- [x] Run schema SQL in Supabase SQL editor
- [x] Enable Email OTP auth (phone/Twilio deferred to Week 4)
- [x] Add env vars to Vercel

### Day 3 — Login Screen ✅
- [x] Build `src/pages/Login.jsx` with email magic link flow
- [x] Build `src/hooks/useAuth.js` with `onAuthStateChange`
- [x] On first login: insert company + profile rows
- [x] Auth gate in `App.jsx`
- [ ] Test on real mobile device

### Day 4 — Dashboard + Run List ✅
- [x] Build `MobileNav.jsx` bottom tab bar (role-filtered)
- [x] Build `Dashboard.jsx` with metric cards
- [x] Build `Runs.jsx` connected to live Supabase query
- [x] Seed test data (company, profiles, 4 runs, 1 contract, revenue, expenses)
- [ ] Verify on mobile through Vercel URL

### Day 5 — Real-time + Seed + Share
- [x] Supabase Realtime subscription on runs (built, needs live test)
- [x] Seed: company, profiles, 4 runs, 1 contract
- [ ] Full mobile test (iOS Safari + Android Chrome)
- [ ] Share URL with client / stakeholder

---

## Week 2 — Core Field Features

- [ ] New run form (create, assign driver, link contract)
- [ ] Camera capture component using browser `getUserMedia`
- [ ] Photo upload to Supabase Storage with GPS tagging
- [ ] Chain of custody event log (insert on every status change)
- [ ] Touch signature pad using `react-signature-canvas`
- [ ] Driver mobile view (filtered to assigned runs only)
- [ ] Offline queue with IndexedDB + sync on reconnect
- [ ] Contract list + SDVOSB credentials screen

---

## Week 3 — AI + Finances

- [ ] Revenue and expense entry forms
- [ ] Finance dashboard with Recharts bar/line charts
- [ ] Invoice auto-generator from completed runs
- [ ] Supabase Edge Function: Anthropic AI proxy
- [ ] AI assistant chat screen with dynamic system prompt
- [ ] AI run anomaly detection (flag runs >40% over expected duration)
- [ ] SAM.gov contract opportunity matcher
- [ ] Chain-of-custody PDF generator
- [ ] Compliance doc tracker with expiry alerts

---

## Week 4 — Polish + Ship

- [ ] Web Push notifications (overdue runs, contract renewals)
- [ ] Multi-company onboarding flow
- [ ] Full role-based UI (owner / dispatcher / driver views)
- [ ] SAM.gov expiry + contract renewal automated alerts
- [ ] End-to-end testing on iOS Safari and Android Chrome
- [ ] Lighthouse PWA audit (target score 90+)
- [ ] HIPAA review — upgrade Supabase to Business plan, sign BAA
- [ ] Switch login to phone OTP via Twilio
- [ ] Custom domain on Vercel
- [ ] Handoff walkthrough with client
