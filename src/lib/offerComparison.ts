/**
 * Offer Comparison Calculator
 *
 * Evaluates and compares job offers holistically:
 * base + bonus + equity + benefits + intangibles.
 */

export type OfferInput = {
  company: string;
  role: string;
  baseSalary: number;
  signingBonus?: number;
  annualBonus?: number;          // expected annual bonus
  bonusTargetPercent?: number;   // target bonus as % of base
  equityValue?: number;          // total equity grant value
  vestingYears?: number;         // typically 4
  equityType?: "rsu" | "options" | "none";
  healthBenefitValue?: number;   // monthly employer contribution estimate
  retirement401kMatch?: number;  // annual 401k match
  ptoWeeks?: number;
  remotePolicy?: "remote" | "hybrid" | "onsite";
  commuteMinutes?: number;       // one-way daily commute
};

export type OfferAnalysis = {
  totalCompYear1: number;
  totalCompAnnualized: number;   // averaged over vesting period
  monthlyTakeHome: number;       // rough estimate
  components: { label: string; amount: number; note?: string }[];
  insights: string[];
  commuteAnnualCost?: number;
};

export type OfferComparison = {
  offers: OfferAnalysis[];
  recommendation: string;
  differencePercent: number;
};

// Rough federal + state tax estimate (simplified)
function estimateAnnualTax(gross: number): number {
  if (gross <= 44725) return gross * 0.22;
  if (gross <= 95375) return 44725 * 0.22 + (gross - 44725) * 0.24;
  if (gross <= 182100) return 44725 * 0.22 + (95375 - 44725) * 0.24 + (gross - 95375) * 0.32;
  return gross * 0.35; // simplified high bracket
}

const COMMUTE_COST_PER_MILE_MINUTE = 0.58; // IRS mileage approximation per minute of driving

export function analyzeOffer(offer: OfferInput): OfferAnalysis {
  const components: OfferAnalysis["components"] = [];
  const insights: string[] = [];

  // Base salary
  components.push({ label: "Base salary", amount: offer.baseSalary });

  // Signing bonus (year 1 only)
  if (offer.signingBonus && offer.signingBonus > 0) {
    components.push({ label: "Signing bonus", amount: offer.signingBonus, note: "Year 1 only" });
  }

  // Annual bonus
  const annualBonus = offer.annualBonus ||
    (offer.bonusTargetPercent ? offer.baseSalary * (offer.bonusTargetPercent / 100) : 0);
  if (annualBonus > 0) {
    components.push({ label: "Target bonus", amount: annualBonus, note: "At target" });
  }

  // Equity
  let annualEquity = 0;
  if (offer.equityValue && offer.equityValue > 0) {
    const vestingYears = offer.vestingYears || 4;
    annualEquity = offer.equityValue / vestingYears;
    components.push({
      label: `Equity (${offer.equityType === "options" ? "options" : "RSUs"})`,
      amount: annualEquity,
      note: `${formatK(offer.equityValue)} over ${vestingYears}yr`,
    });
  }

  // Benefits
  const healthAnnual = (offer.healthBenefitValue || 0) * 12;
  if (healthAnnual > 0) {
    components.push({ label: "Health benefits", amount: healthAnnual, note: "Employer contribution" });
  }

  if (offer.retirement401kMatch && offer.retirement401kMatch > 0) {
    components.push({ label: "401(k) match", amount: offer.retirement401kMatch });
  }

  // Total comp
  const totalCompYear1 = offer.baseSalary +
    (offer.signingBonus || 0) +
    annualBonus +
    annualEquity +
    healthAnnual +
    (offer.retirement401kMatch || 0);

  const totalCompAnnualized = offer.baseSalary +
    annualBonus +
    annualEquity +
    healthAnnual +
    (offer.retirement401kMatch || 0);

  // Monthly take-home (rough estimate)
  const taxableIncome = offer.baseSalary + annualBonus;
  const annualTax = estimateAnnualTax(taxableIncome);
  const monthlyTakeHome = Math.round((taxableIncome - annualTax) / 12);

  // Commute cost
  let commuteAnnualCost: number | undefined;
  if (offer.commuteMinutes && offer.commuteMinutes > 0 && offer.remotePolicy !== "remote") {
    const daysPerWeek = offer.remotePolicy === "hybrid" ? 3 : 5;
    const annualCommuteDays = daysPerWeek * 48; // 48 working weeks
    commuteAnnualCost = Math.round(offer.commuteMinutes * 2 * annualCommuteDays * COMMUTE_COST_PER_MILE_MINUTE);
    insights.push(`Commute costs ~${formatK(commuteAnnualCost)}/yr (${offer.commuteMinutes}min each way, ${daysPerWeek}d/wk)`);
  }

  // PTO insight
  if (offer.ptoWeeks) {
    const ptoValue = Math.round((offer.baseSalary / 52) * offer.ptoWeeks);
    insights.push(`${offer.ptoWeeks} weeks PTO = ~${formatK(ptoValue)} in time value`);
  }

  // Equity insight
  if (offer.equityType === "options") {
    insights.push("Options require exercise — consider tax implications (AMT) and liquidity risk.");
  }

  return {
    totalCompYear1,
    totalCompAnnualized,
    monthlyTakeHome,
    components,
    insights,
    commuteAnnualCost,
  };
}

export function compareOffers(offers: OfferInput[]): OfferComparison {
  const analyses = offers.map(analyzeOffer);

  let recommendation = "";
  let differencePercent = 0;

  if (analyses.length === 2) {
    const [a, b] = analyses;
    const diff = a.totalCompAnnualized - b.totalCompAnnualized;
    differencePercent = Math.round((Math.abs(diff) / Math.min(a.totalCompAnnualized, b.totalCompAnnualized)) * 100);

    if (Math.abs(differencePercent) < 5) {
      recommendation = `These offers are within 5% of each other (${formatK(Math.abs(diff))}). Focus on non-monetary factors: growth potential, team, remote policy, and your gut feeling.`;
    } else {
      const better = diff > 0 ? offers[0].company : offers[1].company;
      recommendation = `${better} offers ${differencePercent}% more total comp (${formatK(Math.abs(diff))}/yr). Consider if the lower offer has advantages in growth, culture, or work-life balance that offset the gap.`;
    }
  }

  return { offers: analyses, recommendation, differencePercent };
}

function formatK(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
