# DormMatch V3 — Complete Technical Specification + UI/UX Design
### ระบบบริหารจัดการหอพัก Marketplace พร้อม AI วิเคราะห์ข้อมูล
**Version 3.0 · July 2026**

---

## Change log from V2

| What changed | Reason |
|---|---|
| Removed: AI roommate matching (questionnaire, algorithm, compatibility scores) | Thai private dorms rent whole rooms to one tenant — not shared rooms assigned by the platform. Feature designed for wrong market (US college housing, not Thai หอพักเอกชน). |
| Added: True cost estimate on room detail | Shows estimated monthly total (rent + average utilities) based on 6-month meter history. Answers the #1 Thai renter question: "จริงๆ แล้วเดือนละเท่าไหร่?" No competitor does this. |
| Added: Deposit + minimum contract info on room detail | Standard Thai rental questions shown upfront. |
| Added: LINE contact button on room detail | Thai renters contact owners via LINE, not email. |
| Added: Past tenant reviews on room detail | Builds trust for new renters browsing the marketplace. |
| Removed: roommate_preferences table, compatibility_scores table | No longer needed without matching feature. |
| Updated: Build phases — Phase 2 is now Operations (was Matching) | Simplified build order. |
| Updated: All UI/UX screens reflect Thai dorm patterns | Informed by Horganice app design and Thai user expectations. |

**Tables: 18 → 16** (removed roommate_preferences, compatibility_scores)
**Build time: 6 weeks → 5 weeks** (removed matching phase)
**Monthly cost: still $0**

---

## 1. Project overview

DormMatch is a free, multi-tenant marketplace platform where Thai dormitory building owners list their rooms and tenants browse, compare true monthly costs, and apply — with AI-powered daily building insights for owners.

**Problem:** Thai dorm owners manage buildings using Excel, LINE groups, and paper receipts. Tenants can't compare total costs across dorms (listing sites only show base rent). The dominant Thai competitor (Horganice) is a single-tenant management tool — no marketplace, no cross-building comparison.

**Differentiators vs Horganice:**
- Marketplace: multiple owners on one platform, tenants browse across all buildings
- True cost estimate: shows average monthly total (rent + utilities) based on real meter data
- AI daily insights: predictive maintenance, payment risk alerts
- Free: $0/month on free-tier infrastructure

---

## 2. User roles

| Role | What they see | What they do |
|---|---|---|
| Platform Admin | All buildings, all owners, all data | Approve owner registrations, monitor platform health |
| Building Owner | Only their own buildings and tenants | Manage rooms, billing, maintenance, announcements. Can register walk-in tenants. |
| Tenant | Public room listings + their own room/bills | Browse rooms, apply, pay rent, submit maintenance, see announcements |

---

## 3. Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS + shadcn/ui + next-intl (Thai/English i18n) |
| Backend | Node.js + Express.js + TypeScript (modular monolith) |
| Database | PostgreSQL via Supabase (Auth + Realtime + RLS) |
| AI | Groq API free tier (Llama 3.3 70B) |
| Notifications | LINE Notify (primary) + Resend email (fallback) |
| Payments | Mock QR for demo, real PromptPay integration when customer commits |
| Automation | n8n Cloud free tier (4 workflows) |
| Frontend hosting | Vercel Hobby (free, no sleep) |
| Backend hosting | Render Free (1 service, pinged by UptimeRobot) |
| Monitoring | UptimeRobot (free) |

---

## 4. Database schema (V3 — 16 tables)

