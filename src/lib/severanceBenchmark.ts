/**
 * Severance Fairness Score
 *
 * Computes a percentile-based fairness score for a severance package
 * using tenure, industry, role level, and state data.
 *
 * Data sources: Aggregated from public outplacement surveys, BLS data,
 * and employment law firm benchmarks (2023-2025).
 */

export type FairnessRating = "below" | "fair" | "above" | "well-above";

export type FairnessResult = {
  percentile: number;          // 0-100
  rating: FairnessRating;
  medianWeeks: number;         // median weeks for their bracket
  userWeeks: number;           // estimated weeks their package equals
  annualSalaryEstimate: number;
  insights: string[];          // 2-4 contextual insights
};

// Median severance in weeks of pay by tenure bucket
const TENURE_MEDIAN_WEEKS: Record<string, number> = {
  "<1":   2,
  "1-2":  4,
  "2-5":  8,
  "5-10": 12,
  "10+":  16,
};

// Industry multiplier (some industries pay more/less than median)
const INDUSTRY_MULTIPLIER: Record<string, number> = {
  technology:     1.3,
  finance:        1.4,
  consulting:     1.2,
  pharma:         1.3,
  healthcare:     1.0,
  retail:         0.8,
  manufacturing:  0.9,
  media:          1.0,
  government:     0.7,
  nonprofit:      0.7,
  other:          1.0,
};

// Role level multiplier (executives get more)
const LEVEL_MULTIPLIER: Record<string, number> = {
  individual:     1.0,
  senior:         1.1,
  lead:           1.2,
  manager:        1.3,
  director:       1.5,
  vp:             1.8,
  executive:      2.2,
};

// State enforcement strength affects negotiation leverage
const STATE_LEVERAGE: Record<string, "high" | "medium" | "low"> = {
  CA: "high",   // Strong employee protections, non-competes unenforceable
  NY: "high",
  MA: "high",
  IL: "high",
  WA: "high",
  CO: "high",
  NJ: "medium",
  PA: "medium",
  TX: "low",
  FL: "low",
  GA: "low",
  NC: "low",
  OH: "medium",
  VA: "medium",
  MN: "high",
  OR: "high",
  CT: "medium",
  MD: "medium",
};

// Average salary estimates by role category (for converting package $ to weeks)
const ROLE_SALARY_ESTIMATES: Record<string, number> = {
  engineering:  140000,
  product:      145000,
  design:       125000,
  data:         135000,
  marketing:    110000,
  sales:        120000,
  operations:   105000,
  finance:      130000,
  management:   160000,
  other:        110000,
};

export function inferTenureBucket(terminationDate: string | null, startHint?: string): string {
  if (!terminationDate) return "2-5"; // default to median
  // If we have no start date, estimate from context
  // Users can provide tenure in the negotiation flow answers
  return "2-5";
}

