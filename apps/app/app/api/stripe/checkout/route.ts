import { auth, clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const POST = async (request: NextRequest) => {
  const { userId } = await auth();

  if (!userId) {
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

  // Get org from Convex
  const organization = await convexClient.query(
    api.organizations.getByClerkOrgId,
    { clerkOrgId: "" }
  );

  // Since we have a Convex ID, fetch directly
  // We need to verify membership via Clerk
  const allOrgs = await convexClient.query(
    api.organizations.getSubscribedWithInstallation,
    {}
  );
  const org = allOrgs.find((o) => o._id === organizationId) ??
    (await (async () => {
      // Try fetching all orgs to find by ID
      const bySlug = await convexClient.query(api.organizations.getBySlug, {
        slug: organizationId,
      });
      return bySlug;
    })());

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Verify membership via Clerk
  const clerk = await clerkClient();
  try {
    const memberships =
      await clerk.organizations.getOrganizationMembershipList({
        organizationId: org.clerkOrgId,
      });
    const isMember = memberships.data.some(
      (m) => m.publicUserData?.userId === userId
    );
    if (!isMember) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const user = await clerk.users.getUser(userId);
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const origin = `${protocol}://${env.VERCEL_PROJECT_PRODUCTION_URL}`;

  try {
    if (org.stripeCustomerId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: origin,
      });

      return NextResponse.json({ url: portalSession.url });
    }

    const customer = await stripe.customers.create({
      email: user.emailAddresses[0]?.emailAddress,
      name: org.name,
      metadata: {
        organizationId: org._id,
      },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      line_items: [{ price: env.STRIPE_PRICE_ID }],
      success_url: origin,
      cancel_url: origin,
      metadata: { organizationId: org._id },
      subscription_data: {
        metadata: { organizationId: org._id },
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
