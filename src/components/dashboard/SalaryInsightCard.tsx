"use client";

import React, { useState, useMemo } from "react";
import {
  getSalaryEstimate,
  evaluateSalary,
  inferRoleCategory,
  inferSeniority,
  ROLE_CATEGORIES,
  SENIORITY_LEVELS,
  LOCATIONS,
  type SalaryEstimate,
} from "@/lib/salaryIntelligence";
import { formatCurrency } from "@/lib/runway";
import { TrendingUp, X, DollarSign } from "lucide-react";

export default function SalaryInsightCard({
  defaultRole,
  onClose,
}: {
  defaultRole?: string;
  onClose: () => void;
}) {
  const inferredCategory = defaultRole ? inferRoleCategory(defaultRole) : "software-engineer";
  const inferredLevel = defaultRole ? inferSeniority(defaultRole) : "mid";

  const [roleCategory, setRoleCategory] = useState(inferredCategory);
  const [level, setLevel] = useState(inferredLevel);
  const [location, setLocation] = useState("remote-us");
  const [targetSalary, setTargetSalary] = useState("");

  const estimate = useMemo(
    () => getSalaryEstimate(roleCategory, level, location),
    [roleCategory, level, location]
  );

  const parsedSalary = parseFloat(targetSalary.replace(/[$,\s]/g, ""));
  const evaluation =
    estimate && !isNaN(parsedSalary) && parsedSalary > 0
      ? evaluateSalary(parsedSalary, estimate)
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-900">Salary Intelligence</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Inputs */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Role category</label>
              <select
                value={roleCategory}
                onChange={(e) => setRoleCategory(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ROLE_CATEGORIES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Seniority</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as any)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {SENIORITY_LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {LOCATIONS.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Salary range visualization */}
          {estimate && <SalaryRangeViz estimate={estimate} targetSalary={parsedSalary} />}

          {/* Target salary input */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Your target / offered salary (optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={targetSalary}
                onChange={(e) => setTargetSalary(e.target.value)}
                placeholder="150,000"
                className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Evaluation result */}
          {evaluation && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className={`w-4 h-4 ${evaluation.color}`} />
                <span className={`text-sm font-bold ${evaluation.color}`}>
                  {evaluation.percentile} percentile
                </span>
              </div>
              <p className="text-sm text-gray-600">{evaluation.assessment}</p>
            </div>
          )}

          {/* Insight */}
          {estimate && (
            <p className="text-xs text-gray-400 leading-relaxed">
              {estimate.insight} Data based on aggregated US market surveys — use as a directional guide, not a guarantee.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SalaryRangeViz({
  estimate,
  targetSalary,
}: {
  estimate: SalaryEstimate;
  targetSalary?: number;
}) {
  const { range } = estimate;
  const min = range.p25 * 0.85;
  const max = range.p90 * 1.1;
  const span = max - min;

  function pct(val: number): number {
    return Math.max(0, Math.min(100, ((val - min) / span) * 100));
  }

  const showTarget = targetSalary && !isNaN(targetSalary) && targetSalary > 0;

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-700 mb-3">Base salary range</p>

      {/* Bar */}
      <div className="relative h-8 mb-2">
        {/* Full track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-gray-200 rounded-full" />
        {/* 25-75 range */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 bg-indigo-300 rounded-full"
          style={{ left: `${pct(range.p25)}%`, width: `${pct(range.p75) - pct(range.p25)}%` }}
        />
        {/* Median marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-full"
          style={{ left: `${pct(range.p50)}%` }}
        />
        {/* Target marker */}
        {showTarget && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow"
            style={{ left: `${pct(targetSalary)}%` }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{formatCurrency(range.p25)}</span>
        <span className="font-semibold text-indigo-600">{formatCurrency(range.p50)} median</span>
        <span>{formatCurrency(range.p75)}</span>
        <span>{formatCurrency(range.p90)}</span>
      </div>

      {/* Total comp estimate */}
      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
        <span className="text-gray-500">Estimated total comp (median)</span>
        <span className="font-bold text-gray-900">
          {formatCurrency(Math.round(range.p50 * estimate.totalCompMultiplier / 1000) * 1000)}
        </span>
      </div>
    </div>
  );
}
