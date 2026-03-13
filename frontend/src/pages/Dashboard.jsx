import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { apiRequest } from "../lib/api";
import {
  getEthereum,
  HARDHAT_CHAIN_ID_DEC,
  HARDHAT_NETWORK,
  shortenAddress
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

      setNetworkName(network.name || "unknown");
      setChainId(Number(network.chainId));
      setBlockNumber(String(bn));
      setBalanceEth(`${Number(ethers.formatEther(bal)).toFixed(6)} ETH`);
      setStatus("Connected");
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
        <StatCard title="ETH Balance" value={balanceEth} subtitle={onHardhat ? "Local node balance" : "Balance may vary"} />
        <StatCard title="Network" value={networkName} subtitle={chainId != null ? `chainId: ${chainId}` : ""} />
        <StatCard title="Latest Block Number" value={blockNumber} />
      </div>
    </div>
  );
}

