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
- [ ] **Step 5:** Frontend setup (Next.js + Tailwind + shadcn/ui + layout + auth pages)
- [ ] **Step 6:** Owner dashboard page (metrics, floor plan grid, pending actions, AI insight card)
- [ ] **Step 7:** Marketplace browse page (room cards, filters, search)
- [ ] **Step 8:** Room detail page (photos, true cost estimate, amenities, apply button)

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

## Completed Steps

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
