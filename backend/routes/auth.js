import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

function isValidWalletAddress(walletAddress) {
  return typeof walletAddress === "string" && /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
}

router.post("/login", (req, res) => {
  const { walletAddress } = req.body || {};
  if (!isValidWalletAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid walletAddress" });
  }

  const token = jwt.sign({ walletAddress }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return res.status(200).json({ token, walletAddress });
});

export default router;

