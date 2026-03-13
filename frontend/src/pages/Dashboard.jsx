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
    </div>
  );
}

