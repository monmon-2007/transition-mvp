import { LayoffIntakeApiResponse } from "./api/layoffIntake";

export type RiskLevel = "high" | "medium" | "stable";

export type RunwayCashComponent = {
  label: string;
  amount: number;
  isEstimate?: boolean;
};

export type RunwayResult = {
  runwayMonths: number;
  totalCash: number;
  components: RunwayCashComponent[];
  monthlyExpenses: number;
  riskLevel: RiskLevel;
  isEstimated: boolean;
};

/**
 * Parse a dollar amount string into a number.
 * Handles: "$45,000", "45000", "45,000", "$90K", "90k", "$1.5M"
 * Returns null if the string cannot be parsed as a dollar amount.
 */
export function parseDollarAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;

  const cleaned = raw.trim();

  // Must contain at least one digit
  if (!/\d/.test(cleaned)) return null;

  // If it contains words that aren't units, we can't parse it
  // e.g. "6 weeks", "3 months salary", "negotiated amount"
  // Allow: digits, $, commas, dots, spaces before K/M/B suffixes
  if (/[a-zA-Z]/.test(cleaned) && !/^[\d\s$,.]+(k|m|b)$/i.test(cleaned)) {
    return null;
  }

  // Strip $ and commas
  let normalized = cleaned.replace(/[$,\s]/g, "");

  // Handle K/M/B suffixes
  const suffix = normalized.slice(-1).toLowerCase();
  if (suffix === "k") return parseFloat(normalized.slice(0, -1)) * 1_000;
  if (suffix === "m") return parseFloat(normalized.slice(0, -1)) * 1_000_000;
  if (suffix === "b") return parseFloat(normalized.slice(0, -1)) * 1_000_000_000;

  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

function riskLevel(months: number): RiskLevel {
  if (months < 3) return "high";
  if (months < 6) return "medium";
  return "stable";
}

/**
 * Compute the financial runway from intake data and a monthly expense figure.
 * Returns null if monthlyExpenses is zero or not provided.
 */
export function computeRunway(
  intake: LayoffIntakeApiResponse,
  monthlyExpenses: number
): RunwayResult | null {
  if (!monthlyExpenses || monthlyExpenses <= 0) return null;

  const components: RunwayCashComponent[] = [];
  let isEstimated = false;

  // ── Severance ──
  if (intake.severanceOffered === "yes") {
    const parsed = parseDollarAmount(intake.severanceAmount);
    if (parsed !== null && parsed > 0) {
      const label =
        intake.severancePaymentType === "lump-sum"
          ? "Severance (lump sum)"
          : intake.severancePaymentType === "continued-payroll"
          ? "Severance (payroll continuation)"
          : "Severance";
      components.push({ label, amount: parsed });
    } else if (intake.severanceAmount) {
      // We know there's severance but can't parse the amount
      isEstimated = true;
    }
  }

  // ── PTO payout ──
  if (intake.ptoPayoutExpected === "yes") {
    // We don't have the PTO amount — mark as estimated
    isEstimated = true;
    // Don't add a 0 to components, just note it's estimated
  }

  // ── Pro-rated bonus ──
  if (intake.proRatedBonus === "yes" && intake.proRatedBonusAmount) {
    const parsed = parseDollarAmount(intake.proRatedBonusAmount);
    if (parsed !== null && parsed > 0) {
      components.push({ label: "Pro-rated bonus", amount: parsed });
    } else {
      isEstimated = true;
    }
  }

  // ── Bonus owed ──
  if (intake.bonusOwed === "yes" && intake.proRatedBonusAmount) {
    const parsed = parseDollarAmount(intake.proRatedBonusAmount);
    if (parsed !== null && parsed > 0 && !components.find((c) => c.label.includes("bonus"))) {
      components.push({ label: "Bonus owed", amount: parsed });
    }
  }

  // No cash data at all
  if (components.length === 0 && !isEstimated) {
    return null;
  }

  const totalCash = components.reduce((sum, c) => sum + c.amount, 0);
  const runwayMonths = totalCash > 0 ? totalCash / monthlyExpenses : 0;

  return {
    runwayMonths,
    totalCash,
    components,
    monthlyExpenses,
    riskLevel: riskLevel(runwayMonths),
    isEstimated,
  };
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${Math.round(amount).toLocaleString()}`;
}
