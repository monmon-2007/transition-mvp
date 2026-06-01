"use client";

import React, { useState } from "react";
import { type RunwayScenario, formatCurrency } from "@/lib/runway";

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PADDING = { top: 20, right: 20, bottom: 30, left: 55 };

export default function RunwayProjectionChart({
  scenarios,
}: {
  scenarios: RunwayScenario[];
}) {
  const [hoveredScenario, setHoveredScenario] = useState<number | null>(null);

  if (scenarios.length === 0) return null;

  // Find max values for scaling
  const allPoints = scenarios.flatMap((s) => s.data);
  const maxMonth = Math.max(...allPoints.map((p) => p.month));
  const maxRemaining = Math.max(...allPoints.map((p) => p.remaining));

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  function x(month: number) {
    return PADDING.left + (month / maxMonth) * plotWidth;
  }

  function y(amount: number) {
    return PADDING.top + plotHeight - (amount / maxRemaining) * plotHeight;
  }

  function pathD(data: RunwayScenario["data"]) {
    return data
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.month).toFixed(1)} ${y(p.remaining).toFixed(1)}`)
      .join(" ");
  }

  // Y-axis labels (4 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    value: maxRemaining * pct,
    y: y(maxRemaining * pct),
  }));

  // X-axis labels
  const xStep = maxMonth <= 6 ? 1 : maxMonth <= 12 ? 2 : 3;
  const xTicks: number[] = [];
  for (let i = 0; i <= maxMonth; i += xStep) xTicks.push(i);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Runway Projection</h3>
      <p className="text-xs text-gray-400 mb-4">Month-by-month cash remaining under different scenarios</p>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        style={{ maxHeight: 240 }}
      >
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <line
            key={tick.value}
            x1={PADDING.left}
            x2={CHART_WIDTH - PADDING.right}
            y1={tick.y}
            y2={tick.y}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <text
            key={tick.value}
            x={PADDING.left - 8}
            y={tick.y + 3}
            textAnchor="end"
            className="fill-gray-400"
            fontSize={10}
          >
            {formatCurrency(tick.value)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((month) => (
          <text
            key={month}
            x={x(month)}
            y={CHART_HEIGHT - 5}
            textAnchor="middle"
            className="fill-gray-400"
            fontSize={10}
          >
            {month}mo
          </text>
        ))}

        {/* Zero line */}
        <line
          x1={PADDING.left}
          x2={CHART_WIDTH - PADDING.right}
          y1={y(0)}
          y2={y(0)}
          stroke="#e5e7eb"
          strokeWidth={1.5}
        />

        {/* Scenario lines */}
        {scenarios.map((scenario, i) => (
          <path
            key={scenario.label}
            d={pathD(scenario.data)}
            fill="none"
            stroke={scenario.color}
            strokeWidth={hoveredScenario === null || hoveredScenario === i ? 2.5 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={hoveredScenario === null || hoveredScenario === i ? 1 : 0.25}
            className="transition-all duration-200"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {scenarios.map((scenario, i) => (
          <button
            key={scenario.label}
            onMouseEnter={() => setHoveredScenario(i)}
            onMouseLeave={() => setHoveredScenario(null)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-opacity ${
              hoveredScenario === null || hoveredScenario === i ? "opacity-100" : "opacity-40"
            }`}
          >
            <span
              className="w-3 h-0.5 rounded-full"
              style={{ backgroundColor: scenario.color }}
            />
            {scenario.label}
          </button>
        ))}
      </div>
    </div>
  );
}
