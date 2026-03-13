import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { apiRequest } from "../lib/api";
import { getEthereum } from "../lib/eth";

export function Login({ onWalletConnected }) {
  const navigate = useNavigate();
  const ethereum = useMemo(() => getEthereum(), []);

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  async function connectWallet() {
    setError("");
    setIsConnecting(true);
    try {
      if (!ethereum) {
        throw new Error("MetaMask not detected. Please install MetaMask to continue.");
      }

      await ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ walletAddress })
      });

      localStorage.setItem("mm_jwt", data.token);
      localStorage.setItem("mm_wallet", data.walletAddress);
      if (typeof onWalletConnected === "function") {
        onWalletConnected(data.walletAddress);
      }
      navigate("/dashboard");
    } catch (e) {
      setError(e?.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/30 p-6 shadow">
        <h1 className="text-xl font-semibold">MetaMask Login</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Connect your wallet and receive a JWT from the backend.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>

        <div className="mt-4 text-xs text-zinc-400">
          Tip: run a Hardhat local node on <span className="font-mono">127.0.0.1:8545</span> and switch MetaMask to it.
        </div>
      </div>
    </div>
  );
}

