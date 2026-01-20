import { database } from "@repo/backend/database";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

const REFERRAL_CREDIT_CENTS = 500; // $5.00

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

  const org = membership.organization;

  // Get referrals given by this org
  const referralsGiven = await database.referral.findMany({
    where: { referrerOrganizationId: organizationId },
    include: {
      referredOrganization: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get referral received by this org (if any)
  const referralReceived = await database.referral.findUnique({
    where: { referredOrganizationId: organizationId },
    include: {
      referrerOrganization: {
        select: { name: true },
      },
    },
  });

  // Get credit balance from Stripe if customer exists
  let creditBalanceCents = 0;
  if (org.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(org.stripeCustomerId);
      if ("balance" in customer) {
        // Stripe balance is positive for amount owed, negative for credit
        creditBalanceCents = customer.balance < 0 ? -customer.balance : 0;
      }
    } catch {
      // Customer not found or error, keep balance at 0
    }
  }

  // Calculate stats
  const completedReferrals = referralsGiven.filter(
    (r) => r.status === "COMPLETED"
  );
  const totalEarnedCents = completedReferrals.length * REFERRAL_CREDIT_CENTS;

  return NextResponse.json({
    creditBalanceCents,
    totalReferrals: referralsGiven.length,
    completedReferrals: completedReferrals.length,
    pendingReferrals: referralsGiven.filter((r) => r.status === "PENDING")
      .length,
    totalEarnedCents,
    referralsGiven: referralsGiven.map((r) => ({
      id: r.id,
      referredName: r.referredOrganization.name,
      status: r.status,
      creditedAt: r.referrerCreditedAt,
      createdAt: r.createdAt,
    })),
    referralReceived: referralReceived
      ? {
          referrerName: referralReceived.referrerOrganization.name,
          status: referralReceived.status,
          creditedAt: referralReceived.referredCreditedAt,
          createdAt: referralReceived.createdAt,
        }
      : null,
  });
};
