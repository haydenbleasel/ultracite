"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useSidebar } from "fumadocs-ui/components/sidebar/base";
import { MenuIcon } from "lucide-react";

export const MobileSidebarTrigger = () => {
  const { open, setOpen } = useSidebar();

  return (
    <Button
      className="fixed right-4 bottom-4 size-12 md:hidden"
      onClick={() => setOpen(!open)}
      size="icon-lg"
    >
      <MenuIcon className="size-5" />
      <span className="sr-only">Open menu</span>
    </Button>
  );
};
