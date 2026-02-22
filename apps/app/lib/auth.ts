import "server-only";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { api } from "../convex/_generated/api";
import { convexClient } from "./convex";

export async function getCurrentUser() {
  return currentUser();
}

export async function getOrganizationBySlug(slug: string) {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const org = await convexClient.query(api.organizations.getBySlug, { slug });
  if (!org) {
    return null;
  }

  // Verify membership via Clerk
  const clerk = await clerkClient();
  try {
    const memberships =
      await clerk.organizations.getOrganizationMembershipList({
        organizationId: org.clerkOrgId,
      });
    const isMember = memberships.data.some(
      (m) => m.publicUserData?.userId === userId
    );
    if (!isMember) {
      return null;
    }
  } catch {
    return null;
  }

  return org;
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

export async function getUserOrganizations() {
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
  });

  const orgs = await Promise.all(
    memberships.data.map(async (m) => {
      const org = await convexClient.query(
        api.organizations.getByClerkOrgId,
        { clerkOrgId: m.organization.id }
      );
      return org;
    })
  );

  return orgs.filter(Boolean);
}
