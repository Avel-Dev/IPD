import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.js";
import { verifyToken } from "./middleware/auth.js";
import energyRoutes from "./routes/energy.js";
import housesRoutes from "./routes/houses.js";
import { initSchema } from "./db/initSchema.js";

import settingsRoutes from "./routes/settings.js";

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors({ origin: ["http://localhost:5173"], credentials: false }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ status: "ok", service: "minimal-backend" }));

app.use("/auth", authRoutes);
app.use("/houses", verifyToken, housesRoutes);
app.use("/settings", settingsRoutes); // Already uses verifyToken internally or we can mount it with it. Wait, the routes have verifyToken inside.
// Energy endpoints are left unauthenticated so that hardware/CLI simulators
// can POST reports without needing a JWT. When a JWT is present, routes can
// still use req.user for additional checks.
app.use("/energy", energyRoutes);

// Example protected route for "dashboard" API calls
app.get("/dashboard", verifyToken, (req, res) => {
  res.json({ status: "ok", walletAddress: req.user.walletAddress });
});

// Ensure Supabase schema, then start server
initSchema().then(() => {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[minimal-backend] listening on http://localhost:${PORT}`);
  });
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[server] Failed to initialize database schema:", err);
  process.exit(1);
});

