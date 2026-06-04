import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripe } from "@/lib/stripe";
import { backendFetch } from "@/lib/backendClient";

export async function POST() {
  const session = await getServerSession(authOptions as any) as any;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the user's Stripe customer ID from the backend
  const res = await backendFetch(`/api/users/${userId}/subscription`);
  if (!res.ok) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }
  const data = await res.json();
  if (!data.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: data.stripeCustomerId,
    return_url: `${process.env.APP_URL}/onboarding/layoff/dashboard`,
  });

  return NextResponse.json({ url: portalSession.url });
}
