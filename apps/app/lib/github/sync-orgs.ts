import "server-only";

import { database } from "@repo/backend/database";
import { Octokit } from "octokit";
import { processReferral } from "@/lib/referral/process-referral";
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
        defaultBranch: repo.default_branch,
      },
      update: {
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch,
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

async function upsertOrganization(org: GitHubOrg) {
  const slug = org.login.toLowerCase();

  try {
    return await database.organization.upsert({
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
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      const existing = await database.organization.findUnique({
        where: { githubOrgId: org.id },
      });

      if (!existing) {
        console.warn(
          `Skipping org ${org.login}: slug "${slug}" is taken by another organization`
        );
      }

      return existing;
    }
    throw error;
  }
}

async function syncInstallation(
  organization: { id: string; githubInstallationId: number | null },
  org: GitHubOrg
) {
  if (organization.githubInstallationId) {
    await syncRepositories(organization.id, organization.githubInstallationId);
    return;
  }

  const installation = await checkGitHubAppInstallation(org.login, org.type);

  if (installation) {
    await database.organization.update({
      where: { id: organization.id },
      data: {
        githubInstallationId: installation.id,
        githubAccountLogin: org.login,
        installedAt: new Date(installation.createdAt),
      },
    });

    await syncRepositories(organization.id, installation.id);
  }
}

export async function syncGitHubOrganizations(
  providerToken: string,
  userId: string,
  userEmail: string,
  referralCode?: string
): Promise<{ synced: number; organizations: { id: string; slug: string }[] }> {
  const octokit = new Octokit({ auth: providerToken });

  const { data: user } = await octokit.rest.users.getAuthenticated();

  const orgs = await octokit.paginate(
    octokit.rest.orgs.listForAuthenticatedUser,
    { per_page: 100 }
  );

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
      name: org.login,
    })),
  ];

  const syncedOrganizations: { id: string; slug: string }[] = [];
  let referralApplied = false;

  await database.user.upsert({
    where: { id: userId },
    create: { id: userId, email: userEmail },
    update: { email: userEmail },
  });

  for (const org of allOrgs) {
    const organization = await upsertOrganization(org);

    if (!organization) {
      continue;
    }

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
      update: {},
    });

    if (referralCode && !referralApplied) {
      const result = await processReferral(referralCode, organization.id);
      if (result.success) {
        referralApplied = true;
      }
    }

    await syncInstallation(organization, org);

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
