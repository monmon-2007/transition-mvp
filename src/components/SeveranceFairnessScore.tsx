"use client";

import React from "react";
import type { FairnessResult } from "@/lib/severanceBenchmark";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

const RATING_CONFIG = {
  below: {
    label: "Below Typical",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    ring: "stroke-red-500",
    ringBg: "stroke-red-100",
    icon: TrendingDown,
    iconColor: "text-red-500",
  },
  fair: {
    label: "Fair",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    ring: "stroke-amber-500",
    ringBg: "stroke-amber-100",
    icon: Minus,
    iconColor: "text-amber-500",
  },
  above: {
    label: "Above Typical",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    ring: "stroke-emerald-500",
    ringBg: "stroke-emerald-100",
    icon: TrendingUp,
    iconColor: "text-emerald-500",
  },
  "well-above": {
    label: "Well Above Typical",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    ring: "stroke-emerald-600",
    ringBg: "stroke-emerald-100",
    icon: TrendingUp,
    iconColor: "text-emerald-600",
  },
};

export default function SeveranceFairnessScore({
  result,
  compact = false,
}: {
  result: FairnessResult;
  compact?: boolean;
}) {
  const config = RATING_CONFIG[result.rating];
  const Icon = config.icon;

  // SVG ring math
  const radius = compact ? 32 : 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (result.percentile / 100) * circumference;
  const size = compact ? 76 : 100;
  const center = size / 2;
  const strokeWidth = compact ? 5 : 6;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl ${config.bg} ${config.border} border`}>
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={center} cy={center} r={radius} fill="none" className={config.ringBg} strokeWidth={strokeWidth} />
            <circle
              cx={center} cy={center} r={radius} fill="none"
              className={config.ring} strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${config.color}`}>{result.percentile}</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <Icon className={`w-4 h-4 ${config.iconColor}`} />
            <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            ~{result.userWeeks} weeks vs {result.medianWeeks} week median
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl ${config.bg} ${config.border} border p-6`}>
      <div className="flex items-start gap-5">
        {/* Score ring */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={center} cy={center} r={radius} fill="none" className={config.ringBg} strokeWidth={strokeWidth} />
            <circle
              cx={center} cy={center} r={radius} fill="none"
              className={config.ring} strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
              style={{ transition: "stroke-dasharray 0.7s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${config.color}`}>{result.percentile}</span>
            <span className="text-[10px] text-gray-400 -mt-0.5">percentile</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
            <h3 className={`font-bold text-lg ${config.color}`}>{config.label}</h3>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-500">Your package</p>
              <p className="text-sm font-semibold text-gray-900">~{result.userWeeks} weeks</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <p className="text-xs text-gray-500">Typical median</p>
              <p className="text-sm font-semibold text-gray-900">{result.medianWeeks} weeks</p>
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-2">
            {result.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
