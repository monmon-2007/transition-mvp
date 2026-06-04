import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
  typescript: true,
});

/** Price IDs — set these in .env.local after creating products in Stripe Dashboard */
export const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_PRICE_ID || "",
  pro_plus_monthly: process.env.STRIPE_PRO_PLUS_PRICE_ID || "",
} as const;

/** Map plan names to price IDs */
export function getPriceId(plan: "pro" | "pro_plus"): string {
  const id = plan === "pro" ? PRICE_IDS.pro_monthly : PRICE_IDS.pro_plus_monthly;
  if (!id) throw new Error(`Stripe price ID not configured for ${plan}`);
  return id;
}

export type SubscriptionTier = "free" | "pro" | "pro_plus";

/** Feature limits per tier */
export const TIER_LIMITS: Record<SubscriptionTier, {
  maxApplications: number;
  maxResumes: number;
  aiResumeTailoring: boolean;
  aiCoverLetter: boolean;
  aiJobMatch: boolean;
  aiSeveranceAnalysis: boolean;
  offerNegotiation: boolean;
  salaryBenchmark: boolean;
  prioritySupport: boolean;
}> = {
  free: {
    maxApplications: 10,
    maxResumes: 1,
    aiResumeTailoring: false,
    aiCoverLetter: false,
    aiJobMatch: false,
    aiSeveranceAnalysis: false,
    offerNegotiation: false,
    salaryBenchmark: false,
    prioritySupport: false,
  },
  pro: {
    maxApplications: Infinity,
    maxResumes: Infinity,
    aiResumeTailoring: true,
    aiCoverLetter: true,
    aiJobMatch: true,
    aiSeveranceAnalysis: false,
    offerNegotiation: false,
    salaryBenchmark: false,
    prioritySupport: false,
  },
  pro_plus: {
    maxApplications: Infinity,
    maxResumes: Infinity,
    aiResumeTailoring: true,
    aiCoverLetter: true,
    aiJobMatch: true,
    aiSeveranceAnalysis: true,
    offerNegotiation: true,
    salaryBenchmark: true,
    prioritySupport: true,
  },
};
