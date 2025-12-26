import { auth } from "@clerk/nextjs/server";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ConnectGitHubButton } from "@/components/dashboard/connect-github-button";
import { RepoSidebar } from "@/components/dashboard/repo-sidebar";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { database } from "@/lib/database";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = async ({ children }: DashboardLayoutProps) => {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

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
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const hasInstallation = Boolean(organization.githubInstallationId);

  if (!hasInstallation) {
    return (
      <div className="container relative mx-auto grid w-full gap-8 px-4 2xl:max-w-7xl">
        <Empty className="py-8 sm:py-12 md:py-16">
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
          <EmptyContent>
            <ConnectGitHubButton hasInstallation={false} />
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (organization.repos.length === 0) {
    return (
      <div className="container relative mx-auto grid w-full gap-8 px-4 2xl:max-w-7xl">
        <Empty className="py-8 sm:py-12 md:py-16">
          <EmptyHeader>
            <EmptyTitle>No repositories</EmptyTitle>
            <EmptyDescription>
              No repositories found. Make sure you have granted access to at
              least one repository.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ConnectGitHubButton hasInstallation={hasInstallation} />
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <RepoSidebar
        hasInstallation={hasInstallation}
        repos={organization.repos}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
