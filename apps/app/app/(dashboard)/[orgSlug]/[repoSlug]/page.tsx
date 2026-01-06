import { database } from "@repo/backend/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { SidebarTrigger } from "@repo/design-system/components/ui/sidebar";
import { CheckCircleIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getOrganizationBySlug } from "@/lib/auth";
import { CostTracker } from "./components/cost-tracker";
import { RepoSettings } from "./components/repo-settings";
import { RepoTable } from "./components/repo-table";

export const generateMetadata = async ({
  params,
}: PageProps<"/[orgSlug]/[repoSlug]">): Promise<Metadata> => {
  const { orgSlug, repoSlug } = await params;
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    return {
      title: "Repository",
      description: "Lint runs for this repository.",
    };
  }

  const repo = await database.repo.findFirst({
    where: {
      name: repoSlug,
      organizationId: organization.id,
    },
    select: { fullName: true },
  });

  return {
    title: repo?.fullName ?? "Repository",
    description: `Lint runs for ${repo?.fullName ?? "this repository"}.`,
  };
};

const RepoPage = async ({ params }: PageProps<"/[orgSlug]/[repoSlug]">) => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { orgSlug, repoSlug } = await params;
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const repo = await database.repo.findFirst({
    where: {
      name: repoSlug,
      organizationId: organization.id,
    },
    include: {
      lintRuns: {
        orderBy: { createdAt: "desc" },
      },
      organization: {
        select: {
          stripeCustomerId: true,
        },
      },
    },
  });

  if (!repo) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center gap-4 border-b px-4">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-medium tracking-tight">{repo.fullName}</h1>
            {repo.dailyRunsEnabled && (
              <Badge className="hidden lg:flex" variant="secondary">
                <CheckCircleIcon className="size-4" /> Daily runs
              </Badge>
            )}
            {repo.prReviewEnabled && (
              <Badge className="hidden lg:flex" variant="secondary">
                <CheckCircleIcon className="size-4" /> PR reviews
              </Badge>
            )}
            <CostTracker runs={repo.lintRuns} />
          </div>
          <div className="flex items-center gap-px">
            <RepoSettings
              defaultBranch={repo.defaultBranch}
              defaultDailyRunsEnabled={repo.dailyRunsEnabled}
              defaultPrReviewEnabled={repo.prReviewEnabled}
              repoId={repo.id}
            />
            <Button asChild size="icon" variant="ghost">
              <a
                href={`https://github.com/${repo.fullName}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>
      <main>
        <RepoTable
          isSubscribed={Boolean(repo.organization.stripeCustomerId)}
          repoId={repo.id}
          runs={repo.lintRuns}
        />
      </main>
    </div>
  );
};

export default RepoPage;
