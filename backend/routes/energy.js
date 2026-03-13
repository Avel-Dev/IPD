import express from "express";
import { getHouseById, houseBelongsTo } from "../houseStore.js";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// POST /energy/report
router.post("/report", async (req, res) => {
  const { houseId, energyProduced, energyConsumed, timestamp } = req.body || {};

  if (!houseId || typeof houseId !== "string") {
    return res.status(400).json({ error: "houseId (string) is required" });
  }

  // Basic ownership verification for all callers (including CLI/devices):
  // only registered houses may report energy.
  const existingHouse = getHouseById(houseId);
  if (!existingHouse) {
    return res.status(400).json({ error: "House not registered" });
  }

  const ownerWalletAddress = req.user?.walletAddress || null;
  if (ownerWalletAddress && !houseBelongsTo(houseId, ownerWalletAddress)) {
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

  try {
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
router.get("/summary", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("energy_reports")
      .select("house_id, energy_produced, energy_consumed, surplus_energy, timestamp")
      .order("timestamp", { ascending: true })
      .limit(500);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Supabase summary error:", error);
      return res.status(500).json({ error: "Failed to load energy summary" });
    }

    const totals = (data || []).reduce(
      (acc, r) => {
        acc.energyProduced += r.energy_produced || 0;
        acc.energyConsumed += r.energy_consumed || 0;
        acc.surplusEnergy += r.surplus_energy || 0;
        return acc;
      },
      { energyProduced: 0, energyConsumed: 0, surplusEnergy: 0 }
    );

    return res.status(200).json({ totals, records: data || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Supabase summary exception:", err);
    return res.status(500).json({ error: "Failed to load energy summary" });
  }
});

// Time-series endpoint for a specific house
router.get("/history/:houseId", async (req, res) => {
  const { houseId } = req.params;
  const limitParam = req.query.limit;
  const limit = Number(limitParam) > 0 ? Number(limitParam) : 100;

  if (!houseId || typeof houseId !== "string") {
    return res.status(400).json({ error: "houseId (string) is required" });
  }

  try {
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

