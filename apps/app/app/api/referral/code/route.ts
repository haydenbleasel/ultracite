import { database } from "@repo/backend/database";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getOrCreateReferralCode,
  getReferralUrl,
} from "@/lib/referral/generate-code";

export const GET = async (request: NextRequest) => {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID required" },
      { status: 400 }
    );
  }

  // Verify user is a member of this organization
  const membership = await database.organizationMember.findFirst({
    where: {
      userId: user.id,
      organizationId,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const referralCode = await getOrCreateReferralCode(organizationId);
  const referralUrl = getReferralUrl(referralCode.code);

  return NextResponse.json({
    code: referralCode.code,
    url: referralUrl,
    timesUsed: referralCode.timesUsed,
  });
};
