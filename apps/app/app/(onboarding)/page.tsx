import { Button } from "@repo/design-system/components/ui/button";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser, getUserOrganizations } from "@/lib/auth";

import { OrganizationList } from "./components/organization-list";

export const metadata: Metadata = {
  description: "Select an organization to get started with Ultracite.",
  title: "Select Organization",
};

const OnboardingPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user's organizations
  const organizations = await getUserOrganizations();

  // If user has exactly one organization, redirect to it
  if (organizations.length === 1) {
    redirect(`/${organizations[0].slug}`);
  }

  // If user has multiple organizations, let them choose
  if (organizations.length > 1) {
    return (
      <div className="container relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-lg flex-col items-center justify-center px-4">
        <div className="flex w-full flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="font-semibold text-3xl tracking-tight">
              Select an organization
            </h1>
            <p className="text-balance text-muted-foreground">
              Choose which organization you want to work with.
            </p>
          </div>
          <OrganizationList organizations={organizations} />
        </div>
      </div>
    );
  }

  // No organizations - this shouldn't happen since we sync on login
  // but handle it gracefully
  return (
    <div className="container relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-lg flex-col items-center justify-center px-4">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-semibold text-3xl tracking-tight">
            No organizations found
          </h1>
          <p className="text-balance text-muted-foreground">
            We couldn&apos;t find any GitHub organizations for your account.
            Please try logging in again to sync your organizations.
          </p>
        </div>
        <Button asChild className="mx-auto w-fit">
          <a href="/auth/login">Log in again</a>
        </Button>
      </div>
    </div>
  );
};

export default OnboardingPage;
