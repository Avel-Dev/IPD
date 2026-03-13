import React from "react";
import { shortenAddress } from "../lib/eth";

export function Navbar({ walletAddress, onDisconnect }) {
  return (
    <nav className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="font-semibold tracking-tight">
          Minimal DApp
        </div>
        {walletAddress ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-300">
              {shortenAddress(walletAddress)}
            </span>
            <button
              type="button"
              onClick={onDisconnect}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/10"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="text-sm text-zinc-300">Not connected</div>
        )}
      </div>
    </nav>
  );
}

