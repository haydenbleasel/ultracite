"use client";

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/design-system/components/ui/sidebar";
import { GitForkIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface RepoSidebarItemProps {
  repoSlug: string;
}

export const RepoSidebarItem = ({ repoSlug }: RepoSidebarItemProps) => {
  const pathname = usePathname();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname === `/${repoSlug}`}>
        <Link href={`/${repoSlug}`}>
          <GitForkIcon className="size-4" />
          <span className="flex-1 truncate">{repoSlug}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
