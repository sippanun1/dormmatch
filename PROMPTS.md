# DormMatch — Claude Code Prompt Cheat Sheet
### Copy-paste these prompts into Claude Code in order

---

## Phase 0: Setup

### Set up the Next.js frontend
```
Create a Next.js 14 app in the /frontend directory with App Router, TypeScript, and Tailwind CSS. Install shadcn/ui and next-intl. Set up the basic layout with a sidebar navigation component. Create a /messages/th.json file with basic Thai labels for the app (dashboard, rooms, tenants, billing, maintenance, announcements). Create an .env.example with NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
```

---

## Phase 1: Core

### Build the buildings module
```
Build the buildings module following the pattern in modules/auth/routes.ts. Endpoints needed:
- GET /api/buildings (owner: returns their buildings only, tenant: returns all buildings for browsing)
- GET /api/buildings/:id (public: returns building with room count and avg rating)
- POST /api/buildings (owner only: create building with name, address, description, facilities, electricity_rate, water_rate, photo_urls, promptpay_id)
- PATCH /api/buildings/:id (owner only: update their own building)
Use Zod for validation. Register the routes in app.ts.
```

### Build the rooms module
```
Build the rooms module. Endpoints:
- GET /api/rooms (public: list all available rooms across all buildings, supports query filters: ?building_id, ?min_price, ?max_price, ?has_ac, ?floor)
- GET /api/rooms/:id (public: room detail with building info joined)
- GET /api/rooms/:id/cost-estimate (public: query meter_readings for this room from the last 6 months, calculate average monthly electricity and water cost, return estimated total monthly cost)
- POST /api/rooms (owner only: add room to their building)
- PATCH /api/rooms/:id (owner only: update their room)
Register in app.ts.
```

### Build the applications module
```
Build the applications module. Endpoints:
- POST /api/applications (tenant only: apply for a room, body: room_id, message)
- GET /api/applications (owner: see applications for their rooms. tenant: see their own applications)
- PATCH /api/applications/:id (owner only: approve or reject. When approving: create a tenancy record in tenancies table, update room status to 'occupied', set application status to 'approved')
Register in app.ts.
```

### Build the tenancies module
```
Build the tenancies module. Endpoints:
- GET /api/tenancies (owner: list active tenancies in their buildings. tenant: their own tenancy)
- POST /api/tenancies/walk-in (owner only: register a walk-in tenant manually. Creates a user account with role 'tenant', creates tenancy, updates room status to 'occupied'. Body: name, email, phone, room_id, check_in_date)
- PATCH /api/tenancies/:id/checkout (owner only: end tenancy. Set is_active=false, set check_out_date, update room status to 'available', create a cleaning_task automatically for that room)
Register in app.ts.
```

### Build the owner dashboard frontend
```
Build the owner dashboard page at /app/dashboard/page.tsx. It should show:
1. Four metric cards in a row: Occupancy % (active tenancies / total rooms), Revenue this month (sum of paid invoices), Unpaid count (unpaid/overdue invoices), Open maintenance count
2. A color-coded floor plan grid showing rooms by floor (green=available, blue=occupied, yellow=overdue, orange=maintenance, gray=unavailable). Clicking a room shows its details in a side panel.
3. A "Pending actions" list showing: new applications, overdue payments, and open maintenance requests with timestamps.
4. An AI insight card at the bottom that fetches the latest ai_reports record for this building.
Fetch all data from the backend API using the owner's JWT token. Use shadcn/ui Card, Badge components. All text in Thai.
```

### Build the marketplace browse frontend
```
Build the public room browsing page at /app/rooms/page.tsx. It should show:
1. A search bar and filter buttons (price ranges, AC/fan, available only)
2. A 2-column grid of room cards, each showing: building name, room number, amenities, size, monthly price, availability badge
3. Clicking a card goes to /app/rooms/[id]/page.tsx which shows: photo area, room details, the true cost estimate section (fetched from /api/rooms/:id/cost-estimate showing rent + avg electricity + avg water = estimated total), deposit amount, minimum contract, amenities grid, building reviews, and an "Apply" button.
All text in Thai. Use shadcn/ui components.
```

---

## Phase 2: Operations

