import React, { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

export function SurplusSettings() {
  const [surplusLimit, setSurplusLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [stats, setStats] = useState({
    energyProduced: 0,
    energyConsumed: 0,
    localBatteryLevel: 0, // Mocked or left 0 if unsupported
  });

  useEffect(() => {
    async function loadData() {
      try {
        const { surplusLimit } = await apiRequest("/settings/surplus-limit");
        setSurplusLimit(surplusLimit || 0);

        const energy = await apiRequest("/energy/summary");
        if (energy?.totals) {
          setStats({
             energyProduced: energy.totals.energyProduced,
             energyConsumed: energy.totals.energyConsumed,
             localBatteryLevel: 0 // Local battery level not strictly tracked in this minimal version, leaving at 0
          });
        }
      } catch(err) {
        console.error(err);
        setError("Failed to load settings.");
      }
    }
    loadData();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const parsed = parseFloat(surplusLimit);
      if (isNaN(parsed)) throw new Error("Please enter a valid number");

      const res = await apiRequest("/settings/surplus-limit", {
        method: "POST",
        body: JSON.stringify({ surplusLimit: parsed })
      });
      setSurplusLimit(res.surplusLimit);
      setSuccess("Surplus limit saved successfully.");
    } catch(err) {
      console.error(err);
      setError(err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Surplus Settings</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Define your surplus energy limit. Any energy produced beyond this limit will be automatically
        diverted to the central battery pool and recorded on-chain.
      </p>

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {success}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
           <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Current Surplus Limit</div>
           <div className="mt-2 text-2xl font-semibold text-cyan-400">{surplusLimit !== "" ? `${surplusLimit} kWh` : "—"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
           <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Overall Energy Produced</div>
           <div className="mt-2 text-xl font-semibold text-white">{stats.energyProduced.toFixed(2)} kWh</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
           <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Local Battery Level</div>
           <div className="mt-2 text-xl font-semibold text-white">N/A</div>
           <div className="mt-1 text-[10px] text-zinc-500">No local battery telemetry</div>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-8 max-w-sm rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
        <label className="block text-sm font-medium text-white mb-2">
          Surplus Limit (kWh)
        </label>
        <input 
          type="number" 
          step="0.01"
          value={surplusLimit} 
          onChange={(e) => setSurplusLimit(e.target.value)} 
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2 text-white outline-none focus:border-cyan-400"
          placeholder="e.g. 5.5"
        />
        <button 
          type="submit" 
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Limit"}
        </button>
      </form>
    </div>
  );
}
