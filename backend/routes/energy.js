import express from "express";
import { getHouseById, houseBelongsTo } from "../houseStore.js";

const router = express.Router();

// In-memory store of latest energy report per house
// shape: { [houseId]: { houseId, energyProduced, energyConsumed, surplusEnergy, timestamp } }
const latestByHouse = Object.create(null);

// POST /energy/report
router.post("/report", (req, res) => {
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

  const record = {
    houseId,
    ownerWalletAddress,
    energyProduced: produced,
    energyConsumed: consumed,
    surplusEnergy,
    timestamp: ts
  };

  latestByHouse[houseId] = record;

  return res.status(200).json(record);
});

// Convenience endpoint for the dashboard to read aggregate + per-house values
router.get("/summary", (req, res) => {
  const houses = Object.values(latestByHouse);

  const totals = houses.reduce(
    (acc, h) => {
      acc.energyProduced += h.energyProduced;
      acc.energyConsumed += h.energyConsumed;
      acc.surplusEnergy += h.surplusEnergy;
      return acc;
    },
    { energyProduced: 0, energyConsumed: 0, surplusEnergy: 0 }
  );

  return res.status(200).json({ totals, houses });
});

export default router;

