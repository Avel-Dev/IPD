#!/usr/bin/env node

// Simple CLI utility to send mock energy data to the minimal backend.
// Usage:
//   node energy-test.js house1 120 80
//   node energy-test.js house2 90 100
//   node energy-test.js simulate house1
//
// Backend defaults to http://localhost:5005, override with BACKEND_URL env.

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5005";

async function sendEnergyData(houseId, produced, consumed) {
  const payload = {
    houseId,
    energyProduced: produced,
    energyConsumed: consumed,
    timestamp: Date.now()
  };

  const res = await fetch(`${BACKEND_URL}/energy/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    console.error("Request failed:", res.status, data);
    return;
  }

  console.log("Sent energy report:", JSON.stringify(payload));
  console.log("Backend response:", data);
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Continuous 1-second simulation that mimics a real sensor.
// productionRange and consumptionRange are [min, max] in kWh per second.
export async function startEnergySimulation(
  houseId,
  productionRange = [0.01, 0.05],
  consumptionRange = [0.01, 0.04]
) {
  const [pMin, pMax] = productionRange;
  const [cMin, cMax] = consumptionRange;

  console.log(
    `Starting 1s energy simulation for ${houseId} against ${BACKEND_URL}/energy/report (Ctrl+C to stop)...`
  );
  console.log(
    `Production range: [${pMin}, ${pMax}] kWh, Consumption range: [${cMin}, ${cMax}] kWh`
  );

  async function tick() {
    const produced = Number(randomInRange(pMin, pMax).toFixed(4));
    const consumed = Number(randomInRange(cMin, cMax).toFixed(4));

    try {
      await sendEnergyData(houseId, produced, consumed);
    } catch (err) {
      console.error("Simulation error:", err);
    }
  }

  // Fire immediately, then every 1 second
  await tick();
  const interval = setInterval(tick, 1000);

  process.on("SIGINT", () => {
    clearInterval(interval);
    console.log("\nSimulation stopped.");
    process.exit(0);
  });
}

async function main() {
  const [, , modeOrHouse, arg2, arg3, arg4, arg5] = process.argv;

  if (!modeOrHouse) {
    console.log("Usage:");
    console.log("  node energy-test.js <houseId> <energyProduced> <energyConsumed>");
    console.log("  node energy-test.js simulate <houseId> [prodMin prodMax consMin consMax]");
    process.exit(1);
  }

  if (modeOrHouse === "simulate") {
    const houseId = arg2;
    if (!houseId) {
      console.error("Missing houseId for simulate mode.");
      process.exit(1);
    }
    const prodMin = arg3 !== undefined ? Number(arg3) : 0.01;
    const prodMax = arg4 !== undefined ? Number(arg4) : 0.05;
    const consMin = arg5 !== undefined ? Number(arg5) : 0.01;
    const consMax = process.argv[7] !== undefined ? Number(process.argv[7]) : 0.04;

    if (
      !Number.isFinite(prodMin) ||
      !Number.isFinite(prodMax) ||
      !Number.isFinite(consMin) ||
      !Number.isFinite(consMax)
    ) {
      console.error(
        "Invalid range values. Usage: node energy-test.js simulate <houseId> [prodMin prodMax consMin consMax]"
      );
      process.exit(1);
    }

    await startEnergySimulation(houseId, [prodMin, prodMax], [consMin, consMax]);
    return;
  }

  const houseId = modeOrHouse;
  const produced = Number(arg2);
  const consumed = Number(arg3);

  if (!houseId || !Number.isFinite(produced) || !Number.isFinite(consumed)) {
    console.error("Usage: node energy-test.js <houseId> <energyProduced> <energyConsumed>");
    process.exit(1);
  }

  try {
    await sendEnergyData(houseId, produced, consumed);
  } catch (err) {
    console.error("Error sending energy data:", err);
    process.exit(1);
  }
}

main();