```dbml
Enum user_role {
  platform_admin
  owner
  tenant
}

Enum room_status {
  available
  occupied
  maintenance
  unavailable
}

Enum application_status {
  pending
  approved
  rejected
  cancelled
}

Enum invoice_status {
  unpaid
  pending_verification
  paid
  overdue
}

Enum maintenance_status {
  submitted
  in_progress
  resolved
}

Enum maintenance_priority {
  low
  medium
  high
  urgent
}

Enum cleaning_status {
  pending
  in_progress
  completed
}

Table users {
  id uuid [pk]
  name varchar [not null]
  email varchar [unique, not null]
  phone varchar
  role user_role [not null]
  line_user_id varchar
  created_at timestamp [default: `now()`]
}

Table buildings {
  id uuid [pk]
  owner_id uuid [ref: > users.id, not null]
  name varchar [not null]
  address text [not null]
  description text
  facilities text [note: 'JSON: parking, laundry, wifi, security, gym']
  photo_urls text [note: 'JSON array']
  electricity_rate decimal(6,2) [default: 8.00]
  water_rate decimal(6,2) [default: 18.00]
  promptpay_id varchar
  promptpay_name varchar
  line_notify_token varchar
  created_at timestamp [default: `now()`]
}

Table rooms {
  id uuid [pk]
  building_id uuid [ref: > buildings.id, not null]
  room_number varchar [not null]
  floor int [not null]
  size_sqm decimal(6,2)
  has_ac boolean [default: false]
  has_furniture boolean [default: true]
  monthly_price decimal(10,2) [not null]
  deposit_months int [default: 2]
  min_contract_months int [default: 6]
  status room_status [not null, default: 'available']
  photo_urls text [note: 'JSON array']
  created_at timestamp [default: `now()`]
}

Table tenancies {
  id uuid [pk]
  room_id uuid [ref: > rooms.id, not null]
  tenant_id uuid [ref: > users.id, not null]
  check_in_date date [not null]
  check_out_date date
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
}

Table applications {
  id uuid [pk]
  room_id uuid [ref: > rooms.id, not null]
  tenant_id uuid [ref: > users.id, not null]
  status application_status [not null, default: 'pending']
  message text
  applied_at timestamp [default: `now()`]
  reviewed_at timestamp
}

Table meter_readings {
  id uuid [pk]
  room_id uuid [ref: > rooms.id, not null]
  billing_month date [not null]
  electricity_previous decimal(10,2) [not null]
  electricity_current decimal(10,2) [not null]
  water_previous decimal(10,2) [not null]
  water_current decimal(10,2) [not null]
  recorded_by uuid [ref: > users.id]
  created_at timestamp [default: `now()`]
}

Table invoices {
  id uuid [pk]
  tenancy_id uuid [ref: > tenancies.id, not null]
  rent_amount decimal(10,2) [not null]
  electricity_cost decimal(10,2) [default: 0]
  water_cost decimal(10,2) [default: 0]
  other_charges decimal(10,2) [default: 0]
  amount decimal(10,2) [not null]
  due_date date [not null]
  status invoice_status [not null, default: 'unpaid']
  billing_month date [not null]
  payment_slip_url text
  verified_by uuid [ref: > users.id]
  paid_at timestamp
  created_at timestamp [default: `now()`]
}

Table maintenance_requests {
  id uuid [pk]
  room_id uuid [ref: > rooms.id, not null]
  submitted_by uuid [ref: > users.id, not null]
  category varchar [not null, note: 'plumbing, electrical, ac, furniture, other']
  description text [not null]
  photo_urls text
  priority maintenance_priority [not null, default: 'medium']
  status maintenance_status [not null, default: 'submitted']
  resolution_notes text
  submitted_at timestamp [default: `now()`]
  resolved_at timestamp
}

Table cleaning_tasks {
  id uuid [pk]
  room_id uuid [ref: > rooms.id, not null]
  assigned_to uuid [ref: > users.id]
  status cleaning_status [not null, default: 'pending']
  checklist text [note: 'JSON array']
  photo_urls text
  notes text
  created_at timestamp [default: `now()`]
  completed_at timestamp
}

Table announcements {
  id uuid [pk]
  building_id uuid [ref: > buildings.id, not null]
  posted_by uuid [ref: > users.id, not null]
  title varchar [not null]
  content text [not null]
  target_floor int [note: 'null = all floors']
  posted_at timestamp [default: `now()`]
}

Table building_ratings {
  id uuid [pk]
  building_id uuid [ref: > buildings.id, not null]
  tenant_id uuid [ref: > users.id, not null]
  rating int [not null, note: '1-5']
  comment text
  created_at timestamp [default: `now()`]
}

Table expenses {
  id uuid [pk]
  building_id uuid [ref: > buildings.id, not null]
  category varchar [not null, note: 'salary, utilities, maintenance, supplies, insurance, other']
  description text
  amount decimal(10,2) [not null]
  expense_date date [not null]
  receipt_url text
  recorded_by uuid [ref: > users.id]
  created_at timestamp [default: `now()`]
}

Table notifications {
  id uuid [pk]
  user_id uuid [ref: > users.id, not null]
  type varchar [not null, note: 'rent_reminder, maintenance_update, announcement, application_status']
  channel varchar [not null, note: 'line, email, in_app']
  title varchar [not null]
  message text [not null]
  is_read boolean [default: false]
  sent_at timestamp [default: `now()`]
}

Table ai_reports {
  id uuid [pk]
  building_id uuid [ref: > buildings.id, not null]
  report_date date [not null]
  content text [note: 'plain-language AI summary in Thai']
  maintenance_predictions text [note: 'JSON']
  occupancy_insights text [note: 'JSON']
  created_at timestamp [default: `now()`]
}
```

