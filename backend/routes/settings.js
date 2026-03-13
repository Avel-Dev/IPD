import express from "express";
import { supabase } from "../supabaseClient.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/surplus-limit", verifyToken, async (req, res) => {
  const walletAddress = req.user?.walletAddress;
  if (!walletAddress) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("surplus_limit")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal error" });
    }

    return res.status(200).json({ surplusLimit: data?.surplus_limit ?? 0 });
  } catch(err) {
    return res.status(500).json({ error: "Failed to load limit" });
  }
});

router.post("/surplus-limit", verifyToken, async (req, res) => {
  const walletAddress = req.user?.walletAddress;
  if (!walletAddress) return res.status(401).json({ error: "Unauthorized" });
  const { surplusLimit } = req.body;
  if (typeof surplusLimit !== "number") return res.status(400).json({ error: "must be number" });

  try {
    const { data, error } = await supabase
      .from("user_settings")
      .upsert({ wallet_address: walletAddress, surplus_limit: surplusLimit, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Database error" });
    }
    return res.status(200).json({ surplusLimit: data.surplus_limit });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save limit" });
  }
});

export default router;
