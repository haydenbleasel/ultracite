import { auth } from "@clerk/nextjs/server";
import { SiGithub } from "@icons-pack/react-simple-icons";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConnectGitHubButton } from "@/components/dashboard/connect-github-button";
import { RepoList } from "@/components/dashboard/repo-list";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { database } from "@/lib/database";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your connected repositories and lint runs.",
};

const DashboardPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const organization = await database.organization.upsert({
    where: { id: orgId },
    create: { id: orgId },
    update: {},
    include: {
      repos: {
        where: { enabled: true },
        orderBy: { createdAt: "desc" },
        include: {
          lintRuns: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  const hasInstallation = Boolean(organization.githubInstallationId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your connected repositories and lint runs.
          </p>
        </div>
        <ConnectGitHubButton hasInstallation={hasInstallation} />
      </div>

      {hasInstallation ? (
        organization.repos.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No repositories</EmptyTitle>
              <EmptyDescription>
                No repositories found. Make sure you have granted access to at
                least one repository.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <RepoList repos={organization.repos} />
        )
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SiGithub className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Connect GitHub</EmptyTitle>
            <EmptyDescription>
              Install the Ultracite GitHub App to start linting your
              repositories automatically.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
};

export default DashboardPage;
