import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { Octokit } from "octokit";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convexClient } from "../convex";
import { getGitHubApp, getInstallationOctokit } from "./app";

interface GitHubOrg {
  avatar_url?: string;
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

async function upsertOrganization(org: GitHubOrg, clerkOrgId: string) {
  const slug = org.login.toLowerCase();

  try {
    const orgId = await convexClient.mutation(
      api.organizations.upsertByGithubOrgId,
      {
        githubOrgId: org.id,
        clerkOrgId,
        name: org.name ?? org.login,
        slug,
        githubOrgLogin: org.login,
        githubOrgType: org.type,
      }
    );

    return { _id: orgId, slug };
  } catch (error) {
    console.warn(`Failed to upsert org ${org.login}:`, error);
    return null;
  }
}

async function syncInstallation(
  orgId: Id<"organizations">,
  org: GitHubOrg
) {
  const existingOrg = await convexClient.query(
    api.organizations.getByGithubOrgId,
    { githubOrgId: org.id }
  );

  if (existingOrg?.githubInstallationId) {
    await syncRepositories(existingOrg._id, existingOrg.githubInstallationId);
    return;
  }

  const installation = await checkGitHubAppInstallation(org.login, org.type);

  if (installation && existingOrg) {
    await convexClient.mutation(api.organizations.updateInstallation, {
      orgId: existingOrg._id,
      githubInstallationId: installation.id,
      githubAccountLogin: org.login,
      installedAt: new Date(installation.createdAt).getTime(),
    });

    await syncRepositories(existingOrg._id, installation.id);
  }
}

export async function syncGitHubOrganizations(
  providerToken: string,
  userId: string,
  referralCode?: string
): Promise<{ synced: number; organizations: { slug: string }[] }> {
  const octokit = new Octokit({ auth: providerToken });
  const { data: user } = await octokit.rest.users.getAuthenticated();

  const orgs = await octokit.paginate(
    octokit.rest.orgs.listForAuthenticatedUser,
    { per_page: 100 }
  );

  const allOrgs: GitHubOrg[] = [
    { id: user.id, login: user.login, type: "User", name: user.name },
    ...orgs.map((org) => ({
      id: org.id,
      login: org.login,
      type: "Organization" as const,
      name: org.login,
    })),
  ];

  const syncedOrganizations: { slug: string }[] = [];
  let referralApplied = false;
  const clerk = await clerkClient();

  for (const org of allOrgs) {
    // Create or find Clerk organization
    let clerkOrgId: string;
    try {
      // Try to find existing Clerk org by slug
      const existingConvexOrg = await convexClient.query(
        api.organizations.getByGithubOrgId,
        { githubOrgId: org.id }
      );

      if (existingConvexOrg) {
        clerkOrgId = existingConvexOrg.clerkOrgId;
      } else {
        // Create new Clerk organization
        const clerkOrg = await clerk.organizations.createOrganization({
          name: org.name ?? org.login,
          slug: org.login.toLowerCase(),
          createdBy: userId,
        });
        clerkOrgId = clerkOrg.id;
      }
    } catch {
      // If creating fails (e.g., slug taken), try to find it
      try {
        const clerkOrg = await clerk.organizations.getOrganization({
          slug: org.login.toLowerCase(),
        });
        clerkOrgId = clerkOrg.id;
      } catch {
        console.warn(`Failed to create/find Clerk org for ${org.login}`);
        continue;
      }
    }

    // Ensure user is a member of the Clerk organization
    try {
      await clerk.organizations.createOrganizationMembership({
        organizationId: clerkOrgId,
        userId,
        role: org.type === "User" ? "org:admin" : "org:member",
      });
    } catch {
      // Already a member - that's fine
    }

    const result = await upsertOrganization(org, clerkOrgId);
    if (!result) {
      continue;
    }

    if (referralCode && !referralApplied) {
      const convexOrg = await convexClient.query(
        api.organizations.getByGithubOrgId,
        { githubOrgId: org.id }
      );
      if (convexOrg) {
        const refResult = await convexClient.mutation(
          api.referrals.processReferral,
          {
            referralCode,
            referredOrganizationId: convexOrg._id,
          }
        );
        if (refResult.success) {
          referralApplied = true;
        }
      }
    }

    await syncInstallation(result._id, org);
    syncedOrganizations.push({ slug: result.slug });
  }

  return {
    synced: syncedOrganizations.length,
    organizations: syncedOrganizations,
  };
}
