# Build Progress — DormMatch

## Status: In Progress
**Started:** 2026-07-03
**Last Updated:** 2026-07-03

---

## Phase 1: Core
> Auth, Buildings, Rooms, Applications, Tenancies, Dashboard, Marketplace

- [x] **Step 1:** Buildings module (CRUD, owner-scoped)
- [x] **Step 2:** Rooms module (CRUD, public browse, cost-estimate endpoint)
- [x] **Step 3:** Applications module (tenant applies, owner approves → creates tenancy)
- [x] **Step 4:** Tenancies module (check-in, check-out, walk-in registration)
- [x] **Step 5:** Frontend setup (Next.js + Tailwind + shadcn/ui + layout + auth pages)
- [x] **Step 6:** Owner dashboard page (metrics, floor plan grid, pending actions, AI insight card)
- [x] **Step 7:** Marketplace browse page (room cards, filters, search)
- [x] **Step 8:** Room detail page (photos, true cost estimate, amenities, apply button)

---

## Phase 2: Operations
> Billing, Maintenance, Housekeeping, Announcements, Expenses

- [ ] **Step 9:** Billing module (meter readings, invoice generation, slip upload, verification)
- [ ] **Step 10:** Billing frontend (meter input table, bill preview, tenant payment view)
- [ ] **Step 11:** Maintenance module (submit, update status, resolve)
- [ ] **Step 12:** Housekeeping module (cleaning tasks, checklist, photo upload)
- [ ] **Step 13:** Maintenance + housekeeping frontend pages
- [ ] **Step 14:** Announcements module + frontend
- [ ] **Step 15:** Expenses module + profit report + dashboard update

---

## Phase 3: Polish
> AI, Seed Data, Demo Readiness

- [ ] **Step 16:** AI daily report module (Groq integration, cache to ai_reports)
- [ ] **Step 17:** Notifications system (in-app, logged to notifications table)
- [ ] **Step 18:** Seed demo data script (realistic Thai data, 6 months of meter history)
- [ ] **Step 19:** Final polish (responsive check, error states, loading states)

---

## Demo accounts
- **Owner:** demo.owner@dormmatch.dev / demo1234 — สมชาย ใจดี, owns "หอพักสุขใจ เพลส" (8 rooms, floors 1–2)
- **Tenant:** smoketest.dormmatch@gmail.com / test1234

## Regression testing
- **Script:** `backend/test.sh` — run with `bash test.sh` while the backend is up (uses fresh timestamped test users each run)
- **Covers Steps 1–5:** auth (register/login/me, 401s), buildings (CRUD + owner isolation), rooms (create, browse, detail, cost-estimate, isolation), applications (apply, duplicate 409, approve flow, role 403s, isolation), tenancies (list, /my, tenancy auto-created on approval, room → occupied)
- **Last run:** 2026-07-04 (after Step 8) — 40/40 passed
- Extend this script when each new module is built, then re-run in full before marking the step done

## Completed Steps

### Step 8 — Room detail page ✓ (Phase 1 complete)
- **Files created:** `app/rooms/[id]/page.tsx` (photo gallery + thumbnails, status badge, detail/facility badges, price, utility-rates line), `components/rooms/cost-estimate-card.tsx` (rent + avg electricity/water + total from `/cost-estimate`; rent-only fallback when no meter data), `components/rooms/apply-dialog.tsx` (tenant apply with optional message; login CTA when logged out; hidden for owner/admin; disabled when unavailable; success + 409 conflict states)
- **Files modified:** `messages/th.json` + `en.json` (roomDetail labels), `lib/types.ts` (CostEstimate)
- **Test results:** build passes (`/rooms/[id]` 7.92 kB, dynamic); live API — room detail returns building + facilities, cost-estimate gracefully returns `{estimate: null}`, tenant apply → 201, duplicate → 409; regression `backend/test.sh` — 40/40 passed
- **Demo data:** smoke tenant now has a pending application on demo room 101 (visible in owner dashboard pending actions)

### Step 7 — Marketplace browse page ✓
- **Files created:** `app/rooms/page.tsx` (public browse: search box, building select, min/max price, AC-only checkbox, debounced API fetch), `components/rooms/room-card.tsx` (photo/placeholder, building + room, address, badges, price, view-details link to `/rooms/[id]` — detail page is Step 8)
- **Files modified:** `components/header.tsx` (nav links: browse always, dashboard when logged in), `app/page.tsx` (browse CTA → /rooms), dashboard tenant card (browse button), `messages/th.json` + `en.json` (browse labels)
- **Filters:** building/AC/price go to the API (`?building_id=&has_ac=&min_price=&max_price=`, 400ms debounce); text search filters client-side on building name/address/room number
- **Test results:** build passes (/rooms 5.31 kB); API verified — public browse returns 6 available demo rooms (maintenance/unavailable excluded), `has_ac=true&max_price=4500` → rooms 103/202/203; regression `backend/test.sh` — 40/40 passed
- **Env fix made durable:** `@parcel/watcher-linux-x64-glibc` added to `optionalDependencies` so WSL builds survive `npm install` from Windows

