"use client";

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/design-system/components/ui/sidebar";
import { IconGitFork } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface RepoSidebarItemProps {
  orgSlug: string;
  repoSlug: string;
}

export const RepoSidebarItem = ({
  orgSlug,
  repoSlug,
}: RepoSidebarItemProps) => {
  const pathname = usePathname();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === `/${orgSlug}/${repoSlug}`}
      >
        <Link href={`/${orgSlug}/${repoSlug}`}>
          <IconGitFork className="size-4" />
          <span className="flex-1 truncate">{repoSlug}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
