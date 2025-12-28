import { database } from "@repo/backend/database";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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

  if (!organization.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? request.nextUrl.origin;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: `${origin}/${organization.slug}`,
  });

  redirect(portalSession.url);
};
