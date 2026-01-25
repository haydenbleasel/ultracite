import "server-only";

import { database } from "@repo/backend/database";

interface ProcessReferralResult {
  success: boolean;
  error?: string;
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
      // Handle both explicit check and unique constraint race condition
      if (
        error.message === "Organization already referred" ||
        error.message.includes("Unique constraint")
      ) {
        return { success: false, error: "Organization already referred" };
      }
    }
    throw error;
  }
}
