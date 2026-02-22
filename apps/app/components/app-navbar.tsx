"use client";

import { Logo } from "@repo/design-system/components/ultracite/logo";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export const AppNavbar = () => (
  <header className="sticky top-0 z-50 flex h-(--navbar-height) items-center justify-between border-b bg-background px-4">
    <div className="flex items-center gap-3">
      <Link href="/">
        <Logo className="size-6" />
      </Link>
      <OrganizationSwitcher
        afterSelectOrganizationUrl="/"
        hidePersonal
      />
    </div>
    <UserButton />
  </header>
);
