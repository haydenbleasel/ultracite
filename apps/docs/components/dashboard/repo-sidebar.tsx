"use client";

import { OrganizationSwitcher } from "@clerk/nextjs";
import { IconGitFork, IconSettings } from "@tabler/icons-react";
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
import type { LintRun, Repo } from "@/lib/database/generated/client";
import { ConnectGitHubButton } from "./connect-github-button";
import { LintStatusBadge } from "./lint-status-badge";

interface RepoSidebarProps {
  repos: (Repo & {
    lintRuns: LintRun[];
  })[];
  hasInstallation: boolean;
}

export const RepoSidebar = ({ repos, hasInstallation }: RepoSidebarProps) => {
  const pathname = usePathname();

  return (
    <Sidebar className="top-(--fd-banner-height)">
      <SidebarHeader>
        <OrganizationSwitcher
          afterSelectOrganizationUrl="/dashboard"
          afterSelectPersonalUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger: "w-full justify-between px-2 py-1.5",
            },
          }}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Repositories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {repos.map((repo) => {
                const latestRun = repo.lintRuns[0];
                const isActive = pathname === `/dashboard/${repo.id}`;

                return (
                  <SidebarMenuItem key={repo.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={`/dashboard/${repo.id}`}>
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
            <ConnectGitHubButton hasInstallation={hasInstallation} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard/settings">
                <IconSettings className="size-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
