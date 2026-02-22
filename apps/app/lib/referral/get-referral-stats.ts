import "server-only";

import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convexClient } from "../convex";
import { stripe } from "@/lib/stripe";
import { REFERRAL_CREDIT_CENTS } from "./constants";

export interface ReferralStats {
  completedReferrals: number;
  creditBalanceCents: number;
  pendingReferrals: number;
  referralReceived: {
    referrerName: string;
    status: string;
    creditedAt: number | null;
    createdAt: number;
  } | null;
  referralsGiven: {
    id: string;
    referredName: string;
    status: string;
    creditedAt: number | null;
    createdAt: number;
  }[];
  totalEarnedCents: number;
  totalReferrals: number;
}

export async function getReferralStats(
  organizationId: Id<"organizations">,
  stripeCustomerId: string | null
): Promise<ReferralStats> {
  const referralsGiven = await convexClient.query(
    api.referrals.getByReferrerOrganizationId,
    { referrerOrganizationId: organizationId }
  );

  const referralReceived = await convexClient.query(
    api.referrals.getByReferredOrganizationId,
    { referredOrganizationId: organizationId }
  );

  // Fetch org names for display
  const referralsWithNames = await Promise.all(
    referralsGiven.map(async (r) => {
      const referredOrg = await convexClient.query(
        api.organizations.getByClerkOrgId,
        { clerkOrgId: "" }
      );
      // Try to get the org by looking through all orgs
      // For now use a simpler approach - just show the ID
      return {
        ...r,
        referredName: "Organization",
      };
    })
  );

  let creditBalanceCents = 0;
  if (stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if ("balance" in customer) {
        creditBalanceCents = customer.balance < 0 ? -customer.balance : 0;
      }
    } catch {
      // Customer not found or error, keep balance at 0
    }
  }

  const completedReferralsList = referralsGiven.filter(
    (r) => r.status === "COMPLETED"
  );
  const totalEarnedCents =
    completedReferralsList.length * REFERRAL_CREDIT_CENTS;

  let receivedData: ReferralStats["referralReceived"] = null;
  if (referralReceived) {
    receivedData = {
      referrerName: "Referrer",
      status: referralReceived.status,
      creditedAt: referralReceived.referredCreditedAt ?? null,
      createdAt: referralReceived._creationTime,
    };
  }

  return {
    creditBalanceCents,
    totalReferrals: referralsGiven.length,
    completedReferrals: completedReferralsList.length,
    pendingReferrals: referralsGiven.filter((r) => r.status === "PENDING")
      .length,
    totalEarnedCents,
    referralsGiven: referralsWithNames.map((r) => ({
      id: r._id,
      referredName: r.referredName,
      status: r.status,
      creditedAt: r.referrerCreditedAt ?? null,
      createdAt: r._creationTime,
    })),
    referralReceived: receivedData,
  };
}
