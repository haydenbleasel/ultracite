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

  // Apply credit to referred org (this org)
  // Consider credited if no Stripe customer (can't apply) or credit succeeded
  const referredCredited = org.stripeCustomerId
    ? await applyCredit(org.stripeCustomerId, "Referral signup bonus")
    : true;

  // Apply credit to referrer org
  const referrerCredited = referrerOrg.stripeCustomerId
    ? await applyCredit(referrerOrg.stripeCustomerId, `Referral bonus - ${org.name}`)
    : true;

  // Only mark completed if both credits were applied (or not applicable)
  const allCreditsApplied = referredCredited && referrerCredited;

  // Update referral status
  await database.referral.update({
    where: { id: referral.id },
    data: {
      status: allCreditsApplied ? "COMPLETED" : "PENDING",
      paidInvoiceId: invoice.id,
      referredCreditedAt: referredCredited && org.stripeCustomerId ? now : null,
      referrerCreditedAt: referrerCredited && referrerOrg.stripeCustomerId ? now : null,
    },
  });
}
