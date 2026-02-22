import {
  SidebarInset,
  SidebarProvider,
} from "@repo/design-system/components/ui/sidebar";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { api } from "../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { getActiveOrganization } from "@/lib/auth";
import { InstallationEmptyState } from "./components/installation-empty-state";
import { OrganizationEmptyState } from "./components/organization-empty-state";
import { RepoSidebar } from "./components/repo-sidebar";
import { SubscriptionBanner } from "./components/subscription-banner";
import type { ReactNode } from "react";

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const org = await getActiveOrganization();

  if (!org) {
    return (
      <div className="container relative mx-auto flex min-h-[calc(100vh-var(--navbar-height))] w-full max-w-lg flex-col items-center justify-center px-4">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-semibold text-3xl tracking-tight">
            No organization selected
          </h1>
          <p className="text-balance text-muted-foreground">
            Select an organization from the switcher in the navigation bar.
          </p>
        </div>
      </div>
    );
  }

  const organization = await convexClient.query(
    api.organizations.getWithRepos,
    { orgId: org._id }
  );

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
    <SidebarProvider className="min-h-auto flex-1">
      <RepoSidebar />
      <SidebarInset>
        {!isSubscribed && (
          <SubscriptionBanner organizationId={org._id} />
        )}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
