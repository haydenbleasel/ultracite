import "server-only";

import { database } from "@repo/backend/database";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

const REFERRAL_CREDIT_CENTS = 500; // $5.00

async function applyCredit(
  customerId: string,
  description: string
): Promise<boolean> {
  try {
    await stripe.customers.createBalanceTransaction(customerId, {
      amount: -REFERRAL_CREDIT_CENTS, // Negative = credit
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

  // Find org by Stripe customer ID
  const org = await database.organization.findFirst({
    where: { stripeCustomerId: customerId },
    include: {
      referralReceived: {
        where: { status: "PENDING" },
        include: {
          referrerOrganization: true,
        },
      },
    },
  });

  if (!org?.referralReceived) {
    return; // No pending referral
  }

  const referral = org.referralReceived;
  const referrerOrg = referral.referrerOrganization;
  const now = new Date();

  // Apply credit to referred org (this org) - using customerId since that's how we found them
  const referredCredited = await applyCredit(customerId, "Referral signup bonus");

  // Apply credit to referrer org only if they have a Stripe customer
  // If not, we'll apply it when they subscribe (via separate check)
  let referrerCredited = false;
  if (referrerOrg.stripeCustomerId) {
    referrerCredited = await applyCredit(
      referrerOrg.stripeCustomerId,
      `Referral bonus - ${org.name}`
    );
  }

  // Only mark completed if BOTH credits were actually applied
  // Keep as PENDING if referrer hasn't subscribed yet (no stripeCustomerId)
  const canComplete = referredCredited && referrerCredited;

  // Update referral status
  await database.referral.update({
    where: { id: referral.id },
    data: {
      status: canComplete ? "COMPLETED" : "PENDING",
      paidInvoiceId: invoice.id,
      referredCreditedAt: referredCredited ? now : null,
      referrerCreditedAt: referrerCredited ? now : null,
    },
  });
}

/**
 * Apply pending referrer credits when an organization subscribes.
 * This handles the case where org A referred org B, B paid first,
 * and now A is subscribing and should receive their referrer credit.
 */
export async function applyPendingReferrerCredits(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find org by Stripe customer ID
  const org = await database.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!org) {
    return;
  }

  // Find any referrals where this org is the referrer and hasn't been credited yet
  const pendingReferrals = await database.referral.findMany({
    where: {
      referrerOrganizationId: org.id,
      referrerCreditedAt: null,
      paidInvoiceId: { not: null }, // Referred org has already paid
    },
    include: {
      referredOrganization: true,
    },
  });

  const now = new Date();

  for (const referral of pendingReferrals) {
    const credited = await applyCredit(
      customerId,
      `Referral bonus - ${referral.referredOrganization.name}`
    );

    if (credited) {
      // Check if referred was also credited to determine if we can complete
      const canComplete = referral.referredCreditedAt !== null;

      await database.referral.update({
        where: { id: referral.id },
        data: {
          referrerCreditedAt: now,
          status: canComplete ? "COMPLETED" : "PENDING",
        },
      });
    }
  }
}
