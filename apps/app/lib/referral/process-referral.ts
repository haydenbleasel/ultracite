import "server-only";

import { database } from "@repo/backend/database";

interface ProcessReferralResult {
  error?: string;
  success: boolean;
}

export async function processReferral(
  referralCode: string,
  referredOrganizationId: string
): Promise<ProcessReferralResult> {
  // Find the referral code and its org
  const code = await database.referralCode.findUnique({
    where: { code: referralCode },
    include: { organization: true },
  });

  if (!code) {
    return { success: false, error: "Invalid referral code" };
  }

  // Prevent self-referral
  if (code.organizationId === referredOrganizationId) {
    return { success: false, error: "Cannot refer yourself" };
  }

  // Create the referral record atomically, handling race conditions
  try {
    await database.$transaction(async (tx) => {
      // Check and create in same transaction to prevent TOCTOU
      const existingReferral = await tx.referral.findUnique({
        where: { referredOrganizationId },
      });

      if (existingReferral) {
        throw new Error("Organization already referred");
      }

      // Check if org already has an active subscription (stripeCustomerId indicates they've subscribed)
      const referredOrg = await tx.organization.findUnique({
        where: { id: referredOrganizationId },
        select: { stripeCustomerId: true },
      });

      if (referredOrg?.stripeCustomerId) {
        throw new Error("Organization already subscribed");
      }

      await tx.referral.create({
        data: {
          referrerOrganizationId: code.organizationId,
          referredOrganizationId,
          status: "PENDING",
        },
      });

      await tx.referralCode.update({
        where: { id: code.id },
        data: { timesUsed: { increment: 1 } },
      });
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      // Handle explicit checks and unique constraint race condition
      if (error.message === "Organization already referred") {
        return { success: false, error: "Organization already referred" };
      }
      if (error.message === "Organization already subscribed") {
        return {
          success: false,
          error: "Organization already has a subscription",
        };
      }
      if (error.message.includes("Unique constraint")) {
        return { success: false, error: "Organization already referred" };
      }
    }
    throw error;
  }
}