---

## 5. True cost estimate feature (replaces roommate matching)

### What it does
When a tenant views a room on the marketplace, instead of just seeing the base rent (฿3,200), they see the estimated total monthly cost including average utilities — calculated from the room's actual 6-month meter reading history.

### How it works
```
1. System queries meter_readings for this room, last 6 months
2. Calculates average electricity units/month and average water units/month
3. Multiplies by the building's rate per unit
4. Displays: rent + avg electricity + avg water + common fees = estimated total
5. Shows disclaimer: "ค่าน้ำ-ไฟคิดตามมิเตอร์จริง ตัวเลขนี้เป็นค่าเฉลี่ย 6 เดือนย้อนหลัง"
```

### Why this is better than roommate matching as a differentiator
- Every tenant cares about total cost — only some care about roommates
- Uses data the system already collects (meter readings) — no new input needed
- No competitor shows this: RentHub shows rent only, Horganice doesn't have a marketplace
- Works for 100% of rooms, not just shared rooms with two quiz-takers

### API endpoint
- GET /api/rooms/:id/cost-estimate — returns average utility costs based on 6-month history

---

## 6. UI/UX design — all screens (Style A: Clean Minimal)

Design principles applied across all screens:
- Thai language primary (ภาษาไทย), English secondary
- Cost/billing information given highest visual prominence (this is what Thai dorm users care about most)
- LINE integration visible where relevant (contact buttons, notification indicators)
- Minimal decoration — content density without clutter
- Mobile-responsive from the start (Tailwind breakpoints)

---

### Screen 1: Owner Dashboard
**Route:** /dashboard
**Role:** Owner

**Layout:**
- Top: building name + "Add tenant" and "Create bills" buttons
- Row of 4 metric cards: Occupancy (%), Revenue (฿), Unpaid count, Maintenance count
- Floor plan grid: color-coded rooms by floor
  - Green = available
  - Blue = occupied (paid)
  - Yellow = occupied (overdue)
  - Orange = maintenance ticket open
  - Gray = offline/unavailable
- Click any room → detail panel slides in
- Pending actions list: applications, overdue payments, maintenance tickets — each with timestamp
- AI insight card at bottom: today's analysis from Groq (e.g. "แอร์ห้อง 312 ซ่อม 3 ครั้งใน 4 เดือน แนะนำเปลี่ยนเครื่อง")

---

### Screen 2: Room Management
**Route:** /rooms
**Role:** Owner

**Layout:**
- Top: building name + "Add room" button
- Filter tabs: All (30), Available (4), Occupied (23), Overdue (2), Maintenance (1)
- Floor plan grid (same as dashboard but larger, full width)
- Below: room list table with columns: Room, Tenant name, Type, Price, Status, View button
- Click a room in floor plan or table → detail panel expands inline showing:
  - Room specs (floor, size, price, amenities, photos)
  - Current tenant info (name, phone, check-in date, payment status)
  - Edit room button

