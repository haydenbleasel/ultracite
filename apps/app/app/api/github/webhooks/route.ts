import crypto from "node:crypto";
import { database } from "@repo/backend/database";
import { type NextRequest, NextResponse } from "next/server";
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
  const data = JSON.parse(payload) as WebhookPayload;

  switch (event) {
    case "installation":
      await handleInstallationEvent(data);
      break;
    case "installation_repositories":
      await handleInstallationRepositoriesEvent(data);
      break;
    case "issue_comment":
      await handleIssueCommentEvent(data);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
};

interface WebhookPayload {
  action: string;
  installation: {
    id: number;
  };
  repositories_added?: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }[];
  repositories_removed?: {
    id: number;
  }[];
  issue?: {
    number: number;
    pull_request?: {
      url: string;
    };
  };
  comment?: {
    body: string;
  };
  repository?: {
    id: number;
    full_name: string;
  };
}

const handleInstallationEvent = async (data: WebhookPayload) => {
  const { action, installation } = data;

  if (action === "deleted") {
    const org = await database.organization.findFirst({
      where: { githubInstallationId: installation.id },
    });

    if (org) {
      await database.repo.deleteMany({ where: { organizationId: org.id } });
      await database.organization.update({
        where: { id: org.id },
        data: {
          githubInstallationId: null,
          githubAccountLogin: null,
          installedAt: null,
        },
      });
    }
  }
};

const handleInstallationRepositoriesEvent = async (data: WebhookPayload) => {
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
          id: repo.id,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      await database.repo.upsert({
        where: { githubRepoId: repo.id },
        create: {
          organizationId: org.id,
          githubRepoId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          defaultBranch: repoData.default_branch,
        },
        update: {
          name: repo.name,
          fullName: repo.full_name,
          defaultBranch: repoData.default_branch,
        },
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

const handleIssueCommentEvent = async (data: WebhookPayload) => {
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

  if (!repository) {
    throw new Error(`Invalid repository: ${JSON.stringify({ repository })}`);
  }

  // Check if this repo is tracked by Ultracite
  const repo = await database.repo.findFirst({
    where: { githubRepoId: repository.id },
    include: { organization: true },
  });

  if (!repo) {
    return;
  }

  // Skip if repo is not enabled or organization is not subscribed
  if (!(repo.enabled && repo.organization.stripeCustomerId)) {
    return;
  }

  // Fetch PR details to get branch info
  const octokit = await getInstallationOctokit(installation.id);
  const [owner, repoName] = repository.full_name.split("/");
  const { data: pullRequest } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo: repoName,
      pull_number: issue.number,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  let lintRunId: string | undefined;

  try {
    lintRunId = await database.$transaction(
      async (tx) => {
        // Check if there's already a running review for this PR
        const existingRun = await tx.lintRun.findFirst({
          where: {
            repoId: repo.id,
            prNumber: issue.number,
            status: {
              in: ["PENDING", "RUNNING"],
            },
          },
          select: {
            id: true,
          },
        });

        if (existingRun) {
          // Skip - there's already a review in progress for this PR
          return undefined;
        }

        // Create a lint run record within the same transaction
        const lintRun = await tx.lintRun.create({
          data: {
            organizationId: repo.organizationId,
            repoId: repo.id,
            prNumber: issue.number,
            status: "RUNNING",
            startedAt: new Date(),
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
    installationId: installation.id,
    repoFullName: repository.full_name,
    prNumber: issue.number,
    prBranch: pullRequest.head.ref,
    baseBranch: pullRequest.base.ref,
    lintRunId,
    stripeCustomerId: repo.organization.stripeCustomerId,
  };

  try {
    await start(reviewPRWorkflow, [params]);
  } catch (error) {
    // Mark the lint run as failed if workflow startup fails
    await database.lintRun.update({
      where: { id: lintRunId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage:
          error instanceof Error ? error.message : "Failed to start workflow",
      },
    });
    throw error;
  }
};