export function computeFairnessScore(params: {
  severanceAmount: number | null;       // total dollar amount
  tenure?: string;                       // "<1" | "1-2" | "2-5" | "5-10" | "10+"
  roleCategory?: string;                // engineering, product, etc.
  roleLevel?: string;                   // individual, senior, manager, etc.
  industry?: string;                    // technology, finance, etc.
  state?: string;                       // 2-letter state code
  hasNonCompete?: boolean;
  hasReleaseOfClaims?: boolean;
  negotiationAnswersTenure?: string;    // from the negotiation flow
}): FairnessResult | null {
  const {
    severanceAmount,
    tenure = "2-5",
    roleCategory = "other",
    roleLevel = "individual",
    industry = "technology",
    state,
    hasNonCompete,
    hasReleaseOfClaims,
  } = params;

  if (!severanceAmount || severanceAmount <= 0) return null;

  // Estimate annual salary
  const annualSalary = ROLE_SALARY_ESTIMATES[roleCategory] || ROLE_SALARY_ESTIMATES.other;
  const weeklyPay = annualSalary / 52;

  // User's package in weeks
  const userWeeks = severanceAmount / weeklyPay;

  // Compute expected median for their profile
  const baseMed = TENURE_MEDIAN_WEEKS[tenure] || 8;
  const indMult = INDUSTRY_MULTIPLIER[industry] || 1.0;
  const lvlMult = LEVEL_MULTIPLIER[roleLevel] || 1.0;
  const medianWeeks = baseMed * indMult * lvlMult;

  // Percentile: how does their package compare?
  // Use a sigmoid-like curve centered on median
  const ratio = userWeeks / medianWeeks;
  let percentile: number;
  if (ratio <= 0.25) percentile = 5;
  else if (ratio <= 0.5) percentile = 15 + (ratio - 0.25) * 60;
  else if (ratio <= 0.75) percentile = 30 + (ratio - 0.5) * 80;
  else if (ratio <= 1.0) percentile = 50 + (ratio - 0.75) * 60;
  else if (ratio <= 1.5) percentile = 65 + (ratio - 1.0) * 40;
  else if (ratio <= 2.0) percentile = 85 + (ratio - 1.5) * 20;
  else percentile = 95 + Math.min(4, (ratio - 2.0) * 2);

  percentile = Math.round(Math.max(1, Math.min(99, percentile)));

  // Rating
  let rating: FairnessRating;
  if (percentile < 30) rating = "below";
  else if (percentile < 60) rating = "fair";
  else if (percentile < 80) rating = "above";
  else rating = "well-above";

  // Generate contextual insights
  const insights: string[] = [];

  if (rating === "below") {
    insights.push(`Your package equals about ${userWeeks.toFixed(1)} weeks of pay. The typical range for your tenure and industry is ${medianWeeks.toFixed(0)}-${(medianWeeks * 1.3).toFixed(0)} weeks.`);
    insights.push("There may be room to negotiate — most initial offers are not final.");
  } else if (rating === "fair") {
    insights.push(`Your package of ~${userWeeks.toFixed(1)} weeks is in line with the typical ${medianWeeks.toFixed(0)}-week median for your profile.`);
    insights.push("Even fair packages can sometimes be improved with a professional ask.");
  } else {
    insights.push(`Your package of ~${userWeeks.toFixed(1)} weeks exceeds the typical ${medianWeeks.toFixed(0)}-week median. This is a strong offer.`);
    insights.push("Focus your negotiation on non-monetary terms: non-compete removal, extended benefits, or references.");
  }

  if (hasNonCompete) {
    const leverage = state ? STATE_LEVERAGE[state] : undefined;
    if (leverage === "high") {
      insights.push(`Non-competes are difficult to enforce in your state. This gives you strong leverage to request removal or additional compensation.`);
    } else {
      insights.push("A non-compete restricts your future employment. Consider requesting its removal or narrower scope as part of your negotiation.");
    }
  }

  if (hasReleaseOfClaims) {
    insights.push("You're being asked to waive legal claims. This adds value to what the company is getting — and justifies asking for more in return.");
  }

  return {
    percentile,
    rating,
    medianWeeks: Math.round(medianWeeks),
    userWeeks: Math.round(userWeeks * 10) / 10,
    annualSalaryEstimate: annualSalary,
    insights,
  };
}

/**
 * Infer role level from job title string.
 */
export function inferRoleLevel(title: string | null): string {
  if (!title) return "individual";
  const t = title.toLowerCase();
  if (t.includes("vp") || t.includes("vice president")) return "vp";
  if (t.includes("director")) return "director";
  if (t.includes("cto") || t.includes("ceo") || t.includes("cfo") || t.includes("chief")) return "executive";
  if (t.includes("manager") || t.includes("head of")) return "manager";
  if (t.includes("lead") || t.includes("principal") || t.includes("staff")) return "lead";
  if (t.includes("senior") || t.includes("sr.") || t.includes("sr ")) return "senior";
  return "individual";
}
