import "server-only";

import {
  getOrCreateReferralCode,
  getReferralUrl,
} from "@/lib/referral/generate-code";

export type ReferralCode = {
  code: string;
  url: string;
  timesUsed: number;
};

export async function getReferralCode(
  organizationId: string
): Promise<ReferralCode> {
  const referralCode = await getOrCreateReferralCode(organizationId);
  const referralUrl = getReferralUrl(referralCode.code);

  return {
    code: referralCode.code,
    url: referralUrl,
    timesUsed: referralCode.timesUsed,
  };
}
