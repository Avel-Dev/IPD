import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { apiRequest } from "../lib/api";
import {
  getEthereum,
  HARDHAT_CHAIN_ID_DEC,
  HARDHAT_NETWORK,
  shortenAddress,
  getReadableNetworkName
} from "../lib/eth";
import { EnergyLineChart } from "../components/EnergyLineChart";

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-zinc-400">{subtitle}</div> : null}
    </div>
  );
}

export function Dashboard({ onDisconnect, onWalletUpdated }) {
  const ethereum = useMemo(() => getEthereum(), []);

  const [walletAddress, setWalletAddress] = useState(localStorage.getItem("mm_wallet") || "");
  const [networkName, setNetworkName] = useState("-");
  const [chainId, setChainId] = useState(null);
  const [balanceEth, setBalanceEth] = useState("-");
  const [blockNumber, setBlockNumber] = useState("-");
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState("");

  // Energy monitoring state (aggregated across reported houses)
  const [energyProduced, setEnergyProduced] = useState(0);
  const [energyConsumed, setEnergyConsumed] = useState(0);
  const [energySurplus, setEnergySurplus] = useState(0);

  // Per-house energy history for visualization
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [energyHistory, setEnergyHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");

  // House management state
  const [houses, setHouses] = useState([]);
  const [newHouseId, setNewHouseId] = useState("");
  const [newMeterId, setNewMeterId] = useState("");
  const [houseError, setHouseError] = useState("");
  const [isCreatingHouse, setIsCreatingHouse] = useState(false);

  // Keep references to provider/signer so they can be cleared on disconnect
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const onHardhat = chainId === HARDHAT_CHAIN_ID_DEC;

  function handleLogout() {
    localStorage.removeItem("mm_jwt");
    localStorage.removeItem("mm_wallet");
    setWalletAddress("");
    setNetworkName("-");
    setChainId(null);
    setBalanceEth("-");
    setBlockNumber("-");
    setStatus("Disconnected");
     // Reset energy monitoring + house-related state so we don't
     // carry totals across sessions.
     setEnergyProduced(0);
     setEnergyConsumed(0);
     setEnergySurplus(0);
     setSelectedHouseId("");
     setEnergyHistory([]);
     setHistoryError("");
     setHouses([]);
     setNewHouseId("");
     setNewMeterId("");
     setHouseError("");
    setProvider(null);
    setSigner(null);
    if (typeof onDisconnect === "function") {
      onDisconnect();
    } else {
      window.location.href = "/";
    }
  }

  async function switchToHardhat() {
    setError("");
    setIsSwitching(true);
    try {
      if (!ethereum) throw new Error("MetaMask not detected.");
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: HARDHAT_NETWORK.chainId }]
        });
      } catch (e) {
        if (e?.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [HARDHAT_NETWORK]
          });
        } else {
          throw new Error("Failed to switch network. Please switch manually in MetaMask.");
        }
      }
    } finally {
      setIsSwitching(false);
    }
  }

  async function refresh() {
    setError("");
    setIsRefreshing(true);
    try {
      if (!ethereum) throw new Error("MetaMask not detected. Please install MetaMask.");

      const token = localStorage.getItem("mm_jwt");
      if (!token) throw new Error("No token found. Please login again.");
      const auth = await apiRequest("/dashboard");
      setWalletAddress(auth.walletAddress);
      localStorage.setItem("mm_wallet", auth.walletAddress);
      if (typeof onWalletUpdated === "function") {
        onWalletUpdated(auth.walletAddress);
      }

      const browserProvider = new ethers.BrowserProvider(ethereum);
      const userSigner = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();
      const bn = await browserProvider.getBlockNumber();
      const bal = await browserProvider.getBalance(auth.walletAddress);

      setProvider(browserProvider);
      setSigner(userSigner);

      const numericChainId = Number(network.chainId);
      setNetworkName(getReadableNetworkName(numericChainId, network.name));
      setChainId(numericChainId);
      setBlockNumber(String(bn));
      setBalanceEth(`${Number(ethers.formatEther(bal)).toFixed(6)} ETH`);
      setStatus("Connected");

      // Fetch latest energy summary for visualization
      try {
        const energy = await apiRequest("/energy/summary");
        const totals = energy?.totals || {
          energyProduced: 0,
          energyConsumed: 0,
          surplusEnergy: 0
        };
        setEnergyProduced(totals.energyProduced);
        setEnergyConsumed(totals.energyConsumed);
        setEnergySurplus(totals.surplusEnergy);
      } catch {
        // If energy endpoint is not used yet, keep values at zero
      }

      // Fetch houses owned by this wallet
      try {
        const data = await apiRequest("/houses/my");
        const owned = data?.houses || [];
        setHouses(owned);
      } catch {
        // Ignore for now; houses UI will show empty
      }
    } catch (e) {
      setStatus("Disconnected");
      setError(e?.message || "Failed to load dashboard");
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic refresh for near real-time updates
  useEffect(() => {
    const id = setInterval(() => {
      refresh();
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure we only set an initial selectedHouseId when houses first load,
  // and avoid overwriting the user's choice on subsequent refreshes.
  useEffect(() => {
    if (!selectedHouseId && houses.length > 0) {
      setSelectedHouseId(houses[0].houseId);
      return;
    }

    // If the currently selected house disappears (e.g., data reset),
    // fall back to the first available house.
    if (
      selectedHouseId &&
      houses.length > 0 &&
      !houses.some((h) => h.houseId === selectedHouseId)
    ) {
      setSelectedHouseId(houses[0].houseId);
    }
  }, [houses, selectedHouseId]);

  async function loadEnergyHistory(houseId) {
    if (!houseId) {
      setEnergyHistory([]);
      setHistoryError("");
      return;
    }
    try {
      setHistoryError("");
      const data = await apiRequest(
        `/energy/history/${encodeURIComponent(houseId)}?limit=100`
      );
      const raw = data?.records || [];
      // Normalize Supabase snake_case fields into the shape expected by the chart
      const mapped = raw.map((r) => ({
        houseId: r.house_id ?? houseId,
        timestamp: Number(r.timestamp),
        energyProduced: Number(r.energy_produced ?? 0),
        energyConsumed: Number(r.energy_consumed ?? 0),
        surplusEnergy: Number(r.surplus_energy ?? 0)
      }));
      setEnergyHistory(mapped);
    } catch (err) {
      setEnergyHistory([]);
      setHistoryError(err?.message || "Failed to load energy history.");
    }
  }

  // Load history when selectedHouseId changes
  useEffect(() => {
    loadEnergyHistory(selectedHouseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHouseId]);

  async function handleCreateHouse(e) {
    e.preventDefault();
    setHouseError("");
    if (!newHouseId.trim()) {
      setHouseError("House ID is required.");
      return;
    }
    setIsCreatingHouse(true);
    try {
      const created = await apiRequest("/houses/register", {
        method: "POST",
        body: JSON.stringify({
          houseId: newHouseId.trim(),
          meterId: newMeterId.trim() || undefined
        })
      });
      setHouses((prev) => [...prev, created]);
      setNewHouseId("");
      setNewMeterId("");
    } catch (err) {
      setHouseError(err?.message || "Failed to register house.");
    } finally {
      setIsCreatingHouse(false);
    }
  }

  useEffect(() => {
    if (!ethereum) return;

    function onAccountsChanged(accounts) {
      if (!accounts?.length) {
        // Wallet fully disconnected
        handleLogout();
      } else {
        // Different account selected – treat as logout for security
        handleLogout();
      }
    }

    function onChainChanged() {
      window.location.reload();
    }

    ethereum.on?.("accountsChanged", onAccountsChanged);
    ethereum.on?.("chainChanged", onChainChanged);
    return () => {
      ethereum.removeListener?.("accountsChanged", onAccountsChanged);
      ethereum.removeListener?.("chainChanged", onChainChanged);
    };
  }, [ethereum]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="mt-1 text-sm text-zinc-400">
            Status:{" "}
            <span className={status === "Connected" ? "text-emerald-300" : "text-zinc-300"}>
              {status}
            </span>
            {walletAddress ? (
              <>
                {" "}
                • Wallet: <span className="font-mono">{shortenAddress(walletAddress)}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!onHardhat && chainId != null ? (
            <button
              onClick={switchToHardhat}
              disabled={isSwitching}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/15 disabled:opacity-60"
            >
              {isSwitching ? "Switching..." : "Switch to Hardhat"}
            </button>
          ) : null}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
          >
            {isRefreshing ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {!onHardhat && chainId != null && (
        <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          You are not on the Hardhat local network (chainId {String(chainId)}). Switch to{" "}
          <span className="font-mono">31337</span> to read from your local node.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Wallet Address" value={walletAddress || "-"} />
        <StatCard
          title="ETH Balance"
          value={balanceEth}
          subtitle={onHardhat ? "Local node balance" : "Balance may vary"}
        />
        <StatCard
          title="Network"
          value={networkName}
          subtitle={chainId != null ? `chainId: ${chainId}` : ""}
        />
        <StatCard title="Latest Block Number" value={blockNumber} />
      </div>

      {/* Energy Monitoring Section */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white">Energy Monitoring</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Aggregated production and consumption reported by connected houses (kWh).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Energy Produced"
            value={`${energyProduced.toFixed(2)} kWh`}
            subtitle="Latest reported totals"
          />
          <StatCard
            title="Energy Consumed"
            value={`${energyConsumed.toFixed(2)} kWh`}
            subtitle="Across all houses"
          />
          <StatCard
            title="Surplus Energy"
            value={`${energySurplus.toFixed(2)} kWh`}
            subtitle={energySurplus >= 0 ? "Net export to grid" : "Net import from grid"}
          />
        </div>
      </div>

      {/* Energy Visualization Section */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white">Energy Visualization</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Time-series view of produced, consumed, and surplus energy for a specific house.
        </p>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-zinc-400">
            Select a house to visualize its energy history.
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              House
            </label>
            <select
              value={selectedHouseId}
              onChange={(e) => setSelectedHouseId(e.target.value)}
              className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
              disabled={houses.length === 0}
            >
              {houses.length === 0 ? (
                <option value="">No houses</option>
              ) : (
                houses.map((h) => (
                  <option key={h.houseId} value={h.houseId}>
                    {h.houseId}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {historyError && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            {historyError}
          </div>
        )}

        <EnergyLineChart records={energyHistory} />
      </div>

      {/* House Management Section */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white">House Management</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Register homes connected to this wallet and link them to energy reports.
        </p>

        <form onSubmit={handleCreateHouse} className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-zinc-900/30 p-4 sm:grid-cols-[2fr,2fr,auto] sm:items-end">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              House ID
            </label>
            <input
              type="text"
              value={newHouseId}
              onChange={(e) => setNewHouseId(e.target.value)}
              placeholder="house_1"
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Meter ID (optional)
            </label>
            <input
              type="text"
              value={newMeterId}
              onChange={(e) => setNewMeterId(e.target.value)}
              placeholder="meter_001"
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>
          <button
            type="submit"
            disabled={isCreatingHouse}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0"
          >
            {isCreatingHouse ? "Registering..." : "Register House"}
          </button>
        </form>

        {houseError && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            {houseError}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/30 p-4">
          <h3 className="text-sm font-semibold text-white">My Houses</h3>
          {houses.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-400">
              No houses registered yet. Use the form above to add one.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs text-zinc-300">
              {houses.map((h) => (
                <li
                  key={h.houseId}
                  className="flex flex-col rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-mono text-[11px] text-cyan-300">
                      {h.houseId}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">
                      Meter: {h.meterId || "—"}
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-500 sm:mt-0">
                    Created:{" "}
                    {h.createdAt
                      ? new Date(h.createdAt).toLocaleString()
                      : "unknown"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

