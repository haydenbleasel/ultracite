import { database } from "@repo/backend/database";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const POST = async (request: NextRequest) => {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { organizationId } = (await request.json()) as {
    organizationId: string;
  };

  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID required" },
      { status: 400 }
    );
  }

  // Verify user is a member of this organization
  const membership = await database.organizationMember.findFirst({
    where: {
      userId: user.id,
      organizationId,
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const organization = membership.organization;
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const origin = `${protocol}://${env.VERCEL_PROJECT_PRODUCTION_URL}`;

  try {
    // If already subscribed, redirect to billing portal
    if (organization.stripeCustomerId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: organization.stripeCustomerId,
        return_url: origin,
      });

      return NextResponse.json({ url: portalSession.url });
    }

    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: organization.name,
      metadata: {
        organizationId: organization.id,
      },
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      line_items: [
        {
          price: env.STRIPE_PRICE_ID,
        },
      ],
      success_url: new URL(organization.slug, origin).toString(),
      cancel_url: new URL(organization.slug, origin).toString(),
      metadata: {
        organizationId: organization.id,
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
};
