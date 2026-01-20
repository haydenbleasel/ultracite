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

  // Check if org was already referred
  const existingReferral = await database.referral.findUnique({
    where: { referredOrganizationId },
  });

  if (existingReferral) {
    return { success: false, error: "Organization already referred" };
  }

  // Create the referral record
  await database.$transaction([
    database.referral.create({
      data: {
        referrerOrganizationId: code.organizationId,
        referredOrganizationId,
        status: "PENDING",
      },
    }),
    database.referralCode.update({
      where: { id: code.id },
      data: { timesUsed: { increment: 1 } },
    }),
  ]);

  return { success: true };
}
