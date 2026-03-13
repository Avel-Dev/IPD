import express from "express";
import { supabase } from "../supabaseClient.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// POST /energy/report
router.post("/report", async (req, res) => {
  const { houseId, energyProduced, energyConsumed, timestamp } = req.body || {};

  if (!houseId || typeof houseId !== "string") {
    return res.status(400).json({ error: "houseId (string) is required" });
  }

  // Ensure house exists in Supabase
  try {
    const { data: house, error: houseError } = await supabase
      .from("houses")
      .select("house_id, owner_wallet")
      .eq("house_id", houseId)
      .maybeSingle();

    if (houseError) {
      // eslint-disable-next-line no-console
      console.error("Supabase house lookup error:", houseError);
      return res.status(500).json({ error: "Failed to verify house" });
    }

    if (!house) {
      return res.status(400).json({ error: "House not registered" });
    }

    const ownerWalletAddress = req.user?.walletAddress || null;
    if (ownerWalletAddress && house.owner_wallet !== ownerWalletAddress) {
      return res.status(403).json({ error: "House does not belong to this wallet" });
    }

    const produced = Number(energyProduced);
    const consumed = Number(energyConsumed);
    const ts = Number(timestamp || Date.now());

    if (!Number.isFinite(produced) || !Number.isFinite(consumed)) {
      return res
        .status(400)
        .json({ error: "energyProduced and energyConsumed must be numbers" });
    }

    const surplusEnergy = produced - consumed;

    const { data, error } = await supabase
      .from("energy_reports")
      .insert({
        house_id: houseId,
        energy_produced: produced,
        energy_consumed: consumed,
        surplus_energy: surplusEnergy,
        timestamp: ts
      })
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "Failed to store energy report" });
    }

    return res.status(201).json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Supabase insert exception:", err);
    return res.status(500).json({ error: "Failed to store energy report" });
  }
});

// Convenience endpoint for the dashboard to read aggregate + per-house values
// Protected: aggregates are scoped to the authenticated wallet's houses only.
router.get("/summary", verifyToken, async (req, res) => {
  const walletAddress = req.user?.walletAddress;
  if (!walletAddress) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // First, find all house_ids owned by this wallet
    const { data: houseRows, error: houseError } = await supabase
      .from("houses")
      .select("house_id")
      .eq("owner_wallet", walletAddress);

    if (houseError) {
      // eslint-disable-next-line no-console
      console.error("Supabase houses for summary error:", houseError);
      return res.status(500).json({ error: "Failed to load energy summary" });
    }

    const houseIds = (houseRows || []).map((h) => h.house_id);

    if (houseIds.length === 0) {
      return res.status(200).json({
        totals: { energyProduced: 0, energyConsumed: 0, surplusEnergy: 0 },
        records: []
      });
    }

    const { data: energyRows, error: energyError } = await supabase
      .from("energy_reports")
      .select("house_id, energy_produced, energy_consumed, surplus_energy, timestamp")
      .in("house_id", houseIds)
      .order("timestamp", { ascending: true })
      .limit(500);

    if (energyError) {
      // eslint-disable-next-line no-console
      console.error("Supabase energy summary error:", energyError);
      return res.status(500).json({ error: "Failed to load energy summary" });
    }

    const totals = (energyRows || []).reduce(
      (acc, r) => {
        acc.energyProduced += r.energy_produced || 0;
        acc.energyConsumed += r.energy_consumed || 0;
        acc.surplusEnergy += r.surplus_energy || 0;
        return acc;
      },
      { energyProduced: 0, energyConsumed: 0, surplusEnergy: 0 }
    );

    return res.status(200).json({ totals, records: energyRows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Supabase summary exception:", err);
    return res.status(500).json({ error: "Failed to load energy summary" });
  }
});

// Time-series endpoint for a specific house
// Protected: history is only available for houses owned by the authenticated wallet.
router.get("/history/:houseId", verifyToken, async (req, res) => {
  const { houseId } = req.params;
  const limitParam = req.query.limit;
  const limit = Number(limitParam) > 0 ? Number(limitParam) : 100;

  if (!houseId || typeof houseId !== "string") {
    return res.status(400).json({ error: "houseId (string) is required" });
  }

  const walletAddress = req.user?.walletAddress;
  if (!walletAddress) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // Ensure this house belongs to the authenticated wallet
    const { data: house, error: houseError } = await supabase
      .from("houses")
      .select("house_id, owner_wallet")
      .eq("house_id", houseId)
      .maybeSingle();

    if (houseError) {
      // eslint-disable-next-line no-console
      console.error("Supabase house history error:", houseError);
      return res.status(500).json({ error: "Failed to load energy history" });
    }

    if (!house || house.owner_wallet !== walletAddress) {
      return res.status(403).json({ error: "House does not belong to this wallet" });
    }

    const { data, error } = await supabase
      .from("energy_reports")
      .select("*")
      .eq("house_id", houseId)
      .order("timestamp", { ascending: true })
      .limit(limit);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Supabase history error:", error);
      return res.status(500).json({ error: "Failed to load energy history" });
    }

    return res.status(200).json({ records: data || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Supabase history exception:", err);
    return res.status(500).json({ error: "Failed to load energy history" });
  }
});

export default router;

