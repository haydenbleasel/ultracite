import "server-only";

import type Stripe from "stripe";
import { api } from "../../convex/_generated/api";
import { convexClient } from "../convex";
import { stripe } from "@/lib/stripe";
import { REFERRAL_CREDIT_CENTS } from "./constants";

async function applyCredit(
  customerId: string,
  description: string
): Promise<boolean> {
  try {
    await stripe.customers.createBalanceTransaction(customerId, {
      amount: -REFERRAL_CREDIT_CENTS,
      currency: "usd",
      description,
    });
    return true;
  } catch (error) {
    console.error("Failed to apply referral credit:", error);
    return false;
  }
}

export async function applyReferralCredits(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const org = await convexClient.query(
    api.organizations.getByStripeCustomerId,
    { stripeCustomerId: customerId }
  );

  if (!org) {
    return;
  }

  const referralReceived = await convexClient.query(
    api.referrals.getByReferredOrganizationId,
    { referredOrganizationId: org._id }
  );

  if (!referralReceived || referralReceived.status !== "PENDING") {
    return;
  }

  let referredCredited = referralReceived.referredCreditedAt !== undefined;

  if (!referredCredited) {
    const claimed = await convexClient.mutation(
      api.referrals.claimReferredCredit,
      {
        id: referralReceived._id,
        paidInvoiceId: invoice.id,
      }
    );

    if (!claimed) {
      return;
    }

    referredCredited = await applyCredit(customerId, "Referral signup bonus");

    if (!referredCredited) {
      await convexClient.mutation(api.referrals.rollbackReferredCredit, {
        id: referralReceived._id,
      });
      return;
    }
  }

  // Get referrer org to check if they have a Stripe customer
  const referrerOrgId = referralReceived.referrerOrganizationId;
  // We need to look up the referrer org to get stripeCustomerId
  const allOrgs = await convexClient.query(
    api.organizations.getSubscribedWithInstallation,
    {}
  );
  const referrerOrg = allOrgs.find((o) => o._id === referrerOrgId);

  let referrerCredited = referralReceived.referrerCreditedAt !== undefined;

  if (!referrerCredited && referrerOrg?.stripeCustomerId) {
    const referrerClaimed = await convexClient.mutation(
      api.referrals.claimReferrerCredit,
      { id: referralReceived._id }
    );

    if (referrerClaimed) {
      referrerCredited = await applyCredit(
        referrerOrg.stripeCustomerId,
        `Referral bonus - ${org.name}`
      );

      if (!referrerCredited) {
        await convexClient.mutation(api.referrals.rollbackReferrerCredit, {
          id: referralReceived._id,
        });
      }
    }
  }

  if (referredCredited && referrerCredited) {
    await convexClient.mutation(api.referrals.markCompleted, {
      id: referralReceived._id,
    });
  }
}

export async function applyPendingReferrerCredits(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const org = await convexClient.query(
    api.organizations.getByStripeCustomerId,
    { stripeCustomerId: customerId }
  );

  if (!org) {
    return;
  }

  const pendingReferrals = await convexClient.query(
    api.referrals.getPendingReferrerCredits,
    { referrerOrganizationId: org._id }
  );

  for (const referral of pendingReferrals) {
    const claimed = await convexClient.mutation(
      api.referrals.claimReferrerCredit,
      { id: referral._id }
    );

    if (!claimed) {
      continue;
    }

    // Get referred org name
    const allOrgs = await convexClient.query(
      api.organizations.getSubscribedWithInstallation,
      {}
    );
    const referredOrg = allOrgs.find(
      (o) => o._id === referral.referredOrganizationId
    );

    const credited = await applyCredit(
      customerId,
      `Referral bonus - ${referredOrg?.name ?? "Organization"}`
    );

    if (!credited) {
      await convexClient.mutation(api.referrals.rollbackReferrerCredit, {
        id: referral._id,
      });
      continue;
    }

    await convexClient.mutation(api.referrals.markCompleted, {
      id: referral._id,
    });
  }
}
