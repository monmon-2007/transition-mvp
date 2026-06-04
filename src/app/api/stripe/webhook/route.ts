import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { backendFetch } from "@/lib/backendClient";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        if (userId && plan) {
          await backendFetch(`/api/users/${userId}/subscription`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              plan,
              status: "active",
            }),
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          const status = subscription.status === "active" || subscription.status === "trialing"
            ? "active"
            : subscription.status === "past_due"
            ? "past_due"
            : "cancelled";
          const plan = subscription.metadata?.plan || "pro";
          await backendFetch(`/api/users/${userId}/subscription`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              plan,
              status,
            }),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await backendFetch(`/api/users/${userId}/subscription`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan: "free",
              status: "cancelled",
            }),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // In newer Stripe versions, subscription is accessed via parent.subscription_details
        const subscriptionId = (invoice as any).subscription as string
          || invoice.parent?.subscription_details?.subscription as string;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          if (userId) {
            await backendFetch(`/api/users/${userId}/subscription`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "past_due" }),
            });
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Return 200 so Stripe doesn't retry — we logged the error
  }

  return NextResponse.json({ received: true });
}
