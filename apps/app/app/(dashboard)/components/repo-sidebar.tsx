"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import type { LintRun, Organization, Repo } from "@repo/backend/database";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/design-system/components/ui/sidebar";
import { IconBuilding, IconGitFork } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LintStatusBadge } from "./lint-status-badge";

type RepoWithLintRuns = Repo & {
  lintRuns: LintRun[];
};

type OrganizationWithRepos = Organization & {
  repos: RepoWithLintRuns[];
};

interface RepoSidebarProps {
  organizations: OrganizationWithRepos[];
  currentOrgSlug: string;
}

export const RepoSidebar = ({
  organizations,
  currentOrgSlug,
}: RepoSidebarProps) => {
  const pathname = usePathname();

  return (
    <Sidebar className="top-(--navbar-height) h-[calc(100svh-var(--navbar-height))]">
      <SidebarContent>
        {organizations.map((org) => (
          <SidebarGroup key={org.id}>
            <SidebarGroupLabel className="gap-2">
              <IconBuilding className="size-4" />
              <Link href={`/${org.slug}`} className="truncate hover:underline">
                {org.name}
              </Link>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {org.repos.map((repo) => {
                  const latestRun = repo.lintRuns[0];
                  const isActive = pathname === `/${org.slug}/${repo.id}`;

                  return (
                    <SidebarMenuItem key={repo.id}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={`/${org.slug}/${repo.id}`}>
                          <IconGitFork className="size-4" />
                          <span className="flex-1 truncate">{repo.name}</span>
                          {latestRun && (
                            <LintStatusBadge status={latestRun.status} />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                {org.repos.length === 0 && (
                  <SidebarMenuItem>
                    <span className="px-2 py-1.5 text-muted-foreground text-xs">
                      No repositories
                    </span>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG}/installations/new`}
              >
                <SiGithub className="size-4" />
                <span>GitHub Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
