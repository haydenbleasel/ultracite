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

  // Idempotency: skip if no referral, not pending, or already credited
  if (
    !org?.referralReceived ||
    org.referralReceived.status !== "PENDING" ||
    org.referralReceived.referredCreditedAt !== null
  ) {
    return;
  }

  const referral = org.referralReceived;
  const referrerOrg = referral.referrerOrganization;
  const now = new Date();

  // Mark as credited FIRST for idempotency (before Stripe call)
  // This prevents duplicate credits on webhook retry
  await database.referral.update({
    where: { id: referral.id },
    data: {
      paidInvoiceId: invoice.id,
      referredCreditedAt: now,
    },
  });

  // Apply credit to referred org
  const referredCredited = await applyCredit(
    customerId,
    "Referral signup bonus"
  );

  if (!referredCredited) {
    // Roll back the timestamp if credit failed so it can be retried
    await database.referral.update({
      where: { id: referral.id },
      data: { referredCreditedAt: null },
    });
    return;
  }

  // Apply credit to referrer org only if they have a Stripe customer
  // If not, we'll apply it when they subscribe (via applyPendingReferrerCredits)
  let referrerCredited = false;
  if (referrerOrg.stripeCustomerId) {
    referrerCredited = await applyCredit(
      referrerOrg.stripeCustomerId,
      `Referral bonus - ${org.name}`
    );

    if (referrerCredited) {
      await database.referral.update({
        where: { id: referral.id },
        data: { referrerCreditedAt: now },
      });
    }
  }

  // Only mark completed if BOTH credits were actually applied
  // Keep as PENDING if referrer hasn't subscribed yet or credit failed
  const canComplete = referredCredited && referrerCredited;

  if (canComplete) {
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
    },
    include: {
      referredOrganization: true,
    },
  });

  const now = new Date();

  for (const referral of pendingReferrals) {
    // Mark as credited FIRST for idempotency (before Stripe call)
    await database.referral.update({
      where: { id: referral.id },
      data: { referrerCreditedAt: now },
    });

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

    // Check if referred was also credited to determine if we can complete
    const canComplete = referral.referredCreditedAt !== null;

    if (canComplete) {
      await database.referral.update({
        where: { id: referral.id },
        data: { status: "COMPLETED" },
      });
    }
  }
}
