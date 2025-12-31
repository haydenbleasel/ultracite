import type { Organization, Repo } from "@repo/backend/database";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@repo/design-system/components/ui/sidebar";
import { CreditCardIcon } from "lucide-react";
import { RepoSidebarItem } from "./repo-sidebar-item";

interface OrganizationSidebarGroupProps {
  organization: Organization & {
    repos: Repo[];
  };
}

export const OrganizationSidebarGroup = ({
  organization,
}: OrganizationSidebarGroupProps) => (
  <SidebarGroup key={organization.id}>
    <SidebarGroupLabel className="gap-2">
      <span className="flex-1 truncate">{organization.slug}</span>
      <a
        href={`/api/stripe/portal?organizationId=${organization.id}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <CreditCardIcon className="size-4" />
      </a>
    </SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {organization.repos.map((repo) => (
          <RepoSidebarItem
            key={repo.id}
            orgSlug={organization.slug}
            repoSlug={repo.name}
          />
        ))}
        {organization.repos.length === 0 && (
          <SidebarMenuItem>
            <span className="px-2 py-1.5 text-muted-foreground text-xs">
              No repositories
            </span>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
);
