import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { supabaseAdmin } from "../../lib/supabase";
import { authenticate } from "../../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  role: z.enum(["owner", "tenant"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);

    // Create Supabase auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Insert into users table
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        role: body.role,
      })
      .select()
      .single();

    if (userError) {
      // Rollback: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: userError.message });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({ user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    throw error;
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    // Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

    if (authError) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Get user profile
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: "User profile not found" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    throw error;
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: Request, res: Response) => {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", req.user!.id)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user });
});

export default router;
