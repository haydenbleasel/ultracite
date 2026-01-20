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
  let code = generateCode();
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const collision = await database.referralCode.findUnique({
      where: { code },
    });

    if (!collision) {
      break;
    }

    code = generateCode();
    attempts++;
  }

  return database.referralCode.create({
    data: {
      code,
      organizationId,
    },
  });
}

export function getReferralUrl(code: string) {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3002";

  return `${baseUrl}/r/${code}`;
}
