import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { api } from "../../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { env } from "@/lib/env";
import {
  applyPendingReferrerCredits,
  applyReferralCredits,
} from "@/lib/referral/apply-credits";
import { stripe } from "@/lib/stripe";

export const POST = async (request: NextRequest) => {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe webhook verification failed:", message);
    return NextResponse.json(
      { error: `Webhook error: ${message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "customer.subscription.created": {
      const session = event.data.object;
      const organizationId = session.metadata?.organizationId;
      const customerId = session.customer as string;

      if (organizationId && customerId) {
        // organizationId here is a Convex ID string
        await convexClient.mutation(api.organizations.setStripeCustomerId, {
          orgId: organizationId as any,
          stripeCustomerId: customerId,
        });
      }

      return new Response("OK", { status: 200 });
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      await convexClient.mutation(
        api.organizations.clearStripeCustomerIdByCustomer,
        { stripeCustomerId: customerId }
      );

      return new Response("OK", { status: 200 });
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;

      if (invoice.billing_reason === "subscription_create") {
        const results = await Promise.allSettled([
          applyReferralCredits(invoice),
          applyPendingReferrerCredits(invoice),
        ]);

        for (const result of results) {
          if (result.status === "rejected") {
            console.error("Referral credit error:", result.reason);
          }
        }
      }

      return new Response("OK", { status: 200 });
    }

    default: {
      return new Response("OK", { status: 200 });
    }
  }
};
