import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";
import { env } from "@/lib/env";

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
