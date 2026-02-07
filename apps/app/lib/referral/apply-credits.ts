import "server-only";

import { database } from "@repo/backend/database";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { REFERRAL_CREDIT_CENTS } from "./constants";

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
        include: {
          referrerOrganization: true,
        },
      },
    },
  });

  // Skip if no referral or already fully completed
  if (!org?.referralReceived || org.referralReceived.status !== "PENDING") {
    return;
  }

  const referral = org.referralReceived;
  const referrerOrg = referral.referrerOrganization;
  const now = new Date();

  // Apply referred org credit if not already done
  let referredCredited = referral.referredCreditedAt !== null;

  if (!referredCredited) {
    // Atomic claim: only one concurrent request can set referredCreditedAt
    // from null, preventing duplicate Stripe credits on webhook retry
    const claimed = await database.referral.updateMany({
      where: {
        id: referral.id,
        referredCreditedAt: null,
        status: "PENDING",
      },
      data: {
        paidInvoiceId: invoice.id,
        referredCreditedAt: now,
      },
    });

    if (claimed.count === 0) {
      return;
    }

    referredCredited = await applyCredit(customerId, "Referral signup bonus");

    if (!referredCredited) {
      // Roll back claim if credit failed so it can be retried
      await database.referral.update({
        where: { id: referral.id },
        data: { referredCreditedAt: null, paidInvoiceId: null },
      });
      return;
    }
  }

  // Apply credit to referrer org only if they have a Stripe customer
  // If not, we'll apply it when they subscribe (via applyPendingReferrerCredits)
  let referrerCredited = referral.referrerCreditedAt !== null;

  if (!referrerCredited && referrerOrg.stripeCustomerId) {
    // Atomic claim for referrer credit
    const referrerClaimed = await database.referral.updateMany({
      where: {
        id: referral.id,
        referrerCreditedAt: null,
      },
      data: { referrerCreditedAt: now },
    });

    if (referrerClaimed.count > 0) {
      referrerCredited = await applyCredit(
        referrerOrg.stripeCustomerId,
        `Referral bonus - ${org.name}`
      );

      if (!referrerCredited) {
        // Roll back timestamp if credit failed so it can be retried
        await database.referral.update({
          where: { id: referral.id },
          data: { referrerCreditedAt: null },
        });
      }
    }
  }

  // Only mark completed if BOTH credits were actually applied
  // Keep as PENDING if referrer hasn't subscribed yet or credit failed
  if (referredCredited && referrerCredited) {
    await database.referral.update({
      where: { id: referral.id },
      data: { status: "COMPLETED" },
    });
  }
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
      referredCreditedAt: { not: null }, // Referred org credit was applied
    },
    include: {
      referredOrganization: true,
    },
  });

  const now = new Date();

  for (const referral of pendingReferrals) {
    // Atomic claim: only one concurrent request can set referrerCreditedAt
    // from null, preventing duplicate Stripe credits on webhook retry
    const claimed = await database.referral.updateMany({
      where: {
        id: referral.id,
        referrerCreditedAt: null,
      },
      data: { referrerCreditedAt: now },
    });

    if (claimed.count === 0) {
      continue;
    }

    const credited = await applyCredit(
      customerId,
      `Referral bonus - ${referral.referredOrganization.name}`
    );

    if (!credited) {
      // Roll back timestamp if credit failed so it can be retried
      await database.referral.update({
        where: { id: referral.id },
        data: { referrerCreditedAt: null },
      });
      continue;
    }

    // Referred credit already confirmed by query filter, mark completed
    await database.referral.update({
      where: { id: referral.id },
      data: { status: "COMPLETED" },
    });
  }
}
