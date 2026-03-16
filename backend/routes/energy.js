import express from "express";
import { supabase } from "../supabaseClient.js";
import { verifyToken } from "../middleware/auth.js";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Hardhat configuration
const HARDHAT_URL = "http://127.0.0.1:8545";
const HARDHAT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

/**
 * Get the deployed EnergyTrading contract address
 */
function getContractAddress() {
  const deploymentPath = path.resolve(__dirname, "..", "..", "hardhat", "deployments", "EnergyTrading.json");
  try {
    if (fs.existsSync(deploymentPath)) {
      const data = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
      return data.address;
    }
  } catch (err) {
    console.error("[energy] Failed to read contract address:", err.message);
  }
  return null;
}

/**
 * Call the EnergyTrading contract to record surplus (non-blocking, fire-and-forget)
 * Converts kWh to wei (1 kWh = 10^18 wei for simplicity)
 */
async function recordSurplusOnChain(houseId, surplusKwh) {
  const contractAddress = getContractAddress();
  if (!contractAddress) {
    console.log(`[energy] Skipping blockchain call - no contract address found`);
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(HARDHAT_URL);
    const signer = new ethers.Wallet(HARDHAT_PRIVATE_KEY, provider);

    // Connect to contract with minimal ABI
    const contract = new ethers.Contract(
      contractAddress,
      ["function recordSurplus(string houseId, uint256 amount)"],
      signer
    );

    // Convert kWh to wei (assuming 1 kWh = 1e18 wei for demo purposes)
    const amountInWei = ethers.parseEther(surplusKwh.toString());

    const tx = await contract.recordSurplus(houseId, amountInWei);
    console.log(`[energy] Blockchain tx sent for ${houseId}: ${tx.hash}`);
    await tx.wait();
    console.log(`[energy] Blockchain tx confirmed for ${houseId}: ${tx.hash}`);
  } catch (err) {
    // Log and skip - don't crash the main flow
    console.error(`[energy] Blockchain call failed for ${houseId}: ${err.message}`);
  }
}

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

    // After storing the report, check for potential diversion
    try {
      if (surplusEnergy > 0) {
        // Try to use surplus monitor if available
        try {
          const monitor = await import("../services/surplusMonitor.js");
          monitor.checkAndDivertSurplus(houseId, surplusEnergy).catch(e => {
            console.error("Surplus monitor exception:", e);
          });
        } catch (e) {
          // If surplusMonitor doesn't exist, fall back to blockchain recording
          recordSurplusOnChain(houseId, surplusEnergy).catch((err) => {
            console.error("[energy] Background blockchain call failed:", err.message);
          });
        }
      }
    } catch(err) {
      console.error("Surplus monitor load exception:", err);
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

// GET /energy/diversion-stats
router.get("/diversion-stats", verifyToken, async (req, res) => {
  const walletAddress = req.user?.walletAddress;
  if (!walletAddress) return res.status(401).json({ error: "Unauthorized" });

  try {
    // 1. Get user's surplus limit
    const { data: settings } = await supabase
      .from("user_settings")
      .select("surplus_limit")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    const surplusLimit = settings?.surplus_limit ?? 0;

    // 2. Get user's total diverted energy
    // Note: Supabase JS client doesn't have a direct SUM function without RPC, 
    // so we can either fetch all and sum, or use an RPC. Assuming low volume, fetch all and sum.
    const { data: logs } = await supabase
      .from("diversion_logs")
      .select("amount")
      .eq("wallet_address", walletAddress);

    const energyDiverted = (logs || []).reduce((sum, row) => sum + (row.amount || 0), 0);

    // 3. Get central battery level from smart contract
    let centralBatteryLevel = 0;
    try {
      // Dynamic import ethers so we don't break existing stuff if strictly needed
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const contractAddress = process.env.ENERGY_TRADING_CONTRACT;
      if (contractAddress) {
        const abi = ["function centralBatteryLevel() view returns (uint256)"];
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const levelInt = await contract.centralBatteryLevel();
        // convert back from our x1000 scale
        centralBatteryLevel = Number(levelInt) / 1000;
      }
    } catch(err) {
      console.error("Failed to read central battery from contract", err);
    }

    return res.status(200).json({
      surplusLimit,
      energyDiverted,
      centralBatteryLevel
    });
  } catch (err) {
    console.error("diversion-stats error", err);
    return res.status(500).json({ error: "Failed to fetch diversion stats" });
  }
});

export default router;

