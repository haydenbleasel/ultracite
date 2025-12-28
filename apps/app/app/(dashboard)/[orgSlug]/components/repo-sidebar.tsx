import { SiGithub } from "@icons-pack/react-simple-icons";
import { database } from "@repo/backend/database";
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
import { IconBuilding } from "@tabler/icons-react";
import Link from "next/link";
import { getUserOrganizations } from "@/lib/auth";
import { RepoSidebarItem } from "./repo-sidebar-item";

export const RepoSidebar = async () => {
  const userOrgs = await getUserOrganizations();
  const organizations = await database.organization.findMany({
    where: {
      id: { in: userOrgs.map((o) => o.id) },
    },
    include: {
      repos: {
        where: { enabled: true },
        orderBy: { createdAt: "desc" },
        include: {
          lintRuns: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <Sidebar className="top-(--navbar-height) h-[calc(100svh-var(--navbar-height))]">
      <SidebarContent>
        {organizations.map((org) => (
          <SidebarGroup key={org.id}>
            <SidebarGroupLabel className="gap-2">
              <IconBuilding className="size-4" />
              <span className="truncate">{org.slug}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {org.repos.map((repo) => (
                  <RepoSidebarItem
                    key={repo.id}
                    orgSlug={org.slug}
                    repoSlug={repo.name}
                  />
                ))}
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