---

### Screen 3: Tenant Management
**Route:** /tenants
**Role:** Owner

**Layout:**
- Top: "Tenants" heading + search bar + "Add tenant" button (for walk-in registration)
- Filter tabs: All (26), Active (23), Overdue (3), Pending applications (2)
- Tenant list table with columns: Name (with avatar initials + phone), Room, Check-in date, Rent amount, Payment status, View button
- "Pending" status rows show "Review" button instead of "View"
- Click View → tenant detail page with full payment history, maintenance history, tenancy dates

---

### Screen 4: Billing & Meter Reading ⭐
**Route:** /billing
**Role:** Owner

**Layout:**
- Top: "Billing — July 2026" heading + "Generate all bills" button (primary/accent color)
- 3 summary cards: Total expected (฿), Collected (฿), Outstanding (฿)
- Meter readings table: Room | Tenant | ⚡ Old | ⚡ New | ⚡ Cost | 💧 Old | 💧 New | 💧 Cost
  - Each old/new cell is an editable input field
  - Cost auto-calculates as owner types (new - old × rate)
  - Vacant rooms shown but grayed out with no inputs
- Below table: bill preview panel showing selected room's breakdown:
  - ค่าเช่า ฿3,200
  - ค่าไฟ (139 หน่วย × ฿8) = ฿1,112
  - ค่าน้ำ (13 หน่วย × ฿18) = ฿234
  - **รวม ฿4,146**
- "Generate all bills" sends invoices to all tenants via LINE with mock QR code

---

### Screen 5: Maintenance Requests
**Route:** /maintenance
**Role:** Owner

**Layout:**
- Top: "Maintenance" heading
- Filter tabs: All (5), Open (3), In progress (1), Resolved (1)
- Card-based list (not table — cards allow photos and longer descriptions):
  - Each card has: left color border indicating priority (red=urgent, orange=in-progress, blue=open, green=resolved)
  - Priority badge, room number, description title
  - Thai description text
  - Photo thumbnails (if submitted)
  - Action buttons: Accept / Mark resolved
  - AI warning if room has recurring same-category repairs (e.g. "ซ่อมแอร์ห้องนี้ 3 ครั้งใน 4 เดือน")
- Resolved cards shown at bottom with lower opacity + star rating from tenant

---

### Screen 6: Announcements
**Route:** /announcements
**Role:** Owner

**Layout:**
- Top: "Announcements" heading + "New announcement" button
- Draft composer card (shown when creating):
  - Title input field
  - Content textarea
  - Target selector buttons: All floors / Floor 1 / Floor 2 / Floor 3
  - "Post & send via LINE" primary button
- Below: list of past announcements, each showing:
  - Title, content preview, posted date
  - Target info ("All floors" or "Floor 2 only")
  - "Sent via LINE" indicator

---

### Screen 7: Marketplace Browse
**Route:** /rooms/browse (public)
**Role:** Tenant (or unauthenticated visitor)

**Layout:**
- Top: "Find your room" heading + room count
- Search bar: "Search by location, building name..."
- Filter button row: All, ฿1,500–3,000, ฿3,000–5,000, Fan, AC, with available rooms count per filter
- 2-column grid of room cards, each showing:
  - Photo placeholder (carousel in future)
  - Availability badge (top-right: "ว่าง" green or "เต็ม" red)
  - Building name
  - Room details: room number, type, amenities, size
  - Monthly price (base rent only in card view)
  - **No compatibility score** (removed)
- Click card → goes to Room Detail (Screen 8)

---

### Screen 8: Room Detail ⭐ (REDESIGNED)
**Route:** /rooms/:id (public)
**Role:** Tenant

**Layout (top to bottom):**
1. Photo gallery with image counter (1/6 รูป)
2. Building name + room number + type + size + floor
3. Distance to nearest university
4. Availability badge

