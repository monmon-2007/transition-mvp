"use client";

import React, { useState } from "react";
import { useDashboard } from "../shared/DashboardContext";
import FinancialRunwayCard from "@/components/dashboard/FinancialRunwayCard";
import RunwayProjectionChart from "@/components/dashboard/RunwayProjectionChart";
import HealthInsuranceCalculator from "@/components/dashboard/HealthInsuranceCalculator";
import UnemploymentEstimator from "@/components/dashboard/UnemploymentEstimator";
import RunwayShareView from "@/components/dashboard/RunwayShareView";
import { saveMonthlyExpenses } from "@/lib/api/layoffIntake";
import { computeRunway, projectRunway } from "@/lib/runway";
import { Loader2, Share2 } from "lucide-react";

export default function RunwayPage() {
  const { intake, monthlyExpenses, setMonthlyExpenses } = useDashboard();
  const [showShare, setShowShare] = useState(false);
  const [uiBenefit, setUiBenefit] = useState<{ monthly: number; weeks: number } | null>(null);

  async function handleSave(amount: number) {
    setMonthlyExpenses(amount);
    try {
      await saveMonthlyExpenses(amount);
    } catch (err) {
      console.error("Failed to save monthly expenses:", err);
    }
  }

  if (!intake) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const runway = monthlyExpenses ? computeRunway(intake, monthlyExpenses) : null;
  const scenarios = runway
    ? projectRunway(runway, {
        cutExpensesPercent: 20,
        unemploymentWeekly: uiBenefit ? Math.round((uiBenefit.monthly * 12) / 52) : undefined,
        unemploymentWeeks: uiBenefit?.weeks,
      })
    : [];

  // Estimate salary for calculators
  const estimatedSalary = 120000; // default; could infer from role

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Main runway card */}
      <div className="relative">
        <FinancialRunwayCard
          intake={intake}
          monthlyExpenses={monthlyExpenses}
          onSave={handleSave}
        />
        {runway && (
          <button
            onClick={() => setShowShare(true)}
            className="absolute top-6 right-6 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        )}
      </div>

      {/* Projection chart */}
      {scenarios.length > 0 && (
        <RunwayProjectionChart scenarios={scenarios} />
      )}

      {/* Calculators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UnemploymentEstimator
          defaultState={intake.governingLaw?.toUpperCase().trim().slice(0, 2)}
          defaultSalary={estimatedSalary}
          onAddToRunway={(monthly, weeks) => setUiBenefit({ monthly, weeks })}
        />
        <HealthInsuranceCalculator
          defaultIncome={estimatedSalary}
        />
      </div>

      {/* Share modal */}
      {showShare && runway && (
        <RunwayShareView
          runway={runway}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
