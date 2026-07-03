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
├── database/schema.sql           ← All 16 tables (already created in Supabase)
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
- Use `supabaseAdmin` from `lib/supabase.ts` for server-side operations
- Use `createUserClient(token)` when you need RLS-scoped queries
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

## Database — 16 tables
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

## Row Level Security rules
- Owner can ONLY see/modify their own buildings and related data
- Tenant can browse ALL rooms (public) but only see their own invoices/maintenance
- RLS is enforced at the database level — do NOT rely on API-only filtering

## Critical business rules
1. **Meter reading → billing:** Owner enters old/new meter readings. System calculates: electricity_cost = (new - old) × building.electricity_rate, same for water. Invoice amount = rent + electricity_cost + water_cost + other_charges.
2. **Invoice status flow:** unpaid → pending_verification (tenant uploads slip) → paid (owner verifies). If past due_date and still unpaid → overdue.
3. **Room status is derived:** available = no active tenancy; occupied = active tenancy exists; maintenance = open maintenance request.
4. **Application → tenancy:** When owner approves application, create a tenancy record and set room status to 'occupied'.
5. **Checkout triggers cleaning:** When tenancy ends, auto-create a cleaning_task for that room.
6. **True cost estimate:** GET /api/rooms/:id/cost-estimate queries last 6 months of meter_readings for the room, calculates average monthly electricity and water cost, returns estimate.

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
