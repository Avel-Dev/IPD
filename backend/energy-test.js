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

async function simulateHouse(houseId) {
  console.log(
    `Starting simulation for ${houseId} against ${BACKEND_URL}/energy/report (Ctrl+C to stop)...`
  );

  // Basic model: solar generation higher during "day", consumption varies
  async function tick() {
    const now = new Date();
    const hour = now.getHours();

    const daylightFactor = hour >= 7 && hour <= 18 ? 1 : 0.2;
    const baseProduced = randomInRange(2, 5) * daylightFactor; // kWh in interval
    const baseConsumed = randomInRange(1, 4); // kWh in interval

    const produced = Number(baseProduced.toFixed(2));
    const consumed = Number(baseConsumed.toFixed(2));

    try {
      await sendEnergyData(houseId, produced, consumed);
    } catch (err) {
      console.error("Simulation error:", err);
    }
  }

  // Fire immediately, then every 5 seconds
  await tick();
  const interval = setInterval(tick, 5000);

  process.on("SIGINT", () => {
    clearInterval(interval);
    console.log("\nSimulation stopped.");
    process.exit(0);
  });
}

async function main() {
  const [, , modeOrHouse, arg2, arg3] = process.argv;

  if (!modeOrHouse) {
    console.log("Usage:");
    console.log("  node energy-test.js <houseId> <energyProduced> <energyConsumed>");
    console.log("  node energy-test.js simulate <houseId>");
    process.exit(1);
  }

  if (modeOrHouse === "simulate") {
    const houseId = arg2;
    if (!houseId) {
      console.error("Missing houseId for simulate mode.");
      process.exit(1);
    }
    await simulateHouse(houseId);
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

