import { database } from "@repo/backend";
import {
  SidebarInset,
  SidebarProvider,
} from "@repo/design-system/components/ui/sidebar";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getOrganizationBySlug } from "@/lib/auth";
import { InstallationEmptyState } from "./components/installation-empty-state";
import { OrganizationEmptyState } from "./components/organization-empty-state";
import { RepoSidebar } from "./components/repo-sidebar";
import { SubscriptionBanner } from "./components/subscription-banner";

const OrgLayout = async ({ children, params }: LayoutProps<"/[orgSlug]">) => {
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
        <InstallationEmptyState />
      </div>
    );
  }

  if (organization.repos.length === 0) {
    return (
      <div className="container relative mx-auto grid w-full gap-8 px-4 2xl:max-w-7xl">
        <OrganizationEmptyState hasInstallation={hasInstallation} />
      </div>
    );
  }

  const isSubscribed = Boolean(organization.stripeCustomerId);

  return (
    <div className="flex min-h-screen flex-col">
      <SidebarProvider className="min-h-auto flex-1">
        <RepoSidebar />
        <SidebarInset>
          {!isSubscribed && (
            <SubscriptionBanner organizationId={organization.id} />
          )}
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};

export default OrgLayout;
