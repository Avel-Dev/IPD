import express from "express";
import { addHouse, getHousesByOwner, getHouseById } from "../houseStore.js";

const router = express.Router();

// POST /houses/register
router.post("/register", (req, res) => {
  const { houseId, meterId } = req.body || {};

  if (!houseId || typeof houseId !== "string") {
    return res.status(400).json({ error: "houseId (string) is required" });
  }

  if (getHouseById(houseId)) {
    return res.status(409).json({ error: "houseId already registered" });
  }

  const ownerWalletAddress = req.user?.walletAddress;
  if (!ownerWalletAddress) {
    return res.status(400).json({ error: "Missing wallet in token" });
  }

  const house = addHouse({
    houseId,
    ownerWalletAddress,
    meterId: meterId || null,
    createdAt: Date.now()
  });

  return res.status(201).json(house);
});

// GET /houses/my
router.get("/my", (req, res) => {
  const ownerWalletAddress = req.user?.walletAddress;
  if (!ownerWalletAddress) {
    return res.status(400).json({ error: "Missing wallet in token" });
  }

  const houses = getHousesByOwner(ownerWalletAddress);
  return res.status(200).json({ houses });
});

export default router;

