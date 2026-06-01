/**
 * Salary Intelligence Engine
 *
 * Provides salary range estimates by role, level, and location.
 * Uses embedded market data (simplified) to give users a sense
 * of where an offer or target salary falls.
 */

export type SeniorityLevel = "entry" | "mid" | "senior" | "staff" | "principal" | "director" | "vp";

export type SalaryRange = {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

export type SalaryEstimate = {
  role: string;
  level: SeniorityLevel;
  location: string;
  range: SalaryRange;
  totalCompMultiplier: number; // multiply base by this for total comp estimate
  insight: string;
};

// Base salary data by role category (US national, 2024-2025 averages)
const ROLE_BASE_SALARIES: Record<string, Record<SeniorityLevel, SalaryRange>> = {
  "software-engineer": {
    entry:     { p25: 85000,  p50: 100000, p75: 120000, p90: 140000 },
    mid:       { p25: 110000, p50: 130000, p75: 155000, p90: 175000 },
    senior:    { p25: 140000, p50: 165000, p75: 195000, p90: 225000 },
    staff:     { p25: 180000, p50: 210000, p75: 250000, p90: 290000 },
    principal: { p25: 220000, p50: 260000, p75: 310000, p90: 360000 },
    director:  { p25: 200000, p50: 240000, p75: 290000, p90: 340000 },
    vp:        { p25: 250000, p50: 300000, p75: 370000, p90: 450000 },
  },
  "product-manager": {
    entry:     { p25: 80000,  p50: 95000,  p75: 115000, p90: 130000 },
    mid:       { p25: 105000, p50: 125000, p75: 145000, p90: 165000 },
    senior:    { p25: 135000, p50: 160000, p75: 185000, p90: 210000 },
    staff:     { p25: 170000, p50: 200000, p75: 235000, p90: 270000 },
    principal: { p25: 200000, p50: 240000, p75: 280000, p90: 330000 },
    director:  { p25: 190000, p50: 230000, p75: 275000, p90: 320000 },
    vp:        { p25: 240000, p50: 290000, p75: 350000, p90: 420000 },
  },
  "data-scientist": {
    entry:     { p25: 80000,  p50: 95000,  p75: 115000, p90: 130000 },
    mid:       { p25: 110000, p50: 130000, p75: 150000, p90: 170000 },
    senior:    { p25: 140000, p50: 165000, p75: 190000, p90: 220000 },
    staff:     { p25: 175000, p50: 205000, p75: 240000, p90: 280000 },
    principal: { p25: 210000, p50: 250000, p75: 300000, p90: 350000 },
    director:  { p25: 195000, p50: 235000, p75: 280000, p90: 330000 },
    vp:        { p25: 240000, p50: 285000, p75: 350000, p90: 420000 },
  },
  "designer": {
    entry:     { p25: 65000,  p50: 78000,  p75: 92000,  p90: 105000 },
    mid:       { p25: 85000,  p50: 105000, p75: 125000, p90: 145000 },
    senior:    { p25: 115000, p50: 135000, p75: 160000, p90: 185000 },
    staff:     { p25: 145000, p50: 170000, p75: 200000, p90: 235000 },
    principal: { p25: 170000, p50: 200000, p75: 240000, p90: 280000 },
    director:  { p25: 165000, p50: 200000, p75: 240000, p90: 285000 },
    vp:        { p25: 200000, p50: 245000, p75: 300000, p90: 360000 },
  },
  "marketing": {
    entry:     { p25: 50000,  p50: 62000,  p75: 75000,  p90: 88000 },
    mid:       { p25: 70000,  p50: 88000,  p75: 108000, p90: 125000 },
    senior:    { p25: 100000, p50: 120000, p75: 145000, p90: 170000 },
    staff:     { p25: 125000, p50: 150000, p75: 180000, p90: 210000 },
    principal: { p25: 150000, p50: 180000, p75: 215000, p90: 250000 },
    director:  { p25: 140000, p50: 170000, p75: 210000, p90: 250000 },
    vp:        { p25: 180000, p50: 220000, p75: 275000, p90: 340000 },
  },
  "operations": {
    entry:     { p25: 48000,  p50: 58000,  p75: 70000,  p90: 82000 },
    mid:       { p25: 65000,  p50: 80000,  p75: 98000,  p90: 115000 },
    senior:    { p25: 90000,  p50: 110000, p75: 135000, p90: 155000 },
    staff:     { p25: 115000, p50: 140000, p75: 165000, p90: 195000 },
    principal: { p25: 140000, p50: 170000, p75: 200000, p90: 240000 },
    director:  { p25: 130000, p50: 160000, p75: 195000, p90: 235000 },
    vp:        { p25: 170000, p50: 210000, p75: 260000, p90: 320000 },
  },
  "sales": {
    entry:     { p25: 50000,  p50: 60000,  p75: 72000,  p90: 85000 },
    mid:       { p25: 70000,  p50: 90000,  p75: 110000, p90: 130000 },
    senior:    { p25: 100000, p50: 125000, p75: 150000, p90: 180000 },
    staff:     { p25: 130000, p50: 155000, p75: 185000, p90: 220000 },
    principal: { p25: 155000, p50: 185000, p75: 220000, p90: 260000 },
    director:  { p25: 145000, p50: 175000, p75: 215000, p90: 260000 },
    vp:        { p25: 190000, p50: 235000, p75: 290000, p90: 360000 },
  },
};

// Location cost-of-living multipliers
const LOCATION_MULTIPLIERS: Record<string, number> = {
  "sf-bay-area": 1.25,
  "new-york": 1.20,
  "seattle": 1.15,
  "boston": 1.10,
  "los-angeles": 1.10,
  "austin": 1.00,
  "denver": 1.00,
  "chicago": 0.98,
  "atlanta": 0.95,
  "remote-us": 1.00,
  "other-us": 0.90,
};

// Total comp multipliers (base → total comp including equity/bonus)
const TOTAL_COMP_MULTIPLIERS: Record<string, number> = {
  "software-engineer": 1.35,
  "product-manager": 1.30,
  "data-scientist": 1.30,
  "designer": 1.15,
  "marketing": 1.15,
  "operations": 1.10,
  "sales": 1.50, // OTE / commission
};

export const ROLE_CATEGORIES = [
  { id: "software-engineer", label: "Software Engineer" },
  { id: "product-manager", label: "Product Manager" },
  { id: "data-scientist", label: "Data Scientist / ML" },
  { id: "designer", label: "Designer (UX/Product)" },
  { id: "marketing", label: "Marketing" },
  { id: "operations", label: "Operations / Biz Ops" },
  { id: "sales", label: "Sales / Account Exec" },
];

export const SENIORITY_LEVELS: { id: SeniorityLevel; label: string }[] = [
  { id: "entry", label: "Entry / Junior" },
  { id: "mid", label: "Mid-level" },
  { id: "senior", label: "Senior" },
  { id: "staff", label: "Staff / Lead" },
  { id: "principal", label: "Principal" },
  { id: "director", label: "Director" },
  { id: "vp", label: "VP / Head of" },
];

export const LOCATIONS = [
  { id: "sf-bay-area", label: "SF Bay Area" },
  { id: "new-york", label: "New York City" },
  { id: "seattle", label: "Seattle" },
  { id: "boston", label: "Boston" },
  { id: "los-angeles", label: "Los Angeles" },
  { id: "austin", label: "Austin" },
  { id: "denver", label: "Denver / Boulder" },
  { id: "chicago", label: "Chicago" },
  { id: "atlanta", label: "Atlanta" },
  { id: "remote-us", label: "Remote (US)" },
  { id: "other-us", label: "Other US" },
];

/**
 * Get salary estimate for a role/level/location combination
 */
export function getSalaryEstimate(
  roleCategory: string,
  level: SeniorityLevel,
  location: string
): SalaryEstimate | null {
  const roleData = ROLE_BASE_SALARIES[roleCategory];
  if (!roleData) return null;

  const baseRange = roleData[level];
  if (!baseRange) return null;

  const locMultiplier = LOCATION_MULTIPLIERS[location] || 1.0;
  const totalCompMultiplier = TOTAL_COMP_MULTIPLIERS[roleCategory] || 1.2;

  const range: SalaryRange = {
    p25: Math.round(baseRange.p25 * locMultiplier / 1000) * 1000,
    p50: Math.round(baseRange.p50 * locMultiplier / 1000) * 1000,
    p75: Math.round(baseRange.p75 * locMultiplier / 1000) * 1000,
    p90: Math.round(baseRange.p90 * locMultiplier / 1000) * 1000,
  };

  const roleLabel = ROLE_CATEGORIES.find((r) => r.id === roleCategory)?.label || roleCategory;
  const levelLabel = SENIORITY_LEVELS.find((l) => l.id === level)?.label || level;
  const locLabel = LOCATIONS.find((l) => l.id === location)?.label || location;

  // Generate insight
  let insight = `${levelLabel} ${roleLabel} roles in ${locLabel} typically pay $${formatK(range.p25)}–$${formatK(range.p75)} base.`;
  if (totalCompMultiplier > 1.2) {
    insight += ` Total comp (with equity/bonus) averages ${Math.round((totalCompMultiplier - 1) * 100)}% above base.`;
  }

  return {
    role: roleCategory,
    level,
    location,
    range,
    totalCompMultiplier,
    insight,
  };
}

/**
 * Evaluate where a specific salary falls in the range
 */
export function evaluateSalary(
  salary: number,
  estimate: SalaryEstimate
): { percentile: string; assessment: string; color: string } {
  const { range } = estimate;

  if (salary < range.p25) {
    return {
      percentile: "Below 25th",
      assessment: "Below market — you may have room to negotiate higher.",
      color: "text-red-600",
    };
  }
  if (salary < range.p50) {
    return {
      percentile: "25th–50th",
      assessment: "Below median — competitive but on the lower end.",
      color: "text-amber-600",
    };
  }
  if (salary < range.p75) {
    return {
      percentile: "50th–75th",
      assessment: "At or above median — a solid, competitive offer.",
      color: "text-emerald-600",
    };
  }
  if (salary < range.p90) {
    return {
      percentile: "75th–90th",
      assessment: "Above average — a strong offer for this role and location.",
      color: "text-blue-600",
    };
  }
  return {
    percentile: "90th+",
    assessment: "Exceptional — top of market for this role.",
    color: "text-violet-600",
  };
}

/**
 * Infer role category from job title string
 */
export function inferRoleCategory(title: string): string {
  const t = title.toLowerCase();
  if (/engineer|developer|swe|sde|frontend|backend|fullstack|devops|sre|platform/.test(t)) return "software-engineer";
  if (/product\s*manager|pm\b|product\s*lead|product\s*owner/.test(t)) return "product-manager";
  if (/data\s*scien|machine\s*learn|ml\b|ai\b|analyst/.test(t)) return "data-scientist";
  if (/design|ux|ui|creative/.test(t)) return "designer";
  if (/market|growth|brand|content|seo|social\s*media/.test(t)) return "marketing";
  if (/sales|account\s*exec|bdr|sdr|revenue/.test(t)) return "sales";
  if (/ops|operations|chief\s*of\s*staff|biz\s*ops|strategy/.test(t)) return "operations";
  return "software-engineer"; // default
}

/**
 * Infer seniority level from job title string
 */
export function inferSeniority(title: string): SeniorityLevel {
  const t = title.toLowerCase();
  if (/\bvp\b|vice\s*president|head\s*of/.test(t)) return "vp";
  if (/\bdirector\b/.test(t)) return "director";
  if (/\bprincipal\b/.test(t)) return "principal";
  if (/\bstaff\b|\blead\b|\barchitect\b/.test(t)) return "staff";
  if (/\bsenior\b|\bsr\.?\b/.test(t)) return "senior";
  if (/\bjunior\b|\bjr\.?\b|\bintern\b|\bentry\b|\bassociate\b/.test(t)) return "entry";
  return "mid";
}

function formatK(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}
