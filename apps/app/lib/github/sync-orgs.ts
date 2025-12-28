import "server-only";

import { database } from "@repo/backend/database";
import { Octokit } from "octokit";
import { getGitHubApp, getInstallationOctokit } from "./app";

interface GitHubOrg {
  id: number;
  login: string;
  type: "Organization" | "User";
  name?: string | null;
  avatar_url?: string;
}

/**
 * Sync repositories for an organization using its GitHub App installation.
 * Handles pagination to support organizations with more than 100 repositories.
 */
async function syncRepositories(orgId: string, installationId: number) {
  const octokit = await getInstallationOctokit(installationId);

  // Use pagination to fetch all repositories
  const repositories = await octokit.paginate(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 },
    (response) => response.data
  );

  for (const repo of repositories) {
    await database.repo.upsert({
      where: { githubRepoId: repo.id },
      create: {
        organizationId: orgId,
        githubRepoId: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch ?? "main",
      },
      update: {
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch ?? "main",
      },
    });
  }
}

/**
 * Check if the GitHub App is installed on a user or organization account.
 * Returns the installation details if found, null otherwise.
 */
async function checkGitHubAppInstallation(
  login: string,
  type: "Organization" | "User"
): Promise<{ id: number; createdAt: string } | null> {
  try {
    const app = getGitHubApp();
    const endpoint =
      type === "Organization"
        ? "GET /orgs/{org}/installation"
        : "GET /users/{username}/installation";

    const params =
      type === "Organization" ? { org: login } : { username: login };

    const { data: installation } = await app.octokit.request(endpoint, {
      ...params,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    return {
      id: installation.id,
      createdAt: installation.created_at,
    };
  } catch {
    // Installation not found (404) or other error
    return null;
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Requires multiple conditional paths
export async function syncGitHubOrganizations(
  providerToken: string,
  userId: string
): Promise<{ synced: number; organizations: { id: string; slug: string }[] }> {
  const octokit = new Octokit({ auth: providerToken });

  // Fetch the authenticated user's info (for personal account)
  const { data: user } = await octokit.rest.users.getAuthenticated();

  // Fetch all organizations the user belongs to (with pagination)
  const orgs = await octokit.paginate(
    octokit.rest.orgs.listForAuthenticatedUser,
    {
      per_page: 100,
    }
  );

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

    // Use upsert to atomically find-or-create the organization by GitHub ID
    // This prevents race conditions when multiple users from the same org log in simultaneously
    let organization: {
      id: string;
      slug: string;
      githubInstallationId: number | null;
    } | null = null;

    try {
      organization = await database.organization.upsert({
        where: { githubOrgId: org.id },
        create: {
          name: org.name ?? org.login,
          slug,
          githubOrgId: org.id,
          githubOrgLogin: org.login,
          githubOrgType: org.type,
        },
        update: {
          name: org.name ?? org.login,
          githubOrgLogin: org.login,
          githubOrgType: org.type,
        },
      });
    } catch (error) {
      // Handle slug unique constraint violation - another org already has this slug
      // This can happen if a different GitHub org claimed the slug first
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint")
      ) {
        // Try to find the org by githubOrgId in case it was created by a concurrent request
        organization = await database.organization.findUnique({
          where: { githubOrgId: org.id },
        });

        if (!organization) {
          // Slug is taken by a different org - skip this one
          console.warn(
            `Skipping org ${org.login}: slug "${slug}" is taken by another organization`
          );
          continue;
        }
      } else {
        throw error;
      }
    }

    // Add user as member if not already (using upsert to prevent race conditions)
    // For personal account, user is owner. For orgs, start as member
    const role = org.type === "User" ? "OWNER" : "MEMBER";

    await database.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId: organization.id,
        },
      },
      create: {
        userId,
        organizationId: organization.id,
        role,
      },
      update: {}, // Don't update role if membership already exists
    });

    // Check if GitHub App is already installed on this account
    // and auto-link if not already linked
    if (organization.githubInstallationId) {
      // Already has installation, just sync repos to ensure they're up to date
      await syncRepositories(
        organization.id,
        organization.githubInstallationId
      );
    } else {
      const installation = await checkGitHubAppInstallation(
        org.login,
        org.type
      );

      if (installation) {
        // Link the installation to this organization
        await database.organization.update({
          where: { id: organization.id },
          data: {
            githubInstallationId: installation.id,
            githubAccountLogin: org.login,
            installedAt: new Date(installation.createdAt),
          },
        });

        // Sync repositories from the installation
        await syncRepositories(organization.id, installation.id);
      }
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