### Build the billing module
```
Build the billing module — this is the most important feature. Endpoints:
- POST /api/billing/meter-readings (owner only: submit meter readings for a room. Body: room_id, billing_month, electricity_previous, electricity_current, water_previous, water_current. Calculate costs using the building's electricity_rate and water_rate.)
- POST /api/billing/generate (owner only: generate invoices for all active tenancies in a building. For each tenancy: get the meter reading for this month, calculate rent + electricity_cost + water_cost = amount, create invoice with status 'unpaid' and due_date = 1st of next month)
- GET /api/billing/invoices (owner: their building's invoices. tenant: their own invoices. Support ?status filter and ?billing_month filter)
- PATCH /api/billing/invoices/:id/upload-slip (tenant only: upload payment slip URL, set status to 'pending_verification')
- PATCH /api/billing/invoices/:id/verify (owner only: verify payment, set status to 'paid', set paid_at and verified_by)
Register in app.ts.
```

### Build the billing frontend
```
Build the billing page at /app/billing/page.tsx for owners. It should show:
1. Three summary cards: Total expected, Collected, Outstanding
2. A meter readings table where the owner can input old/new readings for electricity and water per room. Cost auto-calculates as they type (units × rate). Vacant rooms are grayed out.
3. A "Generate all bills" button that calls POST /api/billing/generate
4. Below: invoice list showing room, tenant, amount, breakdown, status badge, and verify button for pending_verification invoices.
For tenants at /app/my-room/page.tsx: show their current bill with breakdown, a mock QR code image, an "Upload slip" button, and payment history table. All text in Thai.
```

### Build maintenance + housekeeping
```
Build the maintenance module. Endpoints:
- POST /api/maintenance (tenant only: submit request with category, description, photo_urls)
- GET /api/maintenance (owner: their buildings' requests. tenant: their own. Support ?status filter)
- PATCH /api/maintenance/:id (owner only: update status to 'in_progress' or 'resolved', add resolution_notes)
And the housekeeping module:
- GET /api/housekeeping (owner: cleaning tasks for their buildings. Support ?status filter)
- PATCH /api/housekeeping/:id (update status, add checklist progress, photo_urls)
Build the frontend pages: /app/maintenance/page.tsx (owner: card list with priority badges and status actions) and /app/housekeeping/page.tsx (mobile-optimized checklist view with photo upload and mark done button). Register both in app.ts.
```

### Build announcements + expenses
```
Build announcements module (POST /api/announcements for owner, GET /api/announcements?building_id=X for tenants) and expenses module (POST /api/expenses for owner to log costs, GET /api/expenses for listing, GET /api/reports/profit?building_id=X&month=Y that returns total revenue minus total expenses).
Build frontend: /app/announcements/page.tsx with draft composer and history list. Update the owner dashboard to show net profit (revenue - expenses) in the metric cards.
Register both in app.ts.
```

---

## Phase 3: Polish

### Build the AI daily report
```
Build the AI module. Endpoint:
- GET /api/ai/report?building_id=X (returns latest cached report from ai_reports table)
- POST /api/ai/generate?building_id=X (manually trigger a report: query last 30 days of maintenance_requests, invoices, expenses, and tenancies for the building. Send the data to Groq using lib/groq.ts with this system prompt: "You are an AI assistant for Thai dormitory owners. Analyze this building data and write 3-5 actionable insights in Thai. Focus on: recurring maintenance issues that suggest equipment replacement, overdue payment patterns, occupancy trends, and cost optimization opportunities. Be specific with room numbers and amounts." Save the result to ai_reports table.)
Register in app.ts.
```

### Seed demo data
```
Create a seed script at database/seed.sql that inserts realistic Thai demo data:
- 2 building owners with Thai names
- 3 buildings near Thai universities (use real-sounding names and addresses)
- 15-30 rooms per building with prices ฿2,000-5,000
- 20+ tenants with Thai names and varied payment statuses
- 6 months of meter readings for occupied rooms (realistic electricity: 50-150 units, water: 8-20 units per month)
- 10+ invoices in various statuses (paid, unpaid, overdue, pending_verification)
- 5-8 maintenance requests in various statuses and categories
- 3-4 building reviews from past tenants
- 2-3 expense records per building
Use uuid_generate_v4() for all IDs. All text content in Thai.
```

---

## Tips for Claude Code

- Always read CLAUDE.md first — it has the full project context
- Build one module at a time, test it, then move to the next
- Follow the auth/routes.ts pattern exactly for every new module
- After building a backend module, uncomment its route in app.ts
- Use `npm run dev` to test — the tsx watcher auto-reloads
- When building frontend pages, fetch data from the backend API, not directly from Supabase
