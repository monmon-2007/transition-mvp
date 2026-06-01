"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { saveQuickStartIntake } from "@/lib/api/layoffIntake";
import { DollarSign, TrendingUp, ArrowRight, Loader2, AlertTriangle } from "lucide-react";

export default function FinancesQuickStart() {
  const router = useRouter();
  const [severanceAmount, setSeveranceAmount] = useState("");
  const [savings, setSavings] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runway = useMemo(() => {
    const sev = parseFloat(severanceAmount.replace(/[,$]/g, "")) || 0;
    const sav = parseFloat(savings.replace(/[,$]/g, "")) || 0;
    const exp = parseFloat(monthlyExpenses.replace(/[,$]/g, "")) || 0;
    if (exp <= 0) return null;
    return {
      months: Math.round(((sev + sav) / exp) * 10) / 10,
      total: sev + sav,
      expenses: exp,
    };
  }, [severanceAmount, savings, monthlyExpenses]);

  const riskColor = !runway
    ? "gray"
    : runway.months < 3
    ? "red"
    : runway.months < 6
    ? "amber"
    : "emerald";

  async function handleContinue() {
    setSaving(true);
    setError(null);
    try {
      const fields: Record<string, string | number | null> = {};
      if (severanceAmount) {
        fields.severanceOffered = "yes";
        fields.severanceAmount = severanceAmount;
      }
      if (savings) {
        fields.hasEmergencyFund = "yes";
        fields.emergencyFundAmount = savings;
      }
      if (monthlyExpenses) {
        fields.monthlyExpenses = parseFloat(monthlyExpenses.replace(/[,$]/g, "")) || 0;
      }
      await saveQuickStartIntake(fields, "finances");
      router.push("/onboarding/layoff/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Calculate your runway</h1>
      <p className="text-gray-500 mb-8">
        Three numbers to know exactly how much time you have. Fill in what you know.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Severance amount (total, before tax)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={severanceAmount}
              onChange={(e) => setSeveranceAmount(e.target.value)}
              placeholder="e.g. 45,000"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-gray-900 placeholder:text-gray-300"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Leave blank if no severance offered</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Total savings & liquid cash
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={savings}
              onChange={(e) => setSavings(e.target.value)}
              placeholder="e.g. 20,000"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-gray-900 placeholder:text-gray-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Monthly expenses (essentials)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(e.target.value)}
              placeholder="e.g. 4,500"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-gray-900 placeholder:text-gray-300"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Rent, food, utilities, insurance, debt minimums</p>
        </div>
      </div>

      {/* Instant runway preview */}
      {runway && (
        <div className={`mt-6 rounded-2xl p-5 bg-${riskColor}-50 border border-${riskColor}-200`}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className={`w-5 h-5 text-${riskColor}-600`} />
            <h3 className="font-semibold text-gray-900">Your Runway</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold text-${riskColor}-700`}>{runway.months}</span>
            <span className="text-sm text-gray-500">months</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            ${runway.total.toLocaleString()} total ÷ ${runway.expenses.toLocaleString()}/mo
          </p>
          {runway.months < 3 && (
            <p className="text-sm text-red-600 font-medium mt-2">
              Under 3 months — move quickly on job search and consider reducing expenses.
            </p>
          )}
          {runway.months >= 3 && runway.months < 6 && (
            <p className="text-sm text-amber-600 font-medium mt-2">
              Moderate runway — you have time to be thoughtful, but don&apos;t delay starting your search.
            </p>
          )}
          {runway.months >= 6 && (
            <p className="text-sm text-emerald-600 font-medium mt-2">
              Healthy runway — use this time wisely to find the right fit, not just the first offer.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={saving}
        className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 transition-all duration-200 shadow-lg shadow-violet-200/50"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Setting up your dashboard...
          </>
        ) : (
          <>
            Go to your dashboard
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      <p className="text-center text-xs text-gray-400 mt-3">
        You can refine these numbers on your dashboard anytime.
      </p>
    </div>
  );
}
