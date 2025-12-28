import "server-only";

import { Octokit } from "octokit";
import { database } from "@repo/backend";

interface GitHubOrg {
  id: number;
  login: string;
  type: "Organization" | "User";
  name?: string | null;
  avatar_url?: string;
}

/**
 * Sync GitHub organizations (and personal account) for a user.
 * Creates Organization records if they don't exist and adds user as member.
 */
export async function syncGitHubOrganizations(
  providerToken: string,
  userId: string
): Promise<{ synced: number; organizations: { id: string; slug: string }[] }> {
  const octokit = new Octokit({ auth: providerToken });

  // Fetch the authenticated user's info (for personal account)
  const { data: user } = await octokit.rest.users.getAuthenticated();

  // Fetch organizations the user belongs to
  const { data: orgs } = await octokit.rest.orgs.listForAuthenticatedUser();

  // Combine personal account and organizations
  const allOrgs: GitHubOrg[] = [
    {
      id: user.id,
      login: user.login,
      type: "User",
      name: user.name,
    },
    ...orgs.map((org) => ({
      id: org.id,
      login: org.login,
      type: "Organization" as const,
      name: org.login, // GitHub orgs don't always have a display name in this endpoint
    })),
  ];

  const syncedOrganizations: { id: string; slug: string }[] = [];

  // Ensure user exists in database
  await database.user.upsert({
    where: { id: userId },
    create: { id: userId, email: "" },
    update: {},
  });

  for (const org of allOrgs) {
    // Generate a slug from the login (already lowercase with valid chars)
    const slug = org.login.toLowerCase();

    // Check if organization already exists by GitHub ID
    let organization = await database.organization.findUnique({
      where: { githubOrgId: org.id },
    });

    if (organization) {
      // Update existing organization
      organization = await database.organization.update({
        where: { id: organization.id },
        data: {
          name: org.name ?? org.login,
          githubOrgLogin: org.login,
          githubOrgType: org.type,
        },
      });
    } else {
      // Check if slug is taken by another org
      const existingBySlug = await database.organization.findUnique({
        where: { slug },
      });

      if (existingBySlug) {
        // Slug is taken by a different org - skip this one
        // In the future, could append a suffix
        continue;
      }

      // Create new organization
      organization = await database.organization.create({
        data: {
          name: org.name ?? org.login,
          slug,
          githubOrgId: org.id,
          githubOrgLogin: org.login,
          githubOrgType: org.type,
        },
      });
    }

    // Add user as member if not already
    const existingMembership = await database.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: organization.id,
        },
      },
    });

    if (!existingMembership) {
      // For personal account, user is owner. For orgs, start as member
      const role = org.type === "User" ? "OWNER" : "MEMBER";

      await database.organizationMember.create({
        data: {
          userId,
          organizationId: organization.id,
          role,
        },
      });
    }

    syncedOrganizations.push({
      id: organization.id,
      slug: organization.slug,
    });
  }

  return {
    synced: syncedOrganizations.length,
    organizations: syncedOrganizations,
  };
}
