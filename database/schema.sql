-- ============================================
-- DormMatch V3 — Database Schema
-- PostgreSQL / Supabase
-- Paste this entire file into Supabase SQL Editor and run once
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('platform_admin', 'owner', 'tenant')),
  line_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BUILDINGS
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  facilities JSONB DEFAULT '[]',
  photo_urls JSONB DEFAULT '[]',
  electricity_rate NUMERIC(6,2) NOT NULL DEFAULT 8.00,
  water_rate NUMERIC(6,2) NOT NULL DEFAULT 18.00,
  promptpay_id TEXT,
  promptpay_name TEXT,
  line_notify_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ROOMS
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor INT NOT NULL,
  size_sqm NUMERIC(6,2),
  has_ac BOOLEAN DEFAULT false,
  has_furniture BOOLEAN DEFAULT true,
  monthly_price NUMERIC(10,2) NOT NULL,
  deposit_months INT NOT NULL DEFAULT 2,
  min_contract_months INT NOT NULL DEFAULT 6,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'unavailable')),
  photo_urls JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (building_id, room_number)
);

-- 4. TENANCIES
CREATE TABLE tenancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  tenant_id UUID NOT NULL REFERENCES users(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. APPLICATIONS
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  tenant_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  message TEXT,
  applied_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- 6. METER READINGS
CREATE TABLE meter_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  billing_month DATE NOT NULL,
  electricity_previous NUMERIC(10,2) NOT NULL,
  electricity_current NUMERIC(10,2) NOT NULL,
  water_previous NUMERIC(10,2) NOT NULL,
  water_current NUMERIC(10,2) NOT NULL,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (room_id, billing_month)
);

-- 7. INVOICES
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id),
  rent_amount NUMERIC(10,2) NOT NULL,
  electricity_cost NUMERIC(10,2) DEFAULT 0,
  water_cost NUMERIC(10,2) DEFAULT 0,
  other_charges NUMERIC(10,2) DEFAULT 0,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'pending_verification', 'paid', 'overdue')),
  billing_month DATE NOT NULL,
  payment_slip_url TEXT,
  verified_by UUID REFERENCES users(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. MAINTENANCE REQUESTS
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  submitted_by UUID NOT NULL REFERENCES users(id),
  category TEXT NOT NULL CHECK (category IN ('plumbing', 'electrical', 'ac', 'furniture', 'other')),
  description TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'resolved')),
  resolution_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 9. CLEANING TASKS
CREATE TABLE cleaning_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  checklist JSONB DEFAULT '[]',
  photo_urls JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 10. ANNOUNCEMENTS
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id),
  posted_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_floor INT,
  posted_at TIMESTAMPTZ DEFAULT now()
);

-- 11. BUILDING RATINGS
CREATE TABLE building_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id),
  tenant_id UUID NOT NULL REFERENCES users(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. EXPENSES
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id),
  category TEXT NOT NULL CHECK (category IN ('salary', 'utilities', 'maintenance', 'supplies', 'insurance', 'other')),
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('rent_reminder', 'maintenance_update', 'announcement', 'application_status')),
  channel TEXT NOT NULL CHECK (channel IN ('line', 'email', 'in_app')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- 14. AI REPORTS
CREATE TABLE ai_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id),
  report_date DATE NOT NULL,
  content TEXT,
  maintenance_predictions JSONB,
  occupancy_insights JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (building_id, report_date)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_buildings_owner ON buildings(owner_id);
CREATE INDEX idx_rooms_building ON rooms(building_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_tenancies_room ON tenancies(room_id);
CREATE INDEX idx_tenancies_tenant ON tenancies(tenant_id);
CREATE INDEX idx_tenancies_active ON tenancies(is_active);
CREATE INDEX idx_invoices_tenancy ON invoices(tenancy_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_meter_readings_room ON meter_readings(room_id);
CREATE INDEX idx_maintenance_room ON maintenance_requests(room_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_expenses_building ON expenses(building_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Buildings: owners see own, public can browse
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_manage_own_buildings" ON buildings
  FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "public_browse_buildings" ON buildings
  FOR SELECT USING (true);

-- Rooms: public read, owner-scoped write
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_browse_rooms" ON rooms
  FOR SELECT USING (true);
CREATE POLICY "owners_manage_own_rooms" ON rooms
  FOR ALL USING (
    building_id IN (SELECT id FROM buildings WHERE owner_id = auth.uid())
  );

-- Invoices: owner sees their tenants, tenant sees own
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_sees_building_invoices" ON invoices
  FOR ALL USING (
    tenancy_id IN (
      SELECT t.id FROM tenancies t
      JOIN rooms r ON t.room_id = r.id
      JOIN buildings b ON r.building_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  );
CREATE POLICY "tenant_sees_own_invoices" ON invoices
  FOR SELECT USING (
    tenancy_id IN (SELECT id FROM tenancies WHERE tenant_id = auth.uid())
  );

-- Maintenance: owner sees their buildings, tenant sees own
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_sees_building_maintenance" ON maintenance_requests
  FOR ALL USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN buildings b ON r.building_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  );
CREATE POLICY "tenant_sees_own_maintenance" ON maintenance_requests
  FOR SELECT USING (submitted_by = auth.uid());
CREATE POLICY "tenant_creates_maintenance" ON maintenance_requests
  FOR INSERT WITH CHECK (submitted_by = auth.uid());
