import { database } from "@repo/backend/database";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const GET = async (request: NextRequest) => {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID required" },
      { status: 400 }
    );
  }

  // Verify user is a member of this organization
  const membership = await database.organizationMember.findFirst({
    include: {
      organization: true,
    },
    where: {
      organizationId,
      userId: user.id,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { organization } = membership;
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const origin = `${protocol}://${env.VERCEL_PROJECT_PRODUCTION_URL}`;

  // If not subscribed, redirect to checkout
  if (!organization.stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: {
        organizationId: organization.id,
      },
      name: organization.name,
    });

    const session = await stripe.checkout.sessions.create({
      cancel_url: new URL(
        `${organization.slug}?checkout=cancel`,
        origin
      ).toString(),
      customer: customer.id,
      line_items: [
        {
          price: env.STRIPE_PRICE_ID,
        },
      ],
      metadata: {
        organizationId: organization.id,
      },
      mode: "subscription",
      subscription_data: {
        metadata: {
          organizationId: organization.id,
        },
      },
      success_url: new URL(
        `${organization.slug}?checkout=success`,
        origin
      ).toString(),
    });

    if (session.url) {
      redirect(session.url);
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: `${origin}/${organization.slug}`,
  });

  redirect(portalSession.url);
};
