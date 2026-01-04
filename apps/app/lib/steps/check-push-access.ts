import { getInstallationOctokit } from "@/lib/github/app";

export interface PushAccessResult {
  canPush: boolean;
  reason?: string;
}

export async function checkPushAccess(
  installationId: number,
  repoFullName: string,
  branch: string
): Promise<PushAccessResult> {
  "use step";

  const [owner, repo] = repoFullName.split("/");
  const octokit = await getInstallationOctokit(installationId);

  // Check if the repository is archived
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

  if (repoData.archived) {
    return {
      canPush: false,
      reason: "Repository is archived and cannot be modified",
    };
  }

  // Check installation permissions for this repo
  const { data: installation } = await octokit.rest.apps.getInstallation({
    installation_id: installationId,
  });

  // Check if the installation has write access to contents
  const permissions = installation.permissions;

  if (!permissions?.contents || permissions.contents === "read") {
    return {
      canPush: false,
      reason: "Installation does not have write access to repository contents",
    };
  }

  // Check branch protection rules
  try {
    const { data: protection } = await octokit.rest.repos.getBranchProtection({
      owner,
      repo,
      branch,
    });

    // Check if there are restrictions on who can push
    if (protection.restrictions) {
      // If there are restrictions, we need to check if apps are allowed
      const allowedApps = protection.restrictions.apps || [];
      const appSlug = "ultracite"; // Your GitHub App slug

      const isAppAllowed = allowedApps.some((app) => app.slug === appSlug);
      if (!isAppAllowed && allowedApps.length > 0) {
        return {
          canPush: false,
          reason: `Branch "${branch}" has push restrictions that don't include the Ultracite app`,
        };
      }
    }

    // Check if required status checks would block us
    if (protection.required_status_checks?.strict) {
      // Strict mode requires branch to be up to date - this could block pushes
      // but we'll allow it and let the push fail if needed
    }
  } catch (error) {
    // 404 means no branch protection - that's fine, we can push
    // 403 can mean branch protection isn't available (requires GitHub Pro for private repos)
    if (
      error instanceof Error &&
      "status" in error &&
      ((error as { status: number }).status === 404 ||
        (error as { status: number }).status === 403)
    ) {
      return { canPush: true };
    }
    throw error;
  }

  return { canPush: true };
}
