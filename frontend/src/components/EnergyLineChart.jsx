import React from "react";

// Simple SVG line chart for energy time series (produced/consumed/surplus)
export function EnergyLineChart({ records, height = 220 }) {
  if (!records || records.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-6 text-xs text-zinc-400">
        No energy data yet for this house. Once reports start arriving, a time-series chart will appear here.
      </div>
    );
  }

  const width = 800; // will scale via viewBox + CSS
  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 24;

  const timestamps = records.map((r) => r.timestamp);
  const producedValues = records.map((r) => r.energyProduced);
  const consumedValues = records.map((r) => r.energyConsumed);
  const surplusValues = records.map((r) => r.surplusEnergy);

  const minT = Math.min(...timestamps);
  const maxT = Math.max(...timestamps);
  const timeSpan = maxT - minT || 1;

  // Dynamic Y-axis scaling with padding
  const allValues = [...producedValues, ...consumedValues, ...surplusValues];
  let rawMin = Math.min(...allValues);
  let rawMax = Math.max(...allValues);

  // Handle edge cases: all values equal or very close
  const minRange = 0.5; // Minimum enforced range
  if (rawMax - rawMin < minRange) {
    const center = rawMax;
    rawMin = center - minRange / 2;
    rawMax = center + minRange / 2;
  }

  // Add 15% padding above max and below min
  const padding = (rawMax - rawMin) * 0.15 || 0.1;
  const minY = rawMin - padding;
  const maxY = rawMax + padding;

  const valueSpan = maxY - minY || 1;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  function toPoint(timestamp, value) {
    const x =
      paddingLeft +
      ((timestamp - minT) / timeSpan) * plotWidth;
    const y =
      paddingTop +
      (1 - (value - minY) / valueSpan) * plotHeight;
    return [x, y];
  }

  function buildPath(values) {
    return values
      .map((v, i) => {
        const [x, y] = toPoint(timestamps[i], v);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  const producedPath = buildPath(producedValues);
  const consumedPath = buildPath(consumedValues);
  const surplusPath = buildPath(surplusValues);

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    minY + (valueSpan * i) / yTicks
  );

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          Time-series (kWh) &mdash; latest {records.length} points
        </span>
        <div className="flex items-center gap-3">
          <LegendDot color="#22d3ee" label="Produced" />
          <LegendDot color="#fbbf24" label="Consumed" />
          <LegendDot color="#22c55e" label="Surplus" />
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-56 w-full"
        role="img"
        aria-label="Energy over time"
      >
        {/* Y grid lines */}
        {yTickValues.map((v, idx) => {
          const [, y] = toPoint(minT, v);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
                stroke="rgba(148, 163, 184, 0.2)"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="#9ca3af"
              >
                {v.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        <path
          d={producedPath}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={consumedPath}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={surplusPath}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-1 flex justify-end text-[10px] text-zinc-500">
        X-axis: time (most recent on the right)
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </span>
  );
}

