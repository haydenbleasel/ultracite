import "server-only";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { api } from "../convex/_generated/api";
import { convexClient } from "./convex";

export async function getCurrentUser() {
  return currentUser();
}

export async function getActiveOrganization() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return null;
  }

  return convexClient.query(api.organizations.getByClerkOrgId, {
    clerkOrgId: orgId,
  });
}

export async function getFirstOrganization() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
  });

  if (memberships.data.length === 0) {
    return null;
  }

  const firstMembership = memberships.data[0];
  const clerkOrgId = firstMembership.organization.id;

  return convexClient.query(api.organizations.getByClerkOrgId, { clerkOrgId });
}

