import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../lib/supabase";
import { authenticate, authorize } from "../../middleware/auth";

const router = Router();

const createApplicationSchema = z.object({
  room_id: z.string().uuid("Invalid room ID"),
  message: z.string().optional(),
});

const approveSchema = z.object({
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

// Returns all room IDs in the owner's buildings (used for scoped queries)
async function getOwnerRoomIds(ownerId: string): Promise<string[]> {
  const { data: buildings } = await supabaseAdmin
    .from("buildings")
    .select("id")
    .eq("owner_id", ownerId);

  if (!buildings?.length) return [];

  const { data: rooms } = await supabaseAdmin
    .from("rooms")
    .select("id")
    .in("building_id", buildings.map((b: { id: string }) => b.id));

  return (rooms ?? []).map((r: { id: string }) => r.id);
}

// POST /api/applications — tenant submits an application
router.post("/", authenticate, authorize("tenant"), async (req: Request, res: Response) => {
  try {
    const body = createApplicationSchema.parse(req.body);

    // Room must exist and be available
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id, status")
      .eq("id", body.room_id)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.status !== "available") {
      return res.status(409).json({ error: "Room is not available" });
    }

    // No duplicate pending applications from the same tenant for the same room
    const { data: existing } = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("room_id", body.room_id)
      .eq("tenant_id", req.user!.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "You already have a pending application for this room" });
    }

    const { data, error } = await supabaseAdmin
      .from("applications")
      .insert({
        room_id: body.room_id,
        tenant_id: req.user!.id,
        message: body.message ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ application: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    throw error;
  }
});

// GET /api/applications — list applications scoped by role
router.get("/", authenticate, async (req: Request, res: Response) => {
  const { status } = req.query;

  if (req.user!.role === "tenant") {
    let query = supabaseAdmin
      .from("applications")
      .select("*, rooms(id, room_number, floor, monthly_price, buildings(id, name, address))")
      .eq("tenant_id", req.user!.id);

    if (status) query = query.eq("status", status as string);

    const { data, error } = await query.order("applied_at", { ascending: false });
    if (error) throw error;
    return res.json({ applications: data });
  }

  if (req.user!.role === "owner") {
    const roomIds = await getOwnerRoomIds(req.user!.id);
    if (roomIds.length === 0) return res.json({ applications: [] });

    let query = supabaseAdmin
      .from("applications")
      .select("*, rooms(id, room_number, floor, buildings(id, name)), users!tenant_id(id, name, email, phone)")
      .in("room_id", roomIds);

    if (status) query = query.eq("status", status as string);

    const { data, error } = await query.order("applied_at", { ascending: false });
    if (error) throw error;
    return res.json({ applications: data });
  }

  // platform_admin sees all
  let query = supabaseAdmin
    .from("applications")
    .select("*, rooms(id, room_number, buildings(id, name)), users!tenant_id(id, name, email)");

  if (status) query = query.eq("status", status as string);

  const { data, error } = await query.order("applied_at", { ascending: false });
  if (error) throw error;
  return res.json({ applications: data });
});

// GET /api/applications/:id — get one application
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("*, rooms(id, room_number, floor, monthly_price, buildings(id, name, owner_id)), users!tenant_id(id, name, email, phone)")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Application not found" });
  }

  if (req.user!.role === "tenant" && data.tenant_id !== req.user!.id) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (req.user!.role === "owner") {
    const building = (data.rooms as any)?.buildings;
    if (!building || building.owner_id !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }
  }

  return res.json({ application: data });
});

// PATCH /api/applications/:id/approve — owner approves; creates tenancy, occupies room, auto-rejects others
router.patch("/:id/approve", authenticate, authorize("owner"), async (req: Request, res: Response) => {
  try {
    const { check_in_date } = approveSchema.parse(req.body);

    const { data: application, error: appError } = await supabaseAdmin
      .from("applications")
      .select("*, rooms(id, status, buildings(owner_id))")
      .eq("id", req.params.id)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.status !== "pending") {
      return res.status(409).json({ error: `Application is already ${application.status}` });
    }

    const building = (application.rooms as any)?.buildings;
    if (!building || building.owner_id !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const room = application.rooms as any;
    if (room.status !== "available") {
      return res.status(409).json({ error: "Room is no longer available" });
    }

    // 1. Create tenancy
    const { error: tenancyError } = await supabaseAdmin
      .from("tenancies")
      .insert({
        room_id: application.room_id,
        tenant_id: application.tenant_id,
        check_in_date,
        is_active: true,
      });

    if (tenancyError) throw tenancyError;

    // 2. Set room to occupied
    await supabaseAdmin
      .from("rooms")
      .update({ status: "occupied" })
      .eq("id", application.room_id);

    // 3. Approve this application
    await supabaseAdmin
      .from("applications")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", req.params.id);

    // 4. Auto-reject all other pending applications for this room
    await supabaseAdmin
      .from("applications")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("room_id", application.room_id)
      .eq("status", "pending")
      .neq("id", req.params.id);

    return res.json({ message: "Application approved, tenancy created" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    throw error;
  }
});

// PATCH /api/applications/:id/reject — owner rejects a pending application
router.patch("/:id/reject", authenticate, authorize("owner"), async (req: Request, res: Response) => {
  const { data: application, error } = await supabaseAdmin
    .from("applications")
    .select("id, status, room_id, rooms(buildings(owner_id))")
    .eq("id", req.params.id)
    .single();

  if (error || !application) {
    return res.status(404).json({ error: "Application not found" });
  }

  if (application.status !== "pending") {
    return res.status(409).json({ error: `Application is already ${application.status}` });
  }

  const building = (application.rooms as any)?.buildings;
  if (!building || building.owner_id !== req.user!.id) {
    return res.status(403).json({ error: "Access denied" });
  }

  await supabaseAdmin
    .from("applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", req.params.id);

  return res.json({ message: "Application rejected" });
});

// PATCH /api/applications/:id/cancel — tenant cancels their own pending application
router.patch("/:id/cancel", authenticate, authorize("tenant"), async (req: Request, res: Response) => {
  const { data: application, error } = await supabaseAdmin
    .from("applications")
    .select("id, status, tenant_id")
    .eq("id", req.params.id)
    .single();

  if (error || !application) {
    return res.status(404).json({ error: "Application not found" });
  }

  if (application.tenant_id !== req.user!.id) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (application.status !== "pending") {
    return res.status(409).json({ error: `Cannot cancel an application that is already ${application.status}` });
  }

  await supabaseAdmin
    .from("applications")
    .update({ status: "cancelled" })
    .eq("id", req.params.id);

  return res.json({ message: "Application cancelled" });
});

export default router;
