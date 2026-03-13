import { ethers } from "ethers";
import { supabase } from "../supabaseClient.js";

// Keep a simple map to prevent rapid consecutive diversions for the same house
// Optional simple lock mechanism.
const inProgress = new Set();

export async function checkAndDivertSurplus(houseId, surplusEnergy) {
  if (surplusEnergy <= 0) return;

  // 1. Get house info to find owner widget
  const { data: house } = await supabase
    .from("houses")
    .select("owner_wallet")
    .eq("house_id", houseId)
    .single();

  if (!house || !house.owner_wallet) return;
  const walletAddress = house.owner_wallet;

  if (inProgress.has(walletAddress)) {
      return; // already processing a diversion for this wallet
  }
  inProgress.add(walletAddress);

  try {
    // 2. Read user settings for surplus limit
    const { data: settings } = await supabase
      .from("user_settings")
      .select("surplus_limit")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (!settings || settings.surplus_limit == null) return;
    const limit = settings.surplus_limit;

    // 3. Compare surplus with limit
    if (surplusEnergy > limit) {
      const divertedEnergy = surplusEnergy - limit;
      console.log(`[SurplusMonitor] House ${houseId}: Surp ${surplusEnergy} > Lim ${limit}. Diverting ${divertedEnergy}.`);

      // 4. Send transaction to Central Battery (Smart Contract)
      // Connect to local Hardhat node
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      // Use the first hardhat account to pay for gas (since backend acts as relayer/system)
      const signer = await provider.getSigner(0); 

      // Retrieve deployed contract address - assuming it's written in a known place or we pass it via env
      // For now, hardcode one we will get, or assume we fetch it from env.
      // Let's rely on an env variable for ENERGY_TRADING_CONTRACT.
      const contractAddress = process.env.ENERGY_TRADING_CONTRACT;
      if (!contractAddress) {
        console.error("Missing ENERGY_TRADING_CONTRACT environment variable.");
        return;
      }

      const abi = [
        "function divertEnergy(address user, uint256 amount) external"
      ];
      
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      // Convert divertedEnergy to an integer representation (e.g. scale up by 1e18 or just keep it simple)
      // Let's assume we use a scale of 1000 to keep 3 decimal places for simplicity
      const amountInt = BigInt(Math.floor(divertedEnergy * 1000));
      
      const tx = await contract.divertEnergy(walletAddress, amountInt);
      await tx.wait(); // wait for confirmation

      // 5. Log the diversion in the database
      await supabase
        .from("diversion_logs")
        .insert({
          wallet_address: walletAddress,
          amount: divertedEnergy,
          timestamp: Date.now()
        });

      console.log(`[SurplusMonitor] Diverted ${divertedEnergy} successfully for ${walletAddress}.`);
    }
  } catch (err) {
    console.error("[SurplusMonitor] Divert error:", err);
  } finally {
    inProgress.delete(walletAddress);
  }
}
