import { SiGithub } from "@icons-pack/react-simple-icons";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  SidebarInset,
  SidebarProvider,
} from "@repo/design-system/components/ui/sidebar";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser, getOrganizationBySlug } from "@/lib/auth";
import { database } from "@/lib/database";
import { ConnectGitHubButton } from "./components/connect-github-button";
import { RepoSidebar } from "./components/repo-sidebar";

interface OrgLayoutProps {
  children: ReactNode;
  params: Promise<{
    orgSlug: string;
  }>;
}

const OrgLayout = async ({ children, params }: OrgLayoutProps) => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);

  if (!org) {
    notFound();
  }

  const organization = await database.organization.findUnique({
    where: { id: org.id },
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

  if (!organization) {
    notFound();
  }

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
    <SidebarProvider className="min-h-auto">
      <RepoSidebar orgSlug={orgSlug} repos={organization.repos} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
};

export default OrgLayout;
