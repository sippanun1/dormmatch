import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../lib/supabase";
import { authenticate, authorize, optionalAuthenticate } from "../../middleware/auth";

const router = Router();

const createRoomSchema = z.object({
  building_id: z.string().uuid("Invalid building ID"),
  room_number: z.string().min(1, "Room number is required"),
  floor: z.number().int().min(1),
  size_sqm: z.number().positive().optional(),
  has_ac: z.boolean().optional().default(false),
  has_furniture: z.boolean().optional().default(true),
  monthly_price: z.number().positive("Monthly price is required"),
  deposit_months: z.number().int().positive().optional().default(2),
  min_contract_months: z.number().int().positive().optional().default(6),
  photo_urls: z.array(z.string()).optional().default([]),
});

// Owner can set status to these values manually; 'occupied' is set only by the tenancy system
const updateRoomSchema = z.object({
  room_number: z.string().min(1).optional(),
  floor: z.number().int().min(1).optional(),
  size_sqm: z.number().positive().optional(),
  has_ac: z.boolean().optional(),
  has_furniture: z.boolean().optional(),
  monthly_price: z.number().positive().optional(),
  deposit_months: z.number().int().positive().optional(),
  min_contract_months: z.number().int().positive().optional(),
  photo_urls: z.array(z.string()).optional(),
  status: z.enum(["available", "maintenance", "unavailable"]).optional(),
});

async function verifyBuildingOwnership(buildingId: string, ownerId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("buildings")
    .select("id")
    .eq("id", buildingId)
    .eq("owner_id", ownerId)
    .single();
  return !!data;
}

async function verifyRoomOwnership(roomId: string, ownerId: string): Promise<string | null> {
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("building_id")
    .eq("id", roomId)
    .single();
  if (!room) return null;
  const owned = await verifyBuildingOwnership(room.building_id, ownerId);
  return owned ? room.building_id : null;
}

// POST /api/rooms — create room (owner only, must own the building)
router.post("/", authenticate, authorize("owner"), async (req: Request, res: Response) => {
  try {
    const body = createRoomSchema.parse(req.body);

    const owned = await verifyBuildingOwnership(body.building_id, req.user!.id);
    if (!owned) {
      return res.status(404).json({ error: "Building not found or access denied" });
    }

    const { data, error } = await supabaseAdmin
      .from("rooms")
      .insert(body)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Room number already exists in this building" });
      }
      throw error;
    }

    return res.status(201).json({ room: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    throw error;
  }
});

// GET /api/rooms — public browse available rooms; owner sees all rooms in their buildings
router.get("/", optionalAuthenticate, async (req: Request, res: Response) => {
  const { building_id, floor, has_ac, min_price, max_price, status } = req.query;

  if (req.user?.role === "owner") {
    const { data: buildings } = await supabaseAdmin
      .from("buildings")
      .select("id")
      .eq("owner_id", req.user.id);

    const buildingIds = (buildings ?? []).map((b: { id: string }) => b.id);

    let query = supabaseAdmin
      .from("rooms")
      .select("*, buildings(id, name, address)")
      .in("building_id", buildingIds.length > 0 ? buildingIds : ["00000000-0000-0000-0000-000000000000"]);

    if (building_id) query = query.eq("building_id", building_id as string);
    if (status) query = query.eq("status", status as string);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ rooms: data });
  }

  // Public / tenant: return available rooms only
  let query = supabaseAdmin
    .from("rooms")
    .select("*, buildings(id, name, address, facilities, electricity_rate, water_rate)")
    .eq("status", "available");

  if (building_id) query = query.eq("building_id", building_id as string);
  if (floor) query = query.eq("floor", parseInt(floor as string));
  if (has_ac === "true") query = query.eq("has_ac", true);
  if (min_price) query = query.gte("monthly_price", parseFloat(min_price as string));
  if (max_price) query = query.lte("monthly_price", parseFloat(max_price as string));

  const { data, error } = await query.order("monthly_price", { ascending: true });
  if (error) throw error;
  return res.json({ rooms: data });
});

// GET /api/rooms/:id — get one room with building info (public)
router.get("/:id", optionalAuthenticate, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*, buildings(id, name, address, facilities, electricity_rate, water_rate, promptpay_id, promptpay_name, owner_id)")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Room not found" });
  }

  // Owners can only view rooms belonging to their own buildings
  if (req.user?.role === "owner") {
    const building = data.buildings as { owner_id: string } | null;
    if (!building || building.owner_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
  }

  return res.json({ room: data });
});

// PUT /api/rooms/:id — update room (owner only)
router.put("/:id", authenticate, authorize("owner"), async (req: Request, res: Response) => {
  try {
    const body = updateRoomSchema.parse(req.body);

    const buildingId = await verifyRoomOwnership(req.params.id, req.user!.id);
    if (!buildingId) {
      return res.status(404).json({ error: "Room not found or access denied" });
    }

    const { data, error } = await supabaseAdmin
      .from("rooms")
      .update(body)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Room number already exists in this building" });
      }
      throw error;
    }

    return res.json({ room: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    throw error;
  }
});

// DELETE /api/rooms/:id — delete room (owner only)
router.delete("/:id", authenticate, authorize("owner"), async (req: Request, res: Response) => {
  const buildingId = await verifyRoomOwnership(req.params.id, req.user!.id);
  if (!buildingId) {
    return res.status(404).json({ error: "Room not found or access denied" });
  }

  const { error } = await supabaseAdmin
    .from("rooms")
    .delete()
    .eq("id", req.params.id);

  if (error) throw error;

  return res.json({ message: "Room deleted" });
});

// GET /api/rooms/:id/cost-estimate — average monthly utility cost from meter history (public)
router.get("/:id/cost-estimate", async (req: Request, res: Response) => {
  const { data: room, error: roomError } = await supabaseAdmin
    .from("rooms")
    .select("id, monthly_price, building_id, buildings(electricity_rate, water_rate)")
    .eq("id", req.params.id)
    .single();

  if (roomError || !room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const cutoff = sixMonthsAgo.toISOString().split("T")[0];

  const { data: readings, error: readingsError } = await supabaseAdmin
    .from("meter_readings")
    .select("electricity_previous, electricity_current, water_previous, water_current")
    .eq("room_id", req.params.id)
    .gte("billing_month", cutoff)
    .order("billing_month", { ascending: false });

  if (readingsError) throw readingsError;

  if (!readings || readings.length === 0) {
    return res.json({ estimate: null, message: "No meter data available yet" });
  }

  const building = room.buildings as unknown as { electricity_rate: number; water_rate: number } | null;
  if (!building) {
    return res.status(500).json({ error: "Building rates not found" });
  }

  const avgElecUsage = readings.reduce((sum, r) => sum + (r.electricity_current - r.electricity_previous), 0) / readings.length;
  const avgWaterUsage = readings.reduce((sum, r) => sum + (r.water_current - r.water_previous), 0) / readings.length;

  const electricityCost = Math.round(avgElecUsage * building.electricity_rate * 100) / 100;
  const waterCost = Math.round(avgWaterUsage * building.water_rate * 100) / 100;
  const rent = Number(room.monthly_price);

  return res.json({
    estimate: {
      rent,
      electricity_cost: electricityCost,
      water_cost: waterCost,
      total: Math.round((rent + electricityCost + waterCost) * 100) / 100,
      months_of_data: readings.length,
    },
  });
});

export default router;