### Step 6 — Owner dashboard ✓
- **Files created:** `lib/types.ts` (Building/Room/Application types), `components/dashboard/owner-dashboard.tsx` (data fetching, building selector, metric cards), `floor-plan-grid.tsx` (rooms grouped by floor, color-coded by status + legend), `pending-applications.tsx` (approve dialog with check-in date → PATCH approve; reject), `ai-insight-card.tsx` (placeholder until Phase 3), `building-dialog.tsx` + `room-dialog.tsx` (minimal owner CRUD so the dashboard is usable)
- **Files modified:** `app/(protected)/dashboard/page.tsx` (owner → full dashboard, tenant → placeholder), `messages/th.json` + `en.json` (dashboard/applications/form labels)
- **Metrics:** total rooms, occupancy rate, available count, pending applications — computed from `GET /api/rooms?building_id=` and `GET /api/applications?status=pending` (filtered per building client-side)
- **Test results:** `npm run build` passes (dashboard 8.06 kB); full regression `backend/test.sh` re-run — 40/40 passed
- **Env note:** `npm install` from Windows swaps in win32 binaries; fixed WSL build with `npm install --no-save @parcel/watcher-linux-x64-glibc`

### Step 5 — Frontend setup ✓
- **Scaffolded:** Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui (10 components) + next-intl (Thai default, `messages/th.json` + `messages/en.json`)
- **Files created:** `lib/api.ts` (fetch wrapper + token storage), `lib/auth-context.tsx` (AuthProvider: login/register/logout/session restore), `components/header.tsx`, `app/page.tsx` (landing), `app/login/page.tsx`, `app/register/page.tsx`, `app/(protected)/layout.tsx` (auth guard → redirects to /login), `app/(protected)/dashboard/page.tsx` (placeholder), `i18n/request.ts`, `.env.local` (NEXT_PUBLIC_API_URL)
- **Backend fixes found during e2e testing:** (1) `lib/supabase.ts` now accepts new-style Supabase keys (`SUPABASE_SECRET_KEY`/`SUPABASE_PUBLISHABLE_KEY`) alongside legacy names; (2) login now uses a throwaway auth client (`createAuthClient()`) for `signInWithPassword` — signing in on the shared `supabaseAdmin` client replaced its service-role auth state and broke RLS bypass ("User profile not found" on login)
- **Verified:** `npm run build` passes; register → login → /me → wrong-password-401 all tested against live Supabase
- **Test account:** smoketest.dormmatch@gmail.com / test1234 (tenant)

### Step 4 — Tenancies module ✓
- **Files created:** `backend/src/modules/tenancies/routes.ts` (1 file)
- **Files modified:** `backend/src/app.ts` (import + registration)
- **Endpoints:** POST / (walk-in), GET / (list), GET /my (tenant active tenancy), GET /:id, PATCH /:id/checkout
- **Checkout triggers:** room → `available`, auto-creates `cleaning_task` with status `pending`
- **Walk-in:** owner creates tenancy directly for existing tenant user; verifies room available + user role = tenant

### Step 3 — Applications module ✓
- **Files created:** `backend/src/modules/applications/routes.ts` (1 file)
- **Files modified:** `backend/src/app.ts` (import + registration)
- **Endpoints:** POST /, GET /, GET /:id, PATCH /:id/approve, PATCH /:id/reject, PATCH /:id/cancel
- **Approve flow:** creates tenancy → sets room to `occupied` → auto-rejects all other pending applications for same room (4 sequential operations)
- **Role scoping:** tenants see own applications; owners see applications for their rooms (with tenant info); admins see all

### Step 2 — Rooms module ✓
- **Files created:** `backend/src/modules/rooms/routes.ts` (1 file)
- **Files modified:** `backend/src/app.ts` (import + registration), `backend/src/middleware/auth.ts` (added `optionalAuthenticate`), `backend/src/modules/buildings/routes.ts` (GET / now public)
- **Endpoints:** POST, GET (list), GET /:id, PUT /:id, DELETE /:id, GET /:id/cost-estimate
- **Public browse:** available rooms filterable by building_id, floor, has_ac, min_price, max_price
- **Owner view:** all rooms across their buildings, filterable by building_id and status
- **Cost estimate:** averages up to 6 months of meter readings; returns null with message if no data

### Step 1 — Buildings module ✓
- **Files created:** `backend/src/modules/buildings/routes.ts` (1 file)
- **Files modified:** `backend/src/app.ts` (import + route registration)
- **Endpoints:** POST /api/buildings, GET /api/buildings, GET /api/buildings/:id, PUT /api/buildings/:id, DELETE /api/buildings/:id
- **Auth:** all routes require `authenticate`; create/list/update/delete require `authorize("owner")`; ownership enforced in every mutating query via `.eq("owner_id", req.user!.id)`

---

## Rules
1. Build ONE step at a time
2. After completing each step: change `[ ]` to `[x]`, add a summary of what was built and how many files were created/modified
3. Before starting the next step, state what was just finished and what's next
4. Do NOT skip steps or combine multiple steps
