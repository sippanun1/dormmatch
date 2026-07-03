import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../lib/supabase";
import { authenticate, authorize } from "../../middleware/auth";

const router = Router();

const walkInSchema = z.object({
  room_id: z.string().uuid("Invalid room ID"),
  tenant_id: z.string().uuid("Invalid tenant ID"),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

const checkoutSchema = z.object({
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
});

// POST /api/tenancies — walk-in registration (owner creates tenancy directly, no application)
router.post("/", authenticate, authorize("owner"), async (req: Request, res: Response) => {
  try {
    const body = walkInSchema.parse(req.body);

    // Verify the room belongs to the owner
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id, status, buildings(owner_id)")
      .eq("id", body.room_id)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const building = room.buildings as unknown as { owner_id: string } | null;
    if (!building || building.owner_id !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (room.status !== "available") {
      return res.status(409).json({ error: "Room is not available" });
    }

    // Verify tenant exists and has the tenant role
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("id", body.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return res.status(404).json({ error: "Tenant user not found" });
    }

    if (tenant.role !== "tenant") {
      return res.status(400).json({ error: "Specified user is not a tenant" });
    }

    // Create tenancy
    const { data: tenancy, error: tenancyError } = await supabaseAdmin
      .from("tenancies")
      .insert({
        room_id: body.room_id,
        tenant_id: body.tenant_id,
        check_in_date: body.check_in_date,
        is_active: true,
      })
      .select()
      .single();

    if (tenancyError) throw tenancyError;

    // Set room to occupied
    await supabaseAdmin
      .from("rooms")
      .update({ status: "occupied" })
      .eq("id", body.room_id);

    return res.status(201).json({ tenancy });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    throw error;
  }
});

// GET /api/tenancies — list tenancies scoped by role
router.get("/", authenticate, async (req: Request, res: Response) => {
  const { is_active } = req.query;
  const activeFilter = is_active === "true" ? true : is_active === "false" ? false : undefined;

  if (req.user!.role === "tenant") {
    let query = supabaseAdmin
      .from("tenancies")
      .select("*, rooms(id, room_number, floor, monthly_price, buildings(id, name, address))")
      .eq("tenant_id", req.user!.id);

    if (activeFilter !== undefined) query = query.eq("is_active", activeFilter);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ tenancies: data });
  }

  if (req.user!.role === "owner") {
    // Get all rooms in owner's buildings
    const { data: buildings } = await supabaseAdmin
      .from("buildings")
      .select("id")
      .eq("owner_id", req.user!.id);

    const buildingIds = (buildings ?? []).map((b: { id: string }) => b.id);
    if (buildingIds.length === 0) return res.json({ tenancies: [] });

    const { data: rooms } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .in("building_id", buildingIds);

    const roomIds = (rooms ?? []).map((r: { id: string }) => r.id);
    if (roomIds.length === 0) return res.json({ tenancies: [] });

    let query = supabaseAdmin
      .from("tenancies")
      .select("*, rooms(id, room_number, floor, buildings(id, name)), users!tenant_id(id, name, email, phone)")
      .in("room_id", roomIds);

    if (activeFilter !== undefined) query = query.eq("is_active", activeFilter);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ tenancies: data });
  }

  // platform_admin: all tenancies
  let query = supabaseAdmin
    .from("tenancies")
    .select("*, rooms(id, room_number, buildings(id, name)), users!tenant_id(id, name, email)");

  if (activeFilter !== undefined) query = query.eq("is_active", activeFilter);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return res.json({ tenancies: data });
});

// GET /api/tenancies/my — tenant's current active tenancy (must be before /:id)
router.get("/my", authenticate, authorize("tenant"), async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("tenancies")
    .select("*, rooms(id, room_number, floor, monthly_price, buildings(id, name, address, electricity_rate, water_rate, promptpay_id, promptpay_name))")
    .eq("tenant_id", req.user!.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return res.json({ tenancy: null, message: "No active tenancy" });
  }

  return res.json({ tenancy: data });
});

// GET /api/tenancies/:id — get one tenancy
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("tenancies")
    .select("*, rooms(id, room_number, floor, monthly_price, buildings(id, name, address, owner_id)), users!tenant_id(id, name, email, phone)")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Tenancy not found" });
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

  return res.json({ tenancy: data });
});

// PATCH /api/tenancies/:id/checkout — owner checks out a tenant
// Triggers: sets room to available + auto-creates cleaning_task
router.patch("/:id/checkout", authenticate, authorize("owner"), async (req: Request, res: Response) => {
  try {
    const body = checkoutSchema.parse(req.body);
    const checkOutDate = body.check_out_date ?? new Date().toISOString().split("T")[0];

    const { data: tenancy, error: tenancyError } = await supabaseAdmin
      .from("tenancies")
      .select("*, rooms(id, buildings(owner_id))")
      .eq("id", req.params.id)
      .single();

    if (tenancyError || !tenancy) {
      return res.status(404).json({ error: "Tenancy not found" });
    }

    if (!tenancy.is_active) {
      return res.status(409).json({ error: "Tenancy is already closed" });
    }

    const building = (tenancy.rooms as any)?.buildings;
    if (!building || building.owner_id !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const roomId = (tenancy.rooms as any).id;

    // 1. Close the tenancy
    await supabaseAdmin
      .from("tenancies")
      .update({ is_active: false, check_out_date: checkOutDate })
      .eq("id", req.params.id);

    // 2. Set room back to available
    await supabaseAdmin
      .from("rooms")
      .update({ status: "available" })
      .eq("id", roomId);

    // 3. Auto-create cleaning task for the vacated room
    await supabaseAdmin
      .from("cleaning_tasks")
      .insert({
        room_id: roomId,
        status: "pending",
        checklist: [],
        photo_urls: [],
      });

    return res.json({ message: "Checkout complete, cleaning task created" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    throw error;
  }
});

export default router;
