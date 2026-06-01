"use client";

import React, { useState, useEffect } from "react";
import { estimateUnemployment, STATE_OPTIONS, type UIEstimate } from "@/lib/unemploymentData";
import { formatCurrency } from "@/lib/runway";
import { Landmark, Plus, Check } from "lucide-react";

export default function UnemploymentEstimator({
  defaultState,
  defaultSalary,
  onAddToRunway,
}: {
  defaultState?: string;
  defaultSalary?: number;
  onAddToRunway?: (monthlyAmount: number, weeks: number) => void;
}) {
  const [stateCode, setStateCode] = useState(defaultState?.toUpperCase().slice(0, 2) || "");
  const [salary, setSalary] = useState(defaultSalary ? String(defaultSalary) : "");
  const [result, setResult] = useState<UIEstimate | null>(null);
  const [addedToRunway, setAddedToRunway] = useState(false);

  useEffect(() => {
    if (!stateCode || !salary) { setResult(null); return; }
    const salNum = parseInt(salary.replace(/[$,\s]/g, ""), 10);
    if (isNaN(salNum) || salNum <= 0) { setResult(null); return; }
    setResult(estimateUnemployment(stateCode, salNum));
    setAddedToRunway(false);
  }, [stateCode, salary]);

  function handleAddToRunway() {
    if (!result || !onAddToRunway) return;
    onAddToRunway(result.monthlyEquivalent, result.totalWeeks);
    setAddedToRunway(true);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Landmark className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-gray-900">Unemployment Benefits Estimator</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">Estimate your state unemployment insurance benefits</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* State */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">State</label>
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select state</option>
            {STATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Annual salary */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Prior annual salary</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="120,000"
              className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-xs text-indigo-600 mb-0.5">Weekly</p>
              <p className="text-base font-bold text-indigo-900">${result.weeklyBenefit}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-xs text-indigo-600 mb-0.5">Duration</p>
              <p className="text-base font-bold text-indigo-900">{result.totalWeeks} wks</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-xs text-indigo-600 mb-0.5">Total</p>
              <p className="text-base font-bold text-indigo-900">{formatCurrency(result.totalBenefit)}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed mb-3">{result.note}</p>

          {onAddToRunway && (
            <button
              onClick={handleAddToRunway}
              disabled={addedToRunway}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                addedToRunway
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {addedToRunway ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Added to runway
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add to runway calculation
                </>
              )}
            </button>
          )}

          <p className="text-xs text-gray-400 mt-2">
            You must file with your state workforce agency to receive benefits. This is an estimate only.
          </p>
        </div>
      )}

      {stateCode && !result && (
        <p className="text-xs text-gray-400">State not in our database. Check your state&apos;s workforce agency website.</p>
      )}
    </div>
  );
}
