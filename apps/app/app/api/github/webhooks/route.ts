import type {
  InstallationEvent,
  InstallationRepositoriesEvent,
  IssueCommentEvent,
} from "@octokit/webhooks-types";
import { database } from "@repo/backend/database";
import { type NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { start } from "workflow/api";

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
    case "installation": {
      await handleInstallationEvent(JSON.parse(payload) as InstallationEvent);
      break;
    }
    case "installation_repositories": {
      await handleInstallationRepositoriesEvent(
        JSON.parse(payload) as InstallationRepositoriesEvent
      );
      break;
    }
    case "issue_comment": {
      await handleIssueCommentEvent(JSON.parse(payload) as IssueCommentEvent);
      break;
    }
    default: {
      break;
    }
  }

  return NextResponse.json({ received: true });
};

const handleInstallationEvent = async (data: InstallationEvent) => {
  const { action, installation } = data;

  if (action === "deleted") {
    const org = await database.organization.findFirst({
      where: { githubInstallationId: installation.id },
    });

    if (org) {
      await database.repo.deleteMany({ where: { organizationId: org.id } });
      await database.organization.update({
        data: {
          githubAccountLogin: null,
          githubInstallationId: null,
          installedAt: null,
        },
        where: { id: org.id },
      });
    }
  }
};

const handleInstallationRepositoriesEvent = async (
  data: InstallationRepositoriesEvent
) => {
  const { action, installation, repositories_added, repositories_removed } =
    data;

  const org = await database.organization.findFirst({
    where: { githubInstallationId: installation.id },
  });

  if (!org) {
    return;
  }

  if (action === "added" && repositories_added) {
    // Fetch repository details from GitHub API to get the default branch
    const octokit = await getInstallationOctokit(installation.id);

    for (const repo of repositories_added) {
      // Fetch the full repository data to get the default branch
      const { data: repoData } = await octokit.request(
        "GET /repositories/{id}",
        {
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
          id: repo.id,
        }
      );

      await database.repo.upsert({
        create: {
          defaultBranch: repoData.default_branch,
          fullName: repo.full_name,
          githubRepoId: repo.id,
          name: repo.name,
          organizationId: org.id,
        },
        update: {
          defaultBranch: repoData.default_branch,
          fullName: repo.full_name,
          name: repo.name,
        },
        where: { githubRepoId: repo.id },
      });
    }
  }

  if (action === "removed" && repositories_removed) {
    for (const repo of repositories_removed) {
      await database.repo
        .delete({
          where: { githubRepoId: repo.id },
        })
        .catch(() => {
          // Ignore if already deleted
        });
    }
  }
};

// Check if comment matches trigger patterns
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

  // Only handle new comments
  if (action !== "created") {
    return;
  }

  // Check if this is a PR comment (not a regular issue)
  if (!issue?.pull_request) {
    return;
  }

  // Check if the comment is a review trigger
  if (!(comment && isReviewTrigger(comment.body))) {
    return;
  }

  if (!(repository && installation)) {
    return;
  }

  // Check if this repo is tracked by Ultracite
  const repo = await database.repo.findFirst({
    include: { organization: true },
    where: { githubRepoId: repository.id },
  });

  if (!repo) {
    return;
  }

  // Skip if PR reviews are disabled or organization is not subscribed
  if (!(repo.prReviewEnabled && repo.organization.stripeCustomerId)) {
    return;
  }

  // Fetch PR details to get branch info
  const octokit = await getInstallationOctokit(installation.id);
  const [owner, repoName] = repository.full_name.split("/");
  const { data: pullRequest } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
      owner,
      pull_number: issue.number,
      repo: repoName,
    }
  );

  let lintRunId: string | undefined;

  try {
    lintRunId = await database.$transaction(
      async (tx) => {
        // Check if there's already a running review for this PR
        const existingRun = await tx.lintRun.findFirst({
          select: {
            id: true,
          },
          where: {
            prNumber: issue.number,
            repoId: repo.id,
            status: {
              in: ["PENDING", "RUNNING"],
            },
          },
        });

        if (existingRun) {
          // Skip - there's already a review in progress for this PR
          return;
        }

        // Create a lint run record within the same transaction
        const lintRun = await tx.lintRun.create({
          data: {
            organizationId: repo.organizationId,
            prNumber: issue.number,
            repoId: repo.id,
            startedAt: new Date(),
            status: "RUNNING",
          },
          select: {
            id: true,
          },
        });

        return lintRun.id;
      },
      {
        isolationLevel: "Serializable",
      }
    );
  } catch (error) {
    // Serialization failure means another transaction won the race - that's fine
    if (
      error instanceof Error &&
      error.message.includes("could not serialize access")
    ) {
      return;
    }
    throw error;
  }

  if (!lintRunId) {
    // A review is already in progress for this PR
    return;
  }

  // Run the review workflow
  const params: ReviewPRParams = {
    baseBranch: pullRequest.base.ref,
    installationId: installation.id,
    lintRunId,
    prBranch: pullRequest.head.ref,
    prNumber: issue.number,
    repoFullName: repository.full_name,
    stripeCustomerId: repo.organization.stripeCustomerId,
  };

  try {
    await start(reviewPRWorkflow, [params]);
  } catch (error) {
    // Mark the lint run as failed if workflow startup fails
    await database.lintRun.update({
      data: {
        completedAt: new Date(),
        errorMessage:
          error instanceof Error ? error.message : "Failed to start workflow",
        status: "FAILED",
      },
      where: { id: lintRunId },
    });
    throw error;
  }
};