5. **ค่าใช้จ่ายโดยประมาณต่อเดือน** (True cost estimate — the key differentiator):
   - ค่าเช่า: ฿3,200
   - ค่าไฟ (฿8/หน่วย · เฉลี่ย ~90 หน่วย): ~฿720
   - ค่าน้ำ (฿18/หน่วย · เฉลี่ย ~12 หน่วย): ~฿216
   - ค่าส่วนกลาง / อินเทอร์เน็ต: ฿200
   - **รวมโดยประมาณ: ~฿4,336/เดือน**
   - Disclaimer: "ค่าน้ำ-ไฟคิดตามมิเตอร์จริง ตัวเลขนี้เป็นค่าเฉลี่ย 6 เดือนย้อนหลัง"

6. Deposit and minimum contract: ฿6,400 (2 เดือน) / สัญญาขั้นต่ำ 6 เดือน

7. Amenities grid: แอร์, WiFi ฟรี, เครื่องซักผ้า, รปภ. 24 ชม., etc.

8. Past tenant reviews: star rating + review text from building_ratings table

9. Action buttons: "สมัครเช่าห้องนี้" (primary) + LINE contact button + heart/favorite button

---

### Screen 9: Tenant Dashboard
**Route:** /my-room
**Role:** Tenant (after move-in)

**Layout:**
- Top: building name + room number + "Request move-out" button
- 2-column layout:
  - Left card: This month's bill
    - Total amount (฿4,146)
    - Breakdown: ค่าเช่า + ค่าไฟ + ค่าน้ำ
    - Due date badge
    - "Pay now" button → shows mock QR code + slip upload
  - Right card: Room info
    - Room specs (type, size, floor, amenities)
    - Check-in date
- Payment history table: Month, Amount, Status (paid/unpaid/overdue), Paid date
- Active maintenance requests list with status badges
- "Submit new maintenance request" button (full width)
- Announcements section: latest building announcements from owner

---

### Screen 10: Housekeeping (Staff/Owner mobile view)
**Route:** /housekeeping
**Role:** Owner or designated staff

**Layout (narrow, mobile-optimized — max 360px):**
- Top: "Today's tasks" heading + task count + user avatar
- Task cards stacked vertically:
  - Active task (expanded):
    - Room number + badge (Check-out / Scheduled)
    - Floor + room type + reason
    - Checklist with checkboxes:
      ☐ ทำความสะอาดห้องน้ำ
      ☐ เปลี่ยนผ้าปูที่นอน
      ☐ ถูพื้น
      ☐ ตรวจเฟอร์นิเจอร์
      ☐ เติมของใช้
    - "Take photo" button + "Mark done" button (primary)
  - Pending tasks (collapsed): room number + badge + chevron to expand
  - Completed tasks (bottom, lower opacity): room number + "Done" badge + completion time + photo count

---

## 7. API structure

```
src/
├── modules/
│   ├── auth/          ← login, register, RBAC
│   ├── buildings/     ← CRUD (owner-scoped via RLS)
│   ├── rooms/         ← CRUD + cost-estimate endpoint
│   ├── applications/  ← tenant applies, owner approves
│   ├── tenancies/     ← check-in, check-out
│   ├── billing/       ← meter readings, invoice generation, payment verification
│   ├── maintenance/   ← request submission, status tracking
│   ├── housekeeping/  ← cleaning task management
│   ├── announcements/ ← owner posts, tenant reads
│   ├── ratings/       ← building reviews after move-out
│   ├── expenses/      ← owner logs costs
│   └── ai/            ← daily report cache
├── middleware/
├── lib/
└── app.ts
```

### Key endpoints
- POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
- GET /api/buildings, POST /api/buildings, PATCH /api/buildings/:id
- GET /api/rooms, POST /api/rooms, GET /api/rooms/:id, GET /api/rooms/:id/cost-estimate
- POST /api/applications, GET /api/applications, PATCH /api/applications/:id
- POST /api/billing/meter-readings, POST /api/billing/generate, GET /api/billing/invoices, PATCH /api/billing/invoices/:id/verify
- POST /api/maintenance, GET /api/maintenance, PATCH /api/maintenance/:id
- GET /api/housekeeping, PATCH /api/housekeeping/:id
- POST /api/announcements, GET /api/announcements
- POST /api/expenses, GET /api/expenses, GET /api/reports/profit
- GET /api/ai/report

