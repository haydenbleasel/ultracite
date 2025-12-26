import { auth } from "@clerk/nextjs/server";
import { IconExternalLink } from "@tabler/icons-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RepoTable } from "@/components/dashboard/repo-table";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { database } from "@/lib/database";

interface RepoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: RepoPageProps): Promise<Metadata> => {
  const { id } = await params;
  const repo = await database.repo.findUnique({
    where: { id },
    select: { fullName: true },
  });

  return {
    title: repo?.fullName ?? "Repository",
    description: `Lint runs for ${repo?.fullName ?? "this repository"}.`,
  };
};

const RepoPage = async ({ params }: RepoPageProps) => {
  const { orgId } = await auth();
  const { id } = await params;

  if (!orgId) {
    redirect("/sign-in");
  }

  const repo = await database.repo.findUnique({
    where: {
      id,
      organizationId: orgId,
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
            <h1 className="font-semibold text-lg">{repo.fullName}</h1>
            <Link
              className="text-muted-foreground hover:text-foreground"
              href={`https://github.com/${repo.fullName}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <IconExternalLink className="size-4" />
            </Link>
          </div>
          <p className="font-mono text-muted-foreground text-sm">
            {repo.defaultBranch}
          </p>
        </div>
      </header>
      <main className="flex-1 p-4">
        <RepoTable runs={repo.lintRuns} />
      </main>
    </div>
  );
};

export default RepoPage;
