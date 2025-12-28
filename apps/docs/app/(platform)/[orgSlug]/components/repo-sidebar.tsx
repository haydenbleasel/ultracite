"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import { IconGitFork } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { LintRun, Repo } from "@ultracite/backend/database";
import { LintStatusBadge } from "./lint-status-badge";

interface RepoSidebarProps {
  orgSlug: string;
  repos: (Repo & {
    lintRuns: LintRun[];
  })[];
}

export const RepoSidebar = ({ orgSlug, repos }: RepoSidebarProps) => {
  const pathname = usePathname();

  return (
    <Sidebar className="top-(--fd-banner-height) h-[calc(100svh-var(--fd-banner-height))]">
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Repositories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {repos.map((repo) => {
                const latestRun = repo.lintRuns[0];
                const isActive = pathname === `/${orgSlug}/${repo.id}`;

                return (
                  <SidebarMenuItem key={repo.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={`/${orgSlug}/${repo.id}`}>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
