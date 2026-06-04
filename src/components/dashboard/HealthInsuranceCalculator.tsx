"use client";

import React, { useState } from "react";
import {
  compareInsurance,
  type CoverageType,
  type InsuranceComparison,
} from "@/lib/healthInsuranceData";
import { formatCurrency } from "@/lib/runway";
import { Heart, ArrowRight } from "lucide-react";

export default function HealthInsuranceCalculator({
  defaultIncome,
}: {
  defaultIncome?: number;
}) {
  const [coverageType, setCoverageType] = useState<CoverageType>("individual");
  const [familySize, setFamilySize] = useState(1);
  const [income, setIncome] = useState(defaultIncome ? String(defaultIncome) : "");
  const [result, setResult] = useState<InsuranceComparison | null>(null);

  function handleCalculate() {
    const incNum = parseInt(income.replace(/[$,\s]/g, ""), 10);
    if (isNaN(incNum) || incNum <= 0) return;
    setResult(compareInsurance(coverageType, incNum, familySize));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-2.5 mb-1.5">
        <Heart className="w-4 h-4 text-rose-500" />
        <h3 className="text-sm font-semibold text-gray-900">COBRA vs. ACA Marketplace</h3>
      </div>
      <p className="text-xs text-gray-400 mb-5">Compare your health insurance options after layoff</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* Coverage type */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Coverage</label>
          <div className="flex gap-2">
            {(["individual", "family"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCoverageType(type)}
                className={`flex-1 px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors ${
                  coverageType === type
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {type === "individual" ? "Just me" : "Family"}
              </button>
            ))}
          </div>
        </div>

        {/* Family size */}
        {coverageType === "family" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Family size</label>
            <select
              value={familySize}
              onChange={(e) => setFamilySize(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} people</option>
              ))}
            </select>
          </div>
        )}

        {/* Income */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Expected annual income</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCalculate()}
              placeholder="75,000"
              className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={!income}
        className="flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 disabled:text-gray-300 transition-colors mb-5"
      >
        Compare options <ArrowRight className="w-3.5 h-3.5" />
      </button>

      {/* Results */}
      {result && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">COBRA monthly</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(result.cobraMonthly)}</p>
              <p className="text-xs text-gray-400">Your current plan</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-xs text-emerald-600 mb-1">ACA estimate</p>
              <p className="text-lg font-bold text-emerald-800">
                {result.acaMonthly === 0 ? "Free" : formatCurrency(result.acaMonthly)}
              </p>
              <p className="text-xs text-emerald-600/70">Marketplace plan</p>
            </div>
          </div>

          {result.monthlySavings > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 mb-3">
              <p className="text-sm font-semibold text-emerald-800">
                Potential savings: {formatCurrency(result.monthlySavings)}/mo ({formatCurrency(result.annualSavings)}/yr)
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500 leading-relaxed">{result.recommendation}</p>
          <p className="text-xs text-gray-400 mt-2">
            Estimates based on national averages. Check healthcare.gov for exact plans in your area.
          </p>
        </div>
      )}
    </div>
  );
}
