import "server-only";

import type { Id } from "../../convex/_generated/dataModel";
import {
  getOrCreateReferralCode,
  getReferralUrl,
} from "@/lib/referral/generate-code";

export interface ReferralCode {
  code: string;
  timesUsed: number;
  url: string;
}

export async function getReferralCode(
  organizationId: Id<"organizations">
): Promise<ReferralCode> {
  const referralCode = await getOrCreateReferralCode(organizationId);
  const referralUrl = getReferralUrl(referralCode.code);

  return {
    code: referralCode.code,
    url: referralUrl,
    timesUsed: referralCode.timesUsed,
  };
}
