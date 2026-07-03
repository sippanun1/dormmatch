# CLAUDE.md — DormMatch Project Instructions

## What is this project?
DormMatch is a multi-tenant dormitory management marketplace. Multiple building owners list rooms on one platform, tenants browse across all buildings and apply. Key differentiator: true monthly cost estimate (rent + average utilities from real meter data) and AI daily insights for owners.

## Tech stack (do NOT deviate)
- **Backend:** Node.js + Express + TypeScript (modular monolith, NOT microservices)
- **Database:** Supabase (PostgreSQL + Auth + Realtime + Row Level Security)
- **AI:** Groq API with Llama 3.3 70B (free tier)
- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + next-intl (Thai/English i18n)
- **Hosting:** Vercel (frontend) + Render (backend) — both free tier

## Project structure
```
dormmatch/
├── backend/src/
│   ├── app.ts                    ← Express entry point (already built)
│   ├── lib/supabase.ts           ← Supabase client (already built)
│   ├── lib/groq.ts               ← Groq AI client (already built)
│   ├── middleware/auth.ts        ← JWT + role auth (already built)
│   ├── middleware/errorHandler.ts ← Error handler (already built)
│   └── modules/
│       ├── auth/routes.ts        ← Register, login, me (already built — use as pattern)
│       ├── buildings/            ← TODO
│       ├── rooms/                ← TODO
│       ├── applications/         ← TODO
│       ├── tenancies/            ← TODO
│       ├── billing/              ← TODO
│       ├── maintenance/          ← TODO
│       ├── housekeeping/         ← TODO
│       ├── announcements/        ← TODO
│       ├── ratings/              ← TODO
│       ├── expenses/             ← TODO
│       └── ai/                   ← TODO
├── frontend/                     ← Next.js app
├── database/schema.sql           ← All 14 tables (already created in Supabase)
```

## Coding patterns — follow these exactly

### Module structure
Every module follows the same pattern as `modules/auth/routes.ts`:
```
modules/{name}/
  └── routes.ts    ← Express router with all endpoints for this domain
```

For larger modules, split into:
```
modules/{name}/
  ├── routes.ts      ← route definitions only
  ├── controller.ts  ← request handling, validation
  └── service.ts     ← business logic, database queries
```

### Database access
- Use `supabaseAdmin` from `lib/supabase.ts` for ALL server-side operations
- Do NOT use `createUserClient(token)` — the backend issues its own JWTs, not Supabase session tokens, so RLS-scoped queries via the user client will not work in this project
- All queries use the Supabase JS client, NOT raw SQL
- Example:
```typescript
const { data, error } = await supabaseAdmin
  .from("buildings")
  .select("*")
  .eq("owner_id", req.user!.id);
```

### Validation
- Use Zod for all request body validation
- Define schemas at the top of the route file
- Parse with `schema.parse(req.body)` inside try/catch

### Auth & authorization
- Use `authenticate` middleware for routes that need a logged-in user
- Use `authorize("owner")` or `authorize("owner", "platform_admin")` for role-restricted routes
- Access user info via `req.user!.id` and `req.user!.role`

### Error handling
- Throw errors normally — the global errorHandler catches them
- For Zod errors, return 400 with details
- For auth errors, return 401 or 403

### Route registration
After building a module, uncomment its line in `app.ts`:
```typescript
app.use("/api/buildings", buildingRoutes);
```

## 3 user roles
| Role | Can do |
|------|--------|
| platform_admin | See all data, approve owner registrations |
| owner | Manage own buildings/rooms/tenants, billing, maintenance |
| tenant | Browse all rooms, apply, pay rent, submit maintenance |

## Database — 14 tables
Schema is already in Supabase. Key tables and their relationships:
- `users` → has role (platform_admin, owner, tenant)
- `buildings` → belongs to owner (owner_id → users.id)
- `rooms` → belongs to building (building_id → buildings.id)
- `tenancies` → links tenant to room (tenant_id → users.id, room_id → rooms.id)
- `applications` → tenant applies for room (before becoming tenancy)
- `meter_readings` → monthly water/electricity readings per room
- `invoices` → monthly bill linked to tenancy, includes rent + utilities breakdown
- `maintenance_requests` → tenant submits, owner manages
- `cleaning_tasks` → auto-created on checkout
- `announcements` → owner posts to building tenants
- `building_ratings` → tenant reviews after move-out
- `expenses` → owner logs building costs
- `notifications` → in-app notification log
- `ai_reports` → cached daily AI analysis per building

