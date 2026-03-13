import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.js";
import { verifyToken } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors({ origin: ["http://localhost:5173"], credentials: false }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ status: "ok", service: "minimal-backend" }));

app.use("/auth", authRoutes);

// Example protected route for "dashboard" API calls
app.get("/dashboard", verifyToken, (req, res) => {
  res.json({ status: "ok", walletAddress: req.user.walletAddress });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[minimal-backend] listening on http://localhost:${PORT}`);
});

