import "server-only";

import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convexClient } from "../convex";

interface ProcessReferralResult {
  error?: string;
  success: boolean;
}

export async function processReferral(
  referralCode: string,
  referredOrganizationId: Id<"organizations">
): Promise<ProcessReferralResult> {
  const result = await convexClient.mutation(api.referrals.processReferral, {
    referralCode,
    referredOrganizationId,
  });

  return result;
}
