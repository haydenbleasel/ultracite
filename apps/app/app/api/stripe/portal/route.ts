import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const GET = async (request: NextRequest) => {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID required" },
      { status: 400 }
    );
  }

  // Find org by Convex ID — we try slug-based lookup as a fallback
  const allOrgs = await convexClient.query(
    api.organizations.getSubscribedWithInstallation,
    {}
  );
  let org = allOrgs.find((o) => o._id === organizationId) ?? null;
  if (!org) {
    org = await convexClient.query(api.organizations.getBySlug, {
      slug: organizationId,
    });
  }

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
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

  if (!org.stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.emailAddresses[0]?.emailAddress,
      name: org.name,
      metadata: { organizationId: org._id },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      line_items: [{ price: env.STRIPE_PRICE_ID }],
      success_url: new URL("/?checkout=success", origin).toString(),
      cancel_url: new URL("/?checkout=cancel", origin).toString(),
      metadata: { organizationId: org._id },
      subscription_data: {
        metadata: { organizationId: org._id },
      },
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
    customer: org.stripeCustomerId,
    return_url: origin,
  });

  redirect(portalSession.url);
};
