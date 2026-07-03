import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";

// Load environment variables
dotenv.config();

// Import route modules
import authRoutes from "./modules/auth/routes";

const app = express();
const PORT = process.env.PORT || 3001;

// === Middleware ===
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// === Health check (for UptimeRobot / Render) ===
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// === API Routes ===
app.use("/api/auth", authRoutes);

// Uncomment as you build each module:
// app.use("/api/buildings", buildingRoutes);
// app.use("/api/rooms", roomRoutes);
// app.use("/api/applications", applicationRoutes);
// app.use("/api/tenancies", tenancyRoutes);
// app.use("/api/billing", billingRoutes);
// app.use("/api/maintenance", maintenanceRoutes);
// app.use("/api/housekeeping", housekeepingRoutes);
// app.use("/api/announcements", announcementRoutes);
// app.use("/api/ratings", ratingRoutes);
// app.use("/api/expenses", expenseRoutes);
// app.use("/api/ai", aiRoutes);

// === Error handler (must be last) ===
app.use(errorHandler);

// === Start server ===
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   DormMatch API running on :${PORT}    ║
  ║   Environment: ${process.env.NODE_ENV || "development"}          ║
  ╚══════════════════════════════════════╝
  `);
});

export default app;
