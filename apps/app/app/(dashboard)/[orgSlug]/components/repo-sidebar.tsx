import { SiGithub } from "@icons-pack/react-simple-icons";
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
import { api } from "../../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { OrganizationSidebarGroup } from "./organization-sidebar-group";

interface RepoSidebarProps {
  orgSlug: string;
}

export const RepoSidebar = async ({ orgSlug }: RepoSidebarProps) => {
  const userOrgs = await getUserOrganizations();
  const filteredOrgs = userOrgs.filter(
    (org): org is NonNullable<typeof org> => org !== null
  );
  const organizations = await Promise.all(
    filteredOrgs.map(async (org) => {
      const withRepos = await convexClient.query(
        api.organizations.getWithRepos,
        { orgId: org._id }
      );
      return withRepos;
    })
  );

  const validOrgs = organizations.filter(
    (org): org is NonNullable<typeof org> => org !== null
  );

  return (
    <Sidebar className="sticky top-(--navbar-height) h-[calc(100svh-var(--navbar-height))]">
      <SidebarContent>
        {validOrgs.map((org) => (
          <OrganizationSidebarGroup key={org._id} organization={org} />
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
