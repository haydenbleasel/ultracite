"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { api } from "../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";

interface CreateOrganizationInput {
  name: string;
  slug: string;
}

interface CreateOrganizationResult {
  error?: string;
  slug?: string;
}

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createOrganization({
  name,
  slug,
}: CreateOrganizationInput): Promise<CreateOrganizationResult> {
  const { userId } = await auth();
  if (!userId) {
    return { error: "You must be logged in to create an organization." };
  }

  if (!slugRegex.test(slug)) {
    return {
      error: "Slug must contain only lowercase letters, numbers, and hyphens.",
    };
  }

  // Check if slug is taken in Convex
  const existingOrg = await convexClient.query(api.organizations.getBySlug, {
    slug,
  });

  if (existingOrg) {
    return { error: "This URL slug is already taken. Please choose another." };
  }

  // Create Clerk organization
  const clerk = await clerkClient();
  const clerkOrg = await clerk.organizations.createOrganization({
    name,
    slug,
    createdBy: userId,
  });

  // Create Convex metadata record
  await convexClient.mutation(api.organizations.upsertByClerkOrgId, {
    clerkOrgId: clerkOrg.id,
    name,
    slug,
  });

  return { slug };
}
