import "server-only";

import { Octokit } from "octokit";
import { database } from "@repo/backend";
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

/**
 * Sync GitHub organizations (and personal account) for a user.
 * Creates Organization records if they don't exist and adds user as member.
 * Also auto-links existing GitHub App installations and syncs repos.
 */
export async function syncGitHubOrganizations(
  providerToken: string,
  userId: string
): Promise<{ synced: number; organizations: { id: string; slug: string }[] }> {
  const octokit = new Octokit({ auth: providerToken });

  // Fetch the authenticated user's info (for personal account)
  const { data: user } = await octokit.rest.users.getAuthenticated();

  // Fetch all organizations the user belongs to (with pagination)
  const orgs = await octokit.paginate(octokit.rest.orgs.listForAuthenticatedUser, {
    per_page: 100,
  });

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

    // Check if GitHub App is already installed on this account
    // and auto-link if not already linked
    if (!organization.githubInstallationId) {
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
    } else {
      // Already has installation, just sync repos to ensure they're up to date
      await syncRepositories(organization.id, organization.githubInstallationId);
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
