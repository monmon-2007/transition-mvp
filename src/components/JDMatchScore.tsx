"use client";

import React from "react";
import type { JDMatchResult } from "@/lib/jdMatch";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function JDMatchScore({ result }: { result: JDMatchResult }) {
  const color =
    result.score >= 70
      ? { ring: "stroke-emerald-500", bg: "stroke-emerald-100", text: "text-emerald-700", label: "Strong match" }
      : result.score >= 40
      ? { ring: "stroke-amber-500", bg: "stroke-amber-100", text: "text-amber-700", label: "Moderate match" }
      : { ring: "stroke-red-500", bg: "stroke-red-100", text: "text-red-700", label: "Weak match" };

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (result.score / 100) * circumference;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-4 mb-3">
        {/* Score ring */}
        <div className="relative flex-shrink-0">
          <svg width={64} height={64} className="-rotate-90">
            <circle cx={32} cy={32} r={radius} fill="none" className={color.bg} strokeWidth={4} />
            <circle
              cx={32} cy={32} r={radius} fill="none"
              className={color.ring} strokeWidth={4} strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-bold ${color.text}`}>{result.score}%</span>
          </div>
        </div>
        <div>
          <p className={`text-sm font-semibold ${color.text}`}>{color.label}</p>
          <p className="text-xs text-gray-400">{result.matched.length} of {result.totalJdKeywords} keywords matched</p>
        </div>
      </div>

      {/* Missing keywords */}
      {result.missing.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-400" />
            Missing from your resume ({result.missing.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.missing.slice(0, 12).map((kw) => (
              <span key={kw} className="text-[11px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                {kw}
              </span>
            ))}
            {result.missing.length > 12 && (
              <span className="text-[11px] text-gray-400">+{result.missing.length - 12} more</span>
            )}
          </div>
        </div>
      )}

      {/* Matched keywords */}
      {result.matched.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Matched ({result.matched.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.matched.slice(0, 8).map((kw) => (
              <span key={kw} className="text-[11px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                {kw}
              </span>
            ))}
            {result.matched.length > 8 && (
              <span className="text-[11px] text-gray-400">+{result.matched.length - 8} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