## JSONB field formats
- `buildings.facilities` — free-form string array, e.g. `["WiFi", "Parking", "CCTV", "Pool"]`
- `buildings.photo_urls` / `rooms.photo_urls` / `maintenance_requests.photo_urls` / `cleaning_tasks.photo_urls` — string arrays of URLs. The API accepts URLs as strings; file upload to storage is handled by the frontend.
- `cleaning_tasks.checklist` — array of objects, e.g. `[{ "item": "Mop floor", "done": false }]`

## Row Level Security rules
- Owner can ONLY see/modify their own buildings and related data
- Tenant can browse ALL rooms (public) but only see their own invoices/maintenance
- RLS is enforced at the database level — do NOT rely on API-only filtering

## Critical business rules
1. **Meter reading → billing (two separate steps):**
   - Step A — Owner enters meter readings room by room (saved to `meter_readings` table). Formula: `electricity_cost = (current - previous) × building.electricity_rate`, same for water.
   - Step B — Owner clicks "Generate invoices". System shows a confirmation screen:
     - Rooms ready to bill (have meter readings for this month) — full cost breakdown shown
     - Rooms with missing readings — highlighted as warnings with room numbers
     - Vacant rooms — automatically excluded, shown as "ห้องว่าง"
   - Owner confirms → invoices created only for rooms with complete meter data. Rooms with missing readings are skipped; owner can enter readings later and generate those individually.
   - Invoice amount = rent + electricity_cost + water_cost + other_charges.
   - `meter_readings` and `invoices` are separate tables with no direct foreign key between them.
2. **Invoice status flow:** unpaid → pending_verification (tenant uploads slip) → paid (owner verifies). Overdue is checked on read: when fetching invoices, if status = 'unpaid' AND due_date < today, update status to 'overdue' in the same operation. No scheduled job needed.
3. **Room status is a stored column.** The API must update it explicitly. Valid values and rules:
   - `available` — no active tenancy; set when tenancy ends (checkout)
   - `occupied` — active tenancy exists; set when tenancy is created or application is approved
   - `maintenance` — room is empty and needs work before re-listing; owner sets this manually. If a room is `occupied` and has a maintenance request, status stays `occupied` — do NOT change it to `maintenance`
   - `unavailable` — owner manually takes the room offline (renovation, personal use, etc.); owner sets it and resets it manually
   Update room status explicitly at these points: tenancy created → `occupied`; tenancy ended → `available`; owner manually sets → `maintenance` or `unavailable`.
4. **Application → tenancy:** When owner approves an application: (1) create a tenancy record, (2) set room status to `occupied`, (3) auto-reject all other `pending` applications for the same `room_id`.
5. **Checkout triggers cleaning:** When tenancy ends, auto-create a cleaning_task for that room.
6. **True cost estimate:** GET /api/rooms/:id/cost-estimate queries up to the last 6 months of `meter_readings` for the room and averages the monthly electricity and water cost. Use however many months of data exist — 2 months → average 2 months; 0 months → return `{ estimate: null, message: "No meter data available yet" }`. Never return an error for missing data.

## Things to NOT build
- Roommate matching / compatibility scoring (removed — Thai dorms rent whole rooms to one tenant)
- Real PromptPay payment integration (demo uses mock QR)
- Real LINE Notify integration (demo uses in-app notifications only)
- POS / mini-mart system
- CRM / loyalty points
- Multi-language i18n (set up the structure but English-only text is fine for now)

## Build order (if asked to build a specific module)
1. buildings (CRUD, owner-scoped)
2. rooms (CRUD, scoped to owner's buildings, public browse)
3. applications (tenant applies, owner approves/rejects → creates tenancy)
4. tenancies (check-in, check-out, walk-in registration)
5. billing (meter readings, invoice generation, slip upload, verification)
6. maintenance (submit, update status, resolve)
7. housekeeping (cleaning tasks, checklist, photo upload)
8. announcements (create, list by building)
9. expenses (log costs, profit report)
10. ratings (building reviews)
11. ai (fetch cached report, endpoint to trigger analysis)

## When building frontend
- Use shadcn/ui components (Button, Card, Input, Table, Badge, Dialog)
- Use Tailwind utility classes, no custom CSS files
- Thai text for all UI labels (store in /messages/th.json)
- All pages must be responsive (mobile-friendly)
- Use the App Router (/app directory) not Pages Router
- Protected routes check auth and redirect to /login if not authenticated

## Build progress tracking
- A BUILD_PROGRESS.md file exists in the project root
- Before starting any task, read BUILD_PROGRESS.md to see which step you're on
- After completing a step, update BUILD_PROGRESS.md: change [ ] to [x] and add a one-line summary of what was built
- Always tell me what you just finished and what the next step is before proceeding
- Build ONE step at a time — never skip or combine steps
