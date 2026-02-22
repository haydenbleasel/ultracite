import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { Octokit } from "octokit";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convexClient } from "../convex";
import { getGitHubApp, getInstallationOctokit } from "./app";

interface GitHubOrg {
  id: number;
  login: string;
  name?: string | null;
  type: "Organization" | "User";
}

async function syncRepositories(
  orgId: Id<"organizations">,
  installationId: number
) {
  const octokit = await getInstallationOctokit(installationId);
  const repositories = await octokit.paginate(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 },
    (response) => response.data
  );

  for (const repo of repositories) {
    await convexClient.mutation(api.repos.upsertByGithubRepoId, {
      organizationId: orgId,
      githubRepoId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
    });
  }
}

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
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });

    return { id: installation.id, createdAt: installation.created_at };
  } catch {
    return null;
  }
}

async function syncInstallation(
  orgId: Id<"organizations">,
  githubOrg: GitHubOrg
) {
  const existingOrg = await convexClient.query(
    api.organizations.getByGithubOrgId,
    { githubOrgId: githubOrg.id }
  );

  if (existingOrg?.githubInstallationId) {
    await syncRepositories(existingOrg._id, existingOrg.githubInstallationId);
    return;
  }

  const installation = await checkGitHubAppInstallation(
    githubOrg.login,
    githubOrg.type
  );

  if (installation) {
    await convexClient.mutation(api.organizations.updateInstallation, {
      orgId,
      githubInstallationId: installation.id,
      githubAccountLogin: githubOrg.login,
      installedAt: new Date(installation.createdAt).getTime(),
    });

    await syncRepositories(orgId, installation.id);
  }
}

export async function syncGitHubOrganizations(
  providerToken: string,
  userId: string,
  referralCode?: string
): Promise<{ synced: number; organizations: { slug: string }[] }> {
  const clerk = await clerkClient();
  const octokit = new Octokit({ auth: providerToken });
  const { data: user } = await octokit.rest.users.getAuthenticated();

  // Get user's GitHub orgs
  const orgs = await octokit.paginate(
    octokit.rest.orgs.listForAuthenticatedUser,
    { per_page: 100 }
  );

  const allGitHubOrgs: GitHubOrg[] = [
    { id: user.id, login: user.login, type: "User", name: user.name },
    ...orgs.map((org) => ({
      id: org.id,
      login: org.login,
      type: "Organization" as const,
      name: org.login,
    })),
  ];

  // Get user's existing Clerk orgs (guaranteed to have at least one)
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
  });

  const syncedOrganizations: { slug: string }[] = [];
  let referralApplied = false;

  for (const membership of memberships.data) {
    const clerkOrg = membership.organization;

    // Match Clerk org to a GitHub org by slug
    const matchingGitHubOrg = allGitHubOrgs.find(
      (g) => g.login.toLowerCase() === clerkOrg.slug
    );

    // Upsert Convex record for this Clerk org
    const orgId = await convexClient.mutation(
      api.organizations.upsertByClerkOrgId,
      {
        clerkOrgId: clerkOrg.id,
        name: clerkOrg.name,
        slug: clerkOrg.slug ?? clerkOrg.name.toLowerCase().replace(/\s+/g, "-"),
        ...(matchingGitHubOrg
          ? {
              githubOrgId: matchingGitHubOrg.id,
              githubOrgLogin: matchingGitHubOrg.login,
              githubOrgType: matchingGitHubOrg.type,
            }
          : {}),
      }
    );

    // Handle referral for the first org
    if (referralCode && !referralApplied) {
      try {
        const refResult = await convexClient.mutation(
          api.referrals.processReferral,
          {
            referralCode,
            referredOrganizationId: orgId,
          }
        );
        if (refResult.success) {
          referralApplied = true;
        }
      } catch {
        // Referral processing failed, continue
      }
    }

    // Sync GitHub installation + repos if matched
    if (matchingGitHubOrg) {
      await syncInstallation(orgId, matchingGitHubOrg);
    }

    syncedOrganizations.push({
      slug: clerkOrg.slug ?? clerkOrg.name.toLowerCase().replace(/\s+/g, "-"),
    });
  }

  return {
    synced: syncedOrganizations.length,
    organizations: syncedOrganizations,
  };
}