---

## 8. Build phases

| Phase | Scope | Duration |
|---|---|---|
| Phase 1 — Core | Auth + RBAC + RLS, buildings, rooms, tenant browse, applications, owner dashboard, i18n setup | 2 weeks |
| Phase 2 — Operations | Billing + meter reading, maintenance requests, housekeeping, announcements, expense tracking | 1.5 weeks |
| Phase 3 — Polish | True cost estimate, graduated LINE reminders (mock), room status grid, past tenant reviews, AI daily report via Groq cron, seed realistic Thai data | 1.5 weeks |

**Total: 5 weeks**

**Minimum viable target:** Phase 1 + Phase 2 = a deployable demo that shows the full billing cycle and marketplace. Phase 3 adds the differentiating features.

---

## 9. n8n workflows (4 of 5 free slots)

| # | Workflow | Trigger | What it does |
|---|---|---|---|
| 1 | Daily AI building health report | Cron midnight | Pulls 30-day data → Groq analysis → saves to ai_reports |
| 2 | Rent reminders | Cron 9AM daily | Checks invoices → sends LINE notifications at 7/3/1/0/-5 day marks |
| 3 | Supabase keep-alive | Cron every 5 days | Prevents free tier pause |
| 4 | Render keep-alive | Cron every 5 min | Prevents API sleep |

---

## 10. Row Level Security

```sql
-- Buildings: owners see only their own, tenants browse all
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own buildings" ON buildings
  FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Public building browse" ON buildings
  FOR SELECT USING (true);

-- Rooms: public read, owner-scoped write
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public room browse" ON rooms FOR SELECT USING (true);
CREATE POLICY "Owners manage own rooms" ON rooms FOR ALL USING (
  building_id IN (SELECT id FROM buildings WHERE owner_id = auth.uid())
);

-- Invoices: owner sees their tenants, tenant sees own
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner sees building invoices" ON invoices FOR ALL USING (
  tenancy_id IN (
    SELECT t.id FROM tenancies t
    JOIN rooms r ON t.room_id = r.id
    JOIN buildings b ON r.building_id = b.id
    WHERE b.owner_id = auth.uid()
  )
);
CREATE POLICY "Tenant sees own invoices" ON invoices FOR SELECT USING (
  tenancy_id IN (SELECT id FROM tenancies WHERE tenant_id = auth.uid())
);
```

---

## 11. Competitive positioning

| Feature | RentHub | Horganice | DormMatch |
|---|---|---|---|
| Room listings marketplace | ✅ (16K+ listings) | ❌ single-owner | ✅ multi-owner |
| True cost estimate (rent + avg utilities) | ❌ rent only | ❌ no marketplace | ✅ based on real meter data |
| Meter reading + auto-billing | ❌ | ✅ | ✅ |
| Payment tracking + slip verification | ❌ | ✅ | ✅ |
| Maintenance requests | ❌ | ✅ | ✅ |
| AI daily insights | ❌ | ❌ | ✅ Groq-powered |
| Housekeeping workflow | ❌ | ❌ | ✅ |
| Expense tracking + net profit | ❌ | ❌ | ✅ |
| Past tenant reviews | ❌ listing reviews only | ❌ | ✅ |
| LINE notifications | ❌ | ✅ | ✅ |
| Free for owners | ✅ basic listing | ❌ paid after trial | ✅ completely free |
| Thai language UI | ✅ | ✅ | ✅ |

---

## References

- Horganice: https://www.horganice.app/, Google Play, App Store
- RentHub: https://www.renthub.in.th/
- Thai dorm market: Mordor Intelligence residential report, educationfair.net enrollment data
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Groq free tier: https://groq.com/pricing
- LINE Notify: https://notify-bot.line.me/
