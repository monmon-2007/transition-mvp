"use client";
import React, { useState } from "react";
import Link from "next/link";
import { computeRunway, formatCurrency, type RunwayResult } from "@/lib/runway";
import { LayoffIntakeApiResponse } from "@/lib/api/layoffIntake";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  ArrowRight,
} from "lucide-react";

function FinancialRunwayCard({
  intake,
  monthlyExpenses,
  onSave,
}: {
  intake: LayoffIntakeApiResponse;
  monthlyExpenses: number | null;
  onSave: (amount: number) => Promise<void>;
}) {
  const [inputValue, setInputValue] = useState(
    monthlyExpenses ? String(Math.round(monthlyExpenses)) : ""
  );
  const [editing, setEditing] = useState(monthlyExpenses === null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sync if parent provides a value after mount (from backend)
  React.useEffect(() => {
    if (monthlyExpenses !== null && editing && inputValue === "") {
      setInputValue(String(Math.round(monthlyExpenses)));
      setEditing(false);
    }
  }, [monthlyExpenses]);

  const runway: RunwayResult | null = monthlyExpenses
    ? computeRunway(intake, monthlyExpenses)
    : null;

  async function handleSave() {
    const raw = inputValue.replace(/[$,\s]/g, "");
    const amount = parseFloat(raw);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid monthly amount.");
      return;
    }
    setError("");
    setSaving(true);
    await onSave(amount);
    setSaving(false);
    setEditing(false);
  }

  // ── Risk config ──
  const riskConfig = {
    high: {
      bar: "bg-red-500",
      badge: "bg-red-50 text-red-700 border border-red-200",
      panelBg: "bg-red-50 border border-red-100",
      textColor: "text-red-700",
      bulletColor: "bg-red-300",
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      label: "High Risk",
      bullets: [
        "Prioritize speed — getting applications out matters more than perfection right now",
        "Focus on networking: warm introductions move faster than cold applications",
        "File for unemployment immediately if you haven't — it extends your runway",
        "Consider roles slightly below your target level if they move faster",
      ],
    },
    medium: {
      bar: "bg-amber-400",
      badge: "bg-amber-50 text-amber-700 border border-amber-200",
      panelBg: "bg-amber-50 border border-amber-100",
      textColor: "text-amber-700",
      bulletColor: "bg-amber-300",
      icon: <Minus className="w-3.5 h-3.5" />,
      label: "Moderate",
      bullets: [
        "You have breathing room, but maintaining momentum matters",
        "Balance quality applications with consistent weekly outreach",
        "Your network is your most efficient path to interviews",
      ],
    },
    stable: {
      bar: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      panelBg: "bg-emerald-50 border border-emerald-100",
      textColor: "text-emerald-700",
      bulletColor: "bg-emerald-400",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      label: "Stable",
      bullets: [
        "You have time to be selective — target roles that advance your long-term goals",
        "Use this runway to research deeply and position yourself strategically",
        "Build relationships now, before urgency forces your hand",
      ],
    },
  };

  const MAX_BAR_MONTHS = 18;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Financial Runway
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Estimate based on the inputs you provided</p>
        </div>
        {runway && !editing && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${riskConfig[runway.riskLevel].badge}`}>
            {riskConfig[runway.riskLevel].icon}
            {riskConfig[runway.riskLevel].label}
          </span>
        )}
      </div>

      {/* Input state */}
      {editing ? (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Enter your estimated monthly expenses so we can calculate how long your funds will last.
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Include: rent/mortgage, food, utilities, insurance, minimum debt payments.
          </p>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="5,000"
                className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? "Saving\u2026" : "Calculate"}
            </button>
            {monthlyExpenses !== null && (
              <button
                onClick={() => { setEditing(false); setError(""); }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      ) : runway ? (
        /* Result state */
        <div>
          {/* Main number */}
          <div className="mb-5">
            <p className="text-3xl font-bold text-gray-900 leading-none">
              ~{runway.runwayMonths < 1
                ? `${Math.round(runway.runwayMonths * 4)} weeks`
                : `${runway.runwayMonths.toFixed(1)} months`}
            </p>
            {runway.isEstimated && (
              <p className="text-xs text-gray-400 mt-1">Estimated — some amounts could not be parsed precisely</p>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${riskConfig[runway.riskLevel].bar}`}
                style={{ width: `${Math.min((runway.runwayMonths / MAX_BAR_MONTHS) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-gray-400">
              <span>0</span>
              <span>6 mo</span>
              <span>12 mo</span>
              <span>18+ mo</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {runway.components.map((c) => (
              <div key={c.label} className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">{c.label}</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(c.amount)}</p>
              </div>
            ))}
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Monthly expenses</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(runway.monthlyExpenses)}/mo</p>
            </div>
            {intake.ptoPayoutExpected === "yes" && (
              <div className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">PTO payout</p>
                <p className="text-sm font-semibold text-gray-500 italic">not included</p>
              </div>
            )}
          </div>

          {/* What this means for you */}
          <div className={`rounded-lg px-4 py-4 mb-4 ${riskConfig[runway.riskLevel].panelBg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${riskConfig[runway.riskLevel].textColor}`}>
              What this means for you
            </p>
            <div className="flex flex-col gap-2">
              {riskConfig[runway.riskLevel].bullets.map((bullet, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${riskConfig[runway.riskLevel].bulletColor}`} />
                  <p className={`text-sm leading-relaxed ${riskConfig[runway.riskLevel].textColor}`}>{bullet}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setEditing(true); setInputValue(String(Math.round(runway.monthlyExpenses))); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Edit expenses
          </button>
        </div>
      ) : (
        /* Severance data missing state */
        <div>
          <p className="text-sm text-gray-500 mb-4">
            No severance data found to calculate a runway. If you received a package, add the details in your{" "}
            <a href="/onboarding/layoff/summary" className="text-blue-600 hover:underline">situation summary</a>.
          </p>
        </div>
      )}
    </div>
  );
}

export default FinancialRunwayCard;
export { FinancialRunwayCard };
