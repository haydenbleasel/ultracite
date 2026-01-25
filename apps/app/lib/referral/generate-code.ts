import "server-only";

import { database } from "@repo/backend/database";
import { customAlphabet } from "nanoid";

// 8-char lowercase alphanumeric for clean URLs
const generateCode = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export async function getOrCreateReferralCode(organizationId: string) {
  const existing = await database.referralCode.findUnique({
    where: { organizationId },
  });

  if (existing) {
    return existing;
  }

  // Generate unique code with collision check
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateCode();
    const collision = await database.referralCode.findUnique({
      where: { code },
    });

    if (!collision) {
      return database.referralCode.create({
        data: {
          code,
          organizationId,
        },
      });
    }
  }

  throw new Error("Failed to generate unique referral code after max attempts");
}

export function getReferralUrl(code: string) {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3002";

  return `${baseUrl}/r/${code}`;
}
