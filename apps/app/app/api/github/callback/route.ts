import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { getFirstOrganization } from "@/lib/auth";
import { getGitHubApp, getInstallationOctokit } from "@/lib/github/app";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex callback
export const GET = async (request: NextRequest) => {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
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
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
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

    // Find org by GitHub login
    const org = await convexClient.query(api.organizations.getBySlug, {
      slug: accountLogin.toLowerCase(),
    });

    if (!org) {
      // Organization doesn't exist yet - create it
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

      // We need a Clerk org ID. Try to find one from existing org by GitHub ID.
      let existingOrg = await convexClient.query(
        api.organizations.getByGithubOrgId,
        { githubOrgId: accountId }
      );

      if (!existingOrg) {
        // Create a placeholder org with a temporary Clerk org ID
        // The sync flow will properly create the Clerk org later
        const orgId = await convexClient.mutation(
          api.organizations.upsertByClerkOrgId,
          {
            clerkOrgId: `pending_${accountId}`,
            name: accountLogin,
            slug: accountLogin.toLowerCase(),
            githubOrgId: accountId,
            githubOrgLogin: accountLogin,
            githubOrgType: accountType,
          }
        );
        existingOrg = await convexClient.query(
          api.organizations.getByGithubOrgId,
          { githubOrgId: accountId }
        );
      }

      if (existingOrg) {
        await convexClient.mutation(api.organizations.updateInstallation, {
          orgId: existingOrg._id,
          githubInstallationId: installationIdNum,
          githubAccountLogin: accountLogin,
          installedAt: new Date(installation.created_at).getTime(),
        });

        await syncRepositories(existingOrg._id, installationIdNum);

        return NextResponse.redirect(
          new URL(`/${existingOrg.slug}`, request.url)
        );
      }
    } else {
      await convexClient.mutation(api.organizations.updateInstallation, {
        orgId: org._id,
        githubInstallationId: installationIdNum,
        githubAccountLogin: accountLogin,
        installedAt: new Date(installation.created_at).getTime(),
      });

      await syncRepositories(org._id, installationIdNum);

      return NextResponse.redirect(new URL(`/${org.slug}`, request.url));
    }
  }

  const organization = await getFirstOrganization();

  if (!organization) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (setupAction === "request") {
    await convexClient.mutation(api.organizations.clearInstallation, {
      orgId: organization._id,
    });
  }

  return NextResponse.redirect(
    new URL(`/${organization.slug}`, request.url)
  );
};

const syncRepositories = async (
  orgId: Parameters<typeof convexClient.mutation>[1] extends {
    organizationId: infer T;
  }
    ? T
    : string,
  installationId: number
) => {
  const octokit = await getInstallationOctokit(installationId);
  const repositories = await octokit.paginate(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 },
    (response) => response.data
  );

  for (const repo of repositories) {
    await convexClient.mutation(api.repos.upsertByGithubRepoId, {
      organizationId: orgId as any,
      githubRepoId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
    });
  }
};
