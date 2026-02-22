import crypto from "node:crypto";
import type {
  InstallationEvent,
  InstallationRepositoriesEvent,
  IssueCommentEvent,
} from "@octokit/webhooks-types";
import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { api } from "../../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { env } from "@/lib/env";
import { getInstallationOctokit } from "@/lib/github/app";
import { type ReviewPRParams, reviewPRWorkflow } from "./review-pr";

const verifySignature = (payload: string, signature: string): boolean => {
  const expected = `sha256=${crypto
    .createHmac("sha256", env.GITHUB_APP_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

export const POST = async (request: NextRequest) => {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!(signature && verifySignature(payload, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");

  switch (event) {
    case "installation":
      await handleInstallationEvent(JSON.parse(payload) as InstallationEvent);
      break;
    case "installation_repositories":
      await handleInstallationRepositoriesEvent(
        JSON.parse(payload) as InstallationRepositoriesEvent
      );
      break;
    case "issue_comment":
      await handleIssueCommentEvent(JSON.parse(payload) as IssueCommentEvent);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
};

const handleInstallationEvent = async (data: InstallationEvent) => {
  const { action, installation } = data;

  if (action === "deleted") {
    const org = await convexClient.query(
      api.organizations.getByGithubInstallationId,
      { installationId: installation.id }
    );

    if (org) {
      await convexClient.mutation(api.repos.deleteByOrganizationId, {
        organizationId: org._id,
      });
      await convexClient.mutation(api.organizations.clearInstallation, {
        orgId: org._id,
      });
    }
  }
};

const handleInstallationRepositoriesEvent = async (
  data: InstallationRepositoriesEvent
) => {
  const { action, installation, repositories_added, repositories_removed } =
    data;

  const org = await convexClient.query(
    api.organizations.getByGithubInstallationId,
    { installationId: installation.id }
  );

  if (!org) {
    return;
  }

  if (action === "added" && repositories_added) {
    const octokit = await getInstallationOctokit(installation.id);

    for (const repo of repositories_added) {
      const { data: repoData } = await octokit.request(
        "GET /repositories/{id}",
        {
          id: repo.id,
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
        }
      );

      await convexClient.mutation(api.repos.upsertByGithubRepoId, {
        organizationId: org._id,
        githubRepoId: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repoData.default_branch,
      });
    }
  }

  if (action === "removed" && repositories_removed) {
    for (const repo of repositories_removed) {
      await convexClient.mutation(api.repos.deleteByGithubRepoId, {
        githubRepoId: repo.id,
      });
    }
  }
};

const isReviewTrigger = (comment: string): boolean => {
  const normalized = comment.trim().toLowerCase();
  const appSlug = env.NEXT_PUBLIC_GITHUB_APP_SLUG.toLowerCase();

  return (
    normalized === `@${appSlug} review` ||
    normalized === `${appSlug} review` ||
    normalized === `/${appSlug} review`
  );
};

const handleIssueCommentEvent = async (data: IssueCommentEvent) => {
  const { action, installation, issue, comment, repository } = data;

  if (action !== "created") {
    return;
  }

  if (!issue?.pull_request) {
    return;
  }

  if (!(comment && isReviewTrigger(comment.body))) {
    return;
  }

  if (!(repository && installation)) {
    return;
  }

  const repo = await convexClient.query(api.repos.getByGithubRepoId, {
    githubRepoId: repository.id,
  });

  if (!repo) {
    return;
  }

  const org = await convexClient.query(api.organizations.getByClerkOrgId, {
    clerkOrgId: "", // Need to look up by org ID instead
  });

  // Look up org directly
  const organization = await (async () => {
    // Use the repo's organizationId to get the org
    const allOrgs = await convexClient.query(
      api.organizations.getSubscribedWithInstallation,
      {}
    );
    return allOrgs.find((o) => o._id === repo.organizationId) ?? null;
  })();

  if (!organization) {
    return;
  }

  if (!(repo.prReviewEnabled && organization.stripeCustomerId)) {
    return;
  }

  const octokit = await getInstallationOctokit(installation.id);
  const [owner, repoName] = repository.full_name.split("/");
  const { data: pullRequest } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo: repoName,
      pull_number: issue.number,
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
    }
  );

  // Atomic check-and-create via Convex mutation
  const lintRunId = await convexClient.mutation(
    api.lintRuns.createIfNoRunning,
    {
      organizationId: repo.organizationId,
      repoId: repo._id,
      prNumber: issue.number,
    }
  );

  if (!lintRunId) {
    return;
  }

  const params: ReviewPRParams = {
    installationId: installation.id,
    repoFullName: repository.full_name,
    prNumber: issue.number,
    prBranch: pullRequest.head.ref,
    baseBranch: pullRequest.base.ref,
    lintRunId,
    stripeCustomerId: organization.stripeCustomerId,
  };

  try {
    await start(reviewPRWorkflow, [params]);
  } catch (error) {
    await convexClient.mutation(api.lintRuns.update, {
      id: lintRunId,
      status: "FAILED",
      completedAt: Date.now(),
      errorMessage:
        error instanceof Error ? error.message : "Failed to start workflow",
    });
    throw error;
  }
};
