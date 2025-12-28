import { database } from "@repo/backend";
import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
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
    return NextResponse.json(
      { error: `Webhook error: ${message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const organizationId = session.metadata?.organizationId;
      const customerId = session.customer as string;

      if (organizationId && customerId) {
        await database.organization.update({
          where: { id: organizationId },
          data: { stripeCustomerId: customerId },
        });
      }

      return new Response("OK", { status: 200 });
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      // Remove stripeCustomerId to disable linting
      await database.organization.updateMany({
        where: { stripeCustomerId: customerId },
        data: { stripeCustomerId: null },
      });

      return new Response("OK", { status: 200 });
    }

    default: {
      return new Response("OK", { status: 200 });
    }
  }
};
