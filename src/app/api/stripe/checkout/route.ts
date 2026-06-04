import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripe, getPriceId } from "@/lib/stripe";
import { backendFetch } from "@/lib/backendClient";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any) as any;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  if (plan !== "pro" && plan !== "pro_plus") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = getPriceId(plan);
  const email = session.user.email;

  // Check if user already has a Stripe customer ID
  let customerId: string | undefined;
  try {
    const res = await backendFetch(`/api/users/${userId}/subscription`);
    if (res.ok) {
      const data = await res.json();
      customerId = data.stripeCustomerId || undefined;
    }
  } catch {
    // No existing customer — Stripe will create one
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    ...(customerId ? { customer: customerId } : { customer_email: email }),
    subscription_data: {
      trial_period_days: plan === "pro" ? 7 : undefined,
      metadata: { userId, plan },
    },
    metadata: { userId, plan },
    success_url: `${process.env.APP_URL}/onboarding/layoff/dashboard?subscription=success`,
    cancel_url: `${process.env.APP_URL}/pricing?subscription=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
