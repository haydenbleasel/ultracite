import { database } from "@repo/backend/database";
import { Button } from "@repo/design-system/components/ui/button";
import { SidebarTrigger } from "@repo/design-system/components/ui/sidebar";
import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getOrganizationBySlug } from "@/lib/auth";
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
    },
  });

  if (!repo) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center gap-4 border-b px-4">
        <SidebarTrigger />
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-medium tracking-tight">{repo.fullName}</h1>
          </div>
          <div className="flex items-center gap-px">
            <RepoSettings defaultBranch={repo.defaultBranch} repoId={repo.id} />
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
        <RepoTable runs={repo.lintRuns} />
      </main>
    </div>
  );
};

export default RepoPage;
