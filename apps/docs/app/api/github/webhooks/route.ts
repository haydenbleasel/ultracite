import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { database } from "@/lib/database";
import { env } from "@/lib/env";
import { reviewPRWorkflow, type ReviewPRParams } from "./review-pr";

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
    case "pull_request":
      await handlePullRequestEvent(data);
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
  pull_request?: {
    number: number;
    head: {
      ref: string;
    };
    base: {
      ref: string;
    };
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
    for (const repo of repositories_added) {
      await database.repo.upsert({
        where: { githubRepoId: repo.id },
        create: {
          organizationId: org.id,
          githubRepoId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          defaultBranch: "main",
        },
        update: {
          name: repo.name,
          fullName: repo.full_name,
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

const handlePullRequestEvent = async (data: WebhookPayload) => {
  const { action, installation, pull_request, repository } = data;

  // Only run on opened or synchronized (new commits pushed) PRs
  if (action !== "opened" && action !== "synchronize") {
    return;
  }

  if (!(pull_request && repository)) {
    throw new Error(
      `Invalid pull request or repository: ${JSON.stringify({ pull_request, repository })}`
    );
  }

  // Check if this repo is tracked by Ultracite
  const repo = await database.repo.findFirst({
    where: { githubRepoId: repository.id },
    include: { organization: true },
  });

  if (!repo) {
    return;
  }

  // Deduplication: Check if there's already a running review for this PR
  const existingRun = await database.lintRun.findFirst({
    where: {
      repoId: repo.id,
      prNumber: pull_request.number,
      status: {
        in: ["PENDING", "RUNNING"],
      },
    },
  });

  if (existingRun) {
    // Skip - there's already a review in progress for this PR
    return;
  }

  // Create a lint run record to track this review and prevent duplicates
  const lintRun = await database.lintRun.create({
    data: {
      organizationId: repo.organizationId,
      repoId: repo.id,
      prNumber: pull_request.number,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  // Run the review workflow
  const params: ReviewPRParams = {
    installationId: installation.id,
    repoFullName: repository.full_name,
    prNumber: pull_request.number,
    prBranch: pull_request.head.ref,
    baseBranch: pull_request.base.ref,
    lintRunId: lintRun.id,
  };

  try {
    await start(reviewPRWorkflow, [params]);
  } catch (error) {
    // Mark the lint run as failed if workflow startup fails
    await database.lintRun.update({
      where: { id: lintRun.id },
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
