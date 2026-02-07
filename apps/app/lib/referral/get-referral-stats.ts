import "server-only";

import { database } from "@repo/backend/database";
import { stripe } from "@/lib/stripe";
import { REFERRAL_CREDIT_CENTS } from "./constants";

export interface ReferralStats {
  creditBalanceCents: number;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarnedCents: number;
  referralsGiven: {
    id: string;
    referredName: string;
    status: "PENDING" | "COMPLETED" | "INVALID";
    creditedAt: Date | null;
    createdAt: Date;
  }[];
  referralReceived: {
    referrerName: string;
    status: "PENDING" | "COMPLETED" | "INVALID";
    creditedAt: Date | null;
    createdAt: Date;
  } | null;
}

export async function getReferralStats(
  organizationId: string,
  stripeCustomerId: string | null
): Promise<ReferralStats> {
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
  if (stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if ("balance" in customer) {
        // Stripe balance is positive for amount owed, negative for credit
        creditBalanceCents = customer.balance < 0 ? -customer.balance : 0;
      }
    } catch {
      // Customer not found or error, keep balance at 0
    }
  }

  // Calculate stats
  const completedReferralsList = referralsGiven.filter(
    (r) => r.status === "COMPLETED"
  );
  const totalEarnedCents =
    completedReferralsList.length * REFERRAL_CREDIT_CENTS;

  return {
    creditBalanceCents,
    totalReferrals: referralsGiven.length,
    completedReferrals: completedReferralsList.length,
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
  };
}
