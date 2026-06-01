/**
 * COBRA vs ACA cost comparison data.
 *
 * COBRA: Employer group rate + 2% admin fee. Averages from KFF 2024 survey.
 * ACA: Marketplace benchmark plans by income bracket (with subsidies).
 *
 * These are national averages — actual costs vary by plan and insurer.
 */

export type CoverageType = "individual" | "family";
export type IncomeBracket = "low" | "moderate" | "middle" | "upper";

// Average monthly COBRA premiums (employee + employer portion + 2% admin)
export const COBRA_MONTHLY: Record<CoverageType, number> = {
  individual: 703,   // KFF 2024 average
  family: 1997,
};

// ACA marketplace estimates by income bracket (after subsidies)
// Based on benchmark silver plan data
const ACA_ESTIMATES: Record<IncomeBracket, Record<CoverageType, number>> = {
  low:      { individual: 0,   family: 50 },    // < 150% FPL — very low or free
  moderate: { individual: 120, family: 350 },    // 150-250% FPL
  middle:   { individual: 280, family: 750 },    // 250-400% FPL
  upper:    { individual: 520, family: 1400 },   // > 400% FPL — full price
};

export function getIncomeBracket(annualIncome: number, familySize: number): IncomeBracket {
  // 2024 Federal Poverty Level approximations
  const fpl = 15060 + (familySize - 1) * 5380;
  const ratio = annualIncome / fpl;
  if (ratio < 1.5) return "low";
  if (ratio < 2.5) return "moderate";
  if (ratio < 4.0) return "middle";
  return "upper";
}

export type InsuranceComparison = {
  cobraMonthly: number;
  acaMonthly: number;
  monthlySavings: number;
  annualSavings: number;
  recommendation: string;
};

export function compareInsurance(
  coverageType: CoverageType,
  annualIncome: number,
  familySize: number,
): InsuranceComparison {
  const bracket = getIncomeBracket(annualIncome, familySize);
  const cobraMonthly = COBRA_MONTHLY[coverageType];
  const acaMonthly = ACA_ESTIMATES[bracket][coverageType];
  const monthlySavings = cobraMonthly - acaMonthly;
  const annualSavings = monthlySavings * 12;

  let recommendation: string;
  if (monthlySavings > 300) {
    recommendation = "ACA marketplace plans are likely much cheaper for your situation. Consider switching after your COBRA election window.";
  } else if (monthlySavings > 100) {
    recommendation = "ACA plans may save you money, but COBRA keeps your current doctors and network. Compare your specific plan options.";
  } else if (monthlySavings > 0) {
    recommendation = "Costs are similar. COBRA preserves your current coverage and doctors — it may be worth the small premium.";
  } else {
    recommendation = "COBRA is actually cheaper or comparable in your case. Consider keeping it, especially if you have ongoing care.";
  }

  return { cobraMonthly, acaMonthly, monthlySavings, annualSavings, recommendation };
}
