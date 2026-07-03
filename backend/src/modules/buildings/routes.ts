import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../lib/supabase";
import { authenticate, authorize, optionalAuthenticate } from "../../middleware/auth";

const router = Router();

const createBuildingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  description: z.string().optional(),
  facilities: z.array(z.string()).optional().default([]),
  photo_urls: z.array(z.string()).optional().default([]),
  electricity_rate: z.number().positive().optional().default(8.00),
  water_rate: z.number().positive().optional().default(18.00),
  promptpay_id: z.string().optional(),
  promptpay_name: z.string().optional(),
  line_notify_token: z.string().optional(),
});

const updateBuildingSchema = createBuildingSchema.partial();

// POST /api/buildings — create building (owner only)
router.post("/", authenticate, authorize("owner"), async (req: Request, res: Response) => {
  try {
    const body = createBuildingSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from("buildings")
      .insert({ ...body, owner_id: req.user!.id })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ building: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    throw error;
  }
});

// GET /api/buildings — owner gets own buildings; tenants/public get all buildings
router.get("/", optionalAuthenticate, async (req: Request, res: Response) => {
  let query = supabaseAdmin.from("buildings").select("*").order("created_at", { ascending: false });

  if (req.user?.role === "owner") {
    query = query.eq("owner_id", req.user.id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return res.json({ buildings: data });
});

// GET /api/buildings/:id — get one building (owner sees own only)
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("buildings")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Building not found" });
  }

  if (req.user!.role === "owner" && data.owner_id !== req.user!.id) {
    return res.status(403).json({ error: "Access denied" });
  }

  return res.json({ building: data });
});

// PUT /api/buildings/:id — update building (owner only, ownership enforced by query)
router.put("/:id", authenticate, authorize("owner"), async (req: Request, res: Response) => {
  try {
    const body = updateBuildingSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from("buildings")
      .update(body)
      .eq("id", req.params.id)
      .eq("owner_id", req.user!.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Building not found or access denied" });
      }
      throw error;
    }

    return res.json({ building: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    throw error;
  }
});

// DELETE /api/buildings/:id — delete building (owner only, ownership enforced by query)
router.delete("/:id", authenticate, authorize("owner"), async (req: Request, res: Response) => {
  const { error, count } = await supabaseAdmin
    .from("buildings")
    .delete({ count: "exact" })
    .eq("id", req.params.id)
    .eq("owner_id", req.user!.id);

  if (error) throw error;

  if (count === 0) {
    return res.status(404).json({ error: "Building not found or access denied" });
  }

  return res.json({ message: "Building deleted" });
});

export default router;
