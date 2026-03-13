import React from "react";
import { shortenAddress } from "../lib/eth";

export function Navbar({ walletAddress }) {
  return (
    <nav className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="font-semibold tracking-tight">
          Minimal DApp
        </div>
        <div className="text-sm text-zinc-300">
          {walletAddress ? shortenAddress(walletAddress) : "Not connected"}
        </div>
      </div>
    </nav>
  );
}

