import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { backendFetch } from "@/lib/backendClient";
import type { SubscriptionTier } from "@/lib/stripe";
import { TIER_LIMITS } from "@/lib/stripe";

type SubscriptionInfo = {
  userId: string;
  plan: SubscriptionTier;
  status: string;
};

/** Emails that get free Pro+ access (comma-separated in env var) */
function getWhitelistedEmails(): Set<string> {
  const raw = process.env.PRO_PLUS_WHITELIST || "";
  return new Set(
    raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  );
}

/**
 * Gets the current user's subscription info from the backend.
 * Returns null if the user is not authenticated.
 */
export async function getSubscription(): Promise<SubscriptionInfo | null> {
  const session = await getServerSession(authOptions as any) as any;
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (!userId) return null;

  // Whitelist override — grant free Pro+ to specific emails
  if (userEmail && getWhitelistedEmails().has(userEmail.toLowerCase())) {
    return { userId, plan: "pro_plus", status: "active" };
  }

  try {
    const res = await backendFetch(`/api/users/${userId}/subscription`);
    if (res.ok) {
      const data = await res.json();
      return {
        userId,
        plan: (data.plan || "free") as SubscriptionTier,
        status: data.status || "active",
      };
    }
  } catch {
    // Fall through to free
  }

  return { userId, plan: "free", status: "active" };
}

/**
 * Checks if the user has access to a specific feature.
 * Returns { allowed: true } or { allowed: false, requiredPlan }.
 */
export async function checkFeatureAccess(
  feature: keyof typeof TIER_LIMITS["free"]
): Promise<{ allowed: true; userId: string } | { allowed: false; requiredPlan: "pro" | "pro_plus" }> {
  const sub = await getSubscription();
  if (!sub) return { allowed: false, requiredPlan: "pro" };

  // If user has no subscription record yet (plan is "free" from default),
  // check if their backend record has a subscription_plan set.
  // Users without any subscription data are treated as free tier.
  const limits = TIER_LIMITS[sub.plan];
  if (limits[feature]) {
    return { allowed: true, userId: sub.userId };
  }

  // Determine which plan is needed
  const requiredPlan = TIER_LIMITS.pro[feature] ? "pro" : "pro_plus";
  return { allowed: false, requiredPlan };
}
