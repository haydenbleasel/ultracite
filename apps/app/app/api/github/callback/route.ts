import { database } from "@repo/backend/database";
import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser, getFirstOrganization } from "@/lib/auth";
import { getGitHubApp, getInstallationOctokit } from "@/lib/github/app";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex callback
export const GET = async (request: NextRequest) => {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const { searchParams } = request.nextUrl;
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  if (
    installationId &&
    (setupAction === "install" || setupAction === "update")
  ) {
    const installationIdNum = Number.parseInt(installationId, 10);

    const app = getGitHubApp();
    const { data: installation } = await app.octokit.request(
      "GET /app/installations/{installation_id}",
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
        installation_id: installationIdNum,
      }
    );

    const accountLogin =
      installation.account && "login" in installation.account
        ? installation.account.login
        : (installation.account?.slug ?? null);

    if (!accountLogin) {
      return NextResponse.redirect(
        new URL("/onboarding?error=no-account", request.url)
      );
    }

    // Ensure user exists in database
    await database.user.upsert({
      create: { email: user.email ?? "", id: user.id },
      update: {},
      where: { id: user.id },
    });

    // Find or create the organization that matches the GitHub account login
    let organization = await database.organization.findFirst({
      where: {
        githubOrgLogin: accountLogin,
      },
    });

    if (!organization) {
      // Organization doesn't exist yet - create it from the installation data
      const accountId =
        installation.account && "id" in installation.account
          ? installation.account.id
          : null;
      const accountType =
        installation.account && "type" in installation.account
          ? (installation.account.type as "User" | "Organization")
          : "Organization";

      if (!accountId) {
        return NextResponse.redirect(
          new URL("/onboarding?error=no-account", request.url)
        );
      }

      // Use upsert to handle race conditions with OAuth sync
      organization = await database.organization.upsert({
        create: {
          githubOrgId: accountId,
          githubOrgLogin: accountLogin,
          githubOrgType: accountType,
          name: accountLogin,
          slug: accountLogin.toLowerCase(),
        },
        update: {
          githubOrgLogin: accountLogin,
          githubOrgType: accountType,
        },
        where: { githubOrgId: accountId },
      });
    }

    // Ensure user is a member of the organization
    await database.organizationMember.upsert({
      create: {
        organizationId: organization.id,
        role: "MEMBER",
        userId: user.id,
      },
      update: {},
      where: {
        userId_organizationId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
    });

    await database.organization.update({
      data: {
        githubAccountLogin: accountLogin,
        githubInstallationId: installationIdNum,
        installedAt: new Date(installation.created_at),
      },
      where: { id: organization.id },
    });

    await syncRepositories(organization.id, installationIdNum);

    return NextResponse.redirect(new URL(`/${organization.slug}`, request.url));
  }

  // For non-install/update actions, fall back to first organization
  const organization = await getFirstOrganization();

  if (!organization) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (setupAction === "request") {
    await database.organization.update({
      data: {
        githubAccountLogin: null,
        githubInstallationId: null,
        installedAt: null,
      },
      where: { id: organization.id },
    });
  }

  return NextResponse.redirect(new URL(`/${organization.slug}`, request.url));
};

/**
 * Sync repositories for an organization using its GitHub App installation.
 * Handles pagination to support organizations with more than 100 repositories.
 */
const syncRepositories = async (orgId: string, installationId: number) => {
  const octokit = await getInstallationOctokit(installationId);

  // Use pagination to fetch all repositories
  const repositories = await octokit.paginate(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 },
    (response) => response.data
  );

  for (const repo of repositories) {
    await database.repo.upsert({
      create: {
        defaultBranch: repo.default_branch,
        fullName: repo.full_name,
        githubRepoId: repo.id,
        name: repo.name,
        organizationId: orgId,
      },
      update: {
        defaultBranch: repo.default_branch,
        fullName: repo.full_name,
        name: repo.name,
      },
      where: { githubRepoId: repo.id },
    });
  }
};
