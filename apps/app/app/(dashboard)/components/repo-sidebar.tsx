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
import { getActiveOrganization } from "@/lib/auth";
import { api } from "../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { OrganizationSidebarGroup } from "./organization-sidebar-group";

export const RepoSidebar = async () => {
  const org = await getActiveOrganization();

  if (!org) {
    return null;
  }

  const organization = await convexClient.query(
    api.organizations.getWithRepos,
    { orgId: org._id }
  );

  if (!organization) {
    return null;
  }

  return (
    <Sidebar className="sticky top-(--navbar-height) h-[calc(100svh-var(--navbar-height))]">
      <SidebarContent>
        <OrganizationSidebarGroup organization={organization} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings/referrals">
                <GiftIcon className="size-4" />
                <span>Referrals</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton asChild>
              <Link href="mailto:hayden@ultracite.ai">
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
