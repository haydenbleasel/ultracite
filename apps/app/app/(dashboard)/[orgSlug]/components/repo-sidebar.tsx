import { SiGithub } from "@icons-pack/react-simple-icons";
import { database } from "@repo/backend/database";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/design-system/components/ui/sidebar";
import { GiftIcon, LifeBuoyIcon } from "lucide-react";
import Link from "next/link";
import { getUserOrganizations } from "@/lib/auth";
import { OrganizationSidebarGroup } from "./organization-sidebar-group";

interface RepoSidebarProps {
  orgSlug: string;
}

export const RepoSidebar = async ({ orgSlug }: RepoSidebarProps) => {
  const userOrgs = await getUserOrganizations();
  const organizations = await database.organization.findMany({
    where: {
      id: { in: userOrgs.map((o) => o.id) },
    },
    include: {
      repos: {
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
    <Sidebar className="sticky top-(--navbar-height) h-[calc(100svh-var(--navbar-height))]">
      <SidebarContent>
        {organizations.map((org) => (
          <OrganizationSidebarGroup key={org.id} organization={org} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={`/${orgSlug}/settings/referrals`}>
                <GiftIcon className="size-4" />
                <span>Referrals</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton asChild>
              <Link href={"mailto:hayden@ultracite.ai"}>
                <LifeBuoyIcon className="size-4" />
                <span>Support</span>
              </Link>
            </SidebarMenuButton>
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
