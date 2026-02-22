import "server-only";

import { customAlphabet } from "nanoid";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convexClient } from "../convex";
import { env } from "@/lib/env";

const generateCode = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export async function getOrCreateReferralCode(
  organizationId: Id<"organizations">
) {
  const existing = await convexClient.query(
    api.referralCodes.getByOrganizationId,
    { organizationId }
  );

  if (existing) {
    return existing;
  }

  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateCode();
    const collision = await convexClient.query(api.referralCodes.getByCode, {
      code,
    });

    if (!collision) {
      try {
        const id = await convexClient.mutation(api.referralCodes.create, {
          code,
          organizationId,
        });
        // Return a shape matching what callers expect
        return { _id: id, code, organizationId, timesUsed: 0 };
      } catch {
        // Race condition — try again or return existing
        const created = await convexClient.query(
          api.referralCodes.getByOrganizationId,
          { organizationId }
        );
        if (created) {
          return created;
        }
        continue;
      }
    }
  }

  throw new Error("Failed to generate unique referral code after max attempts");
}

export function getReferralUrl(code: string) {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3002";

  return `${baseUrl}/r/${code}`;
}
