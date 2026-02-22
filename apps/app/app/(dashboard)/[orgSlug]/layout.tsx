import {
  SidebarInset,
  SidebarProvider,
} from "@repo/design-system/components/ui/sidebar";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { api } from "../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { getOrganizationBySlug } from "@/lib/auth";
import { InstallationEmptyState } from "./components/installation-empty-state";
import { OrganizationEmptyState } from "./components/organization-empty-state";
import { RepoSidebar } from "./components/repo-sidebar";
import { SubscriptionBanner } from "./components/subscription-banner";

const OrgLayout = async ({ children, params }: LayoutProps<"/[orgSlug]">) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);

  if (!org) {
    notFound();
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
      <RepoSidebar orgSlug={orgSlug} />
      <SidebarInset>
        {!isSubscribed && (
          <SubscriptionBanner organizationId={org._id} />
        )}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default OrgLayout;
