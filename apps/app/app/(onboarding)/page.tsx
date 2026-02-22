import { Button } from "@repo/design-system/components/ui/button";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganizations } from "@/lib/auth";
import { OrganizationList } from "./components/organization-list";

export const metadata: Metadata = {
  title: "Select Organization",
  description: "Select an organization to get started with Ultracite.",
};

const OnboardingPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const organizations = await getUserOrganizations();

  if (organizations.length === 1 && organizations[0]) {
    redirect(`/${organizations[0].slug}`);
  }

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
          <a href="/api/auth/sync">Sync organizations</a>
        </Button>
      </div>
    </div>
  );
};

export default OnboardingPage;
