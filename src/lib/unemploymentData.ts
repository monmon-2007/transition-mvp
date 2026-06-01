/**
 * State unemployment insurance benefit data.
 *
 * Sources: DOL, state workforce agency websites (2024-2025).
 * Note: These are approximations. Actual benefits depend on
 * base period wages, eligibility, and state-specific rules.
 */

export type StateUIData = {
  maxWeekly: number;         // Maximum weekly benefit amount
  maxWeeks: number;          // Maximum weeks of benefits
  replacementRate: number;   // Typical % of prior wages replaced (0-1)
  waitingWeek: boolean;      // Whether there's an unpaid waiting week
};

// Major states — covers ~80% of US workforce
export const STATE_UI: Record<string, StateUIData> = {
  AL: { maxWeekly: 315, maxWeeks: 26, replacementRate: 0.33, waitingWeek: true },
  AZ: { maxWeekly: 320, maxWeeks: 26, replacementRate: 0.33, waitingWeek: true },
  CA: { maxWeekly: 450, maxWeeks: 26, replacementRate: 0.45, waitingWeek: true },
  CO: { maxWeekly: 742, maxWeeks: 26, replacementRate: 0.55, waitingWeek: true },
  CT: { maxWeekly: 724, maxWeeks: 26, replacementRate: 0.50, waitingWeek: false },
  DC: { maxWeekly: 444, maxWeeks: 26, replacementRate: 0.50, waitingWeek: true },
  FL: { maxWeekly: 275, maxWeeks: 12, replacementRate: 0.25, waitingWeek: true },
  GA: { maxWeekly: 365, maxWeeks: 26, replacementRate: 0.33, waitingWeek: false },
  HI: { maxWeekly: 765, maxWeeks: 26, replacementRate: 0.55, waitingWeek: true },
  IL: { maxWeekly: 632, maxWeeks: 26, replacementRate: 0.47, waitingWeek: true },
  MA: { maxWeekly: 1015, maxWeeks: 30, replacementRate: 0.55, waitingWeek: true },
  MD: { maxWeekly: 430, maxWeeks: 26, replacementRate: 0.38, waitingWeek: false },
  MI: { maxWeekly: 362, maxWeeks: 20, replacementRate: 0.33, waitingWeek: true },
  MN: { maxWeekly: 820, maxWeeks: 26, replacementRate: 0.50, waitingWeek: false },
  NC: { maxWeekly: 350, maxWeeks: 12, replacementRate: 0.30, waitingWeek: true },
  NJ: { maxWeekly: 830, maxWeeks: 26, replacementRate: 0.55, waitingWeek: true },
  NY: { maxWeekly: 504, maxWeeks: 26, replacementRate: 0.40, waitingWeek: true },
  OH: { maxWeekly: 580, maxWeeks: 26, replacementRate: 0.45, waitingWeek: true },
  OR: { maxWeekly: 733, maxWeeks: 26, replacementRate: 0.55, waitingWeek: true },
  PA: { maxWeekly: 594, maxWeeks: 26, replacementRate: 0.45, waitingWeek: true },
  TX: { maxWeekly: 577, maxWeeks: 26, replacementRate: 0.40, waitingWeek: false },
  VA: { maxWeekly: 378, maxWeeks: 26, replacementRate: 0.33, waitingWeek: true },
  WA: { maxWeekly: 999, maxWeeks: 26, replacementRate: 0.55, waitingWeek: true },
};

export type UIEstimate = {
  weeklyBenefit: number;
  totalWeeks: number;
  totalBenefit: number;
  monthlyEquivalent: number;
  waitingWeek: boolean;
  note: string;
};

/**
 * Estimate unemployment benefits for a given state and salary.
 * Returns null if the state is not in our data.
 */
export function estimateUnemployment(
  stateCode: string,
  annualSalary: number,
): UIEstimate | null {
  const state = STATE_UI[stateCode.toUpperCase()];
  if (!state) return null;

  const weeklyWage = annualSalary / 52;
  const rawBenefit = weeklyWage * state.replacementRate;
  const weeklyBenefit = Math.min(Math.round(rawBenefit), state.maxWeekly);
  const effectiveWeeks = state.waitingWeek ? state.maxWeeks - 1 : state.maxWeeks;
  const totalBenefit = weeklyBenefit * effectiveWeeks;
  const monthlyEquivalent = Math.round((weeklyBenefit * 52) / 12);

  let note = `Up to $${weeklyBenefit}/week for ${state.maxWeeks} weeks in your state.`;
  if (state.waitingWeek) {
    note += " There is a 1-week unpaid waiting period.";
  }
  if (state.maxWeeks < 20) {
    note += " Your state has shorter-than-average benefit duration.";
  }

  return {
    weeklyBenefit,
    totalWeeks: state.maxWeeks,
    totalBenefit,
    monthlyEquivalent,
    waitingWeek: state.waitingWeek,
    note,
  };
}

export const STATE_OPTIONS = Object.keys(STATE_UI).sort().map((code) => ({
  value: code,
  label: code,
}));
