import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// POST /houses/register
router.post("/register", async (req, res) => {
  const { houseId, meterId } = req.body || {};

  if (!houseId || typeof houseId !== "string") {
    return res.status(400).json({ error: "houseId (string) is required" });
  }

  const ownerWalletAddress = req.user?.walletAddress;
  if (!ownerWalletAddress) {
    return res.status(400).json({ error: "Missing wallet in token" });
  }
  try {
    // Check for existing house_id
    const { data: existing, error: existingError } = await supabase
      .from("houses")
      .select("id")
      .eq("house_id", houseId)
      .maybeSingle();

    if (existingError) {
      // eslint-disable-next-line no-console
      console.error("Supabase houses existing error:", existingError);
      return res.status(500).json({ error: "Failed to check existing house" });
    }

    if (existing) {
      return res.status(409).json({ error: "houseId already registered" });
    }

    const { data, error } = await supabase
      .from("houses")
      .insert({
        house_id: houseId,
        owner_wallet: ownerWalletAddress,
        meter_id: meterId || null
      })
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Supabase houses insert error:", error);
      return res.status(500).json({ error: "Failed to register house" });
    }

    const house = {
      houseId: data.house_id,
      ownerWalletAddress: data.owner_wallet,
      meterId: data.meter_id,
      createdAt: data.created_at
    };

    return res.status(201).json(house);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Supabase houses exception:", err);
    return res.status(500).json({ error: "Failed to register house" });
  }
});

// GET /houses/my
router.get("/my", async (req, res) => {
  const ownerWalletAddress = req.user?.walletAddress;
  if (!ownerWalletAddress) {
    return res.status(400).json({ error: "Missing wallet in token" });
  }

  try {
    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .eq("owner_wallet", ownerWalletAddress)
      .order("created_at", { ascending: true });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Supabase houses my error:", error);
      return res.status(500).json({ error: "Failed to load houses" });
    }

    const houses = (data || []).map((row) => ({
      houseId: row.house_id,
      ownerWalletAddress: row.owner_wallet,
      meterId: row.meter_id,
      createdAt: row.created_at
    }));

    return res.status(200).json({ houses });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Supabase houses my exception:", err);
    return res.status(500).json({ error: "Failed to load houses" });
  }
});

export default router;

