import { type NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";
import { getGitHubApp, getInstallationOctokit } from "@/lib/github/app";
import { createClient } from "@/lib/supabase/server";

export const GET = async (request: NextRequest) => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const orgId = "";

  if (!orgId) {
    return NextResponse.redirect(new URL("/login", request.url));
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

    await database.organization.upsert({
      where: { id: orgId },
      create: {
        id: orgId,
        githubInstallationId: installationIdNum,
        githubAccountLogin: accountLogin,
        installedAt: new Date(installation.created_at),
      },
      update: {
        githubInstallationId: installationIdNum,
        githubAccountLogin: accountLogin,
        installedAt: new Date(installation.created_at),
      },
    });

    await syncRepositories(orgId, installationIdNum);

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (setupAction === "request") {
    await database.organization.update({
      where: { id: orgId },
      data: {
        githubInstallationId: null,
        githubAccountLogin: null,
        installedAt: null,
      },
    });
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
};

const syncRepositories = async (orgId: string, installationId: number) => {
  const octokit = await getInstallationOctokit(installationId);

  const { data } = await octokit.request("GET /installation/repositories", {
    per_page: 100,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  for (const repo of data.repositories) {
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
