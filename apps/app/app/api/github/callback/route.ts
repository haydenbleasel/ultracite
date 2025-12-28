import { database } from "@repo/backend";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getFirstOrganization } from "@/lib/auth";
import { getGitHubApp, getInstallationOctokit } from "@/lib/github/app";

export const GET = async (request: NextRequest) => {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
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
        installation_id: installationIdNum,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
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

    // Find the organization that matches the GitHub account login
    const organization = await database.organization.findFirst({
      where: {
        githubOrgLogin: accountLogin,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.redirect(
        new URL("/onboarding?error=org-not-found", request.url)
      );
    }

    await database.organization.update({
      where: { id: organization.id },
      data: {
        githubInstallationId: installationIdNum,
        githubAccountLogin: accountLogin,
        installedAt: new Date(installation.created_at),
      },
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
      where: { id: organization.id },
      data: {
        githubInstallationId: null,
        githubAccountLogin: null,
        installedAt: null,
      },
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
};
