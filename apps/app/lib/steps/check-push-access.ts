import { api } from "../../convex/_generated/api";
import { convexClient } from "../convex";
import { handleGitHubError, parseError } from "@/lib/error";
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

  const octokit = await getInstallationOctokit(installationId).catch(
    (error: unknown) => {
      throw new Error(
        `[checkPushAccess] Failed to get GitHub client: ${parseError(error)}`
      );
    }
  );

  let repoData: Awaited<ReturnType<typeof octokit.rest.repos.get>>["data"];

  try {
    const response = await octokit.rest.repos.get({ owner, repo });
    repoData = response.data;
  } catch (error) {
    return handleGitHubError(error, "Failed to get repository info");
  }

  if (repoData.archived) {
    await convexClient.mutation(api.repos.disableByFullName, {
      fullName: repoFullName,
    });

    return {
      canPush: false,
      reason: "Repository is archived and cannot be modified",
    };
  }

  let installation: Awaited<
    ReturnType<typeof octokit.rest.apps.getInstallation>
  >["data"];

  try {
    const response = await octokit.rest.apps.getInstallation({
      installation_id: installationId,
    });
    installation = response.data;
  } catch (error) {
    return handleGitHubError(error, "Failed to get installation info");
  }

  const permissions = installation.permissions;

  if (!permissions?.contents || permissions.contents === "read") {
    return {
      canPush: false,
      reason: "Installation does not have write access to repository contents",
    };
  }

  try {
    const { data: protection } = await octokit.rest.repos.getBranchProtection({
      owner,
      repo,
      branch,
    });

    if (protection.restrictions) {
      const allowedApps = protection.restrictions.apps || [];
      const appSlug = "ultracite";

      const isAppAllowed = allowedApps.some((app) => app.slug === appSlug);
      if (!isAppAllowed && allowedApps.length > 0) {
        return {
          canPush: false,
          reason: `Branch "${branch}" has push restrictions that don't include the Ultracite app`,
        };
      }
    }
  } catch (error) {
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
