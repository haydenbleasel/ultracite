"use client";

import { agents } from "@repo/data/agents";
import { appUrl, docsUrl } from "@repo/data/consts";
import { editors } from "@repo/data/editors";
import { providers } from "@repo/data/providers";
import { Button } from "@repo/design-system/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@repo/design-system/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/design-system/components/ui/sheet";
import { cn } from "@repo/design-system/lib/utils";
import { MenuIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";

const links = [
  {
    href: "/cloud",
    label: "Cloud",
    className: "text-primary",
    isActive: (path: string) => path.startsWith("/cloud"),
  },
  {
    href: docsUrl,
    label: "Docs",
    isActive: () => {
      if (typeof window === "undefined") {
        return false;
      }

      return window.location.origin.startsWith(docsUrl);
    },
  },
  {
    href: "/social",
    label: "Social",
    isActive: (path: string) => path.startsWith("/social"),
  },
];

export const Navbar = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isProviderPage = pathname.startsWith("/providers");
  const isEditorPage = pathname.startsWith("/editors");
  const isAgentPage = pathname.startsWith("/agents");

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-background px-4 py-3">
      <div className="flex items-center gap-4">
        <Link className="flex items-center gap-2" href="/">
          <Logo className="size-5" />
          <span className="font-semibold text-lg tracking-tight">
            Ultracite
          </span>
        </Link>
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={isProviderPage ? "bg-muted/50" : ""}
              >
                Providers
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-72 gap-1">
                  {providers.map((provider) => (
                    <li key={provider.id}>
                      <NavigationMenuLink asChild>
                        <Link
                          className="flex items-center gap-3"
                          href={`/providers/${provider.id}`}
                        >
                          <Image
                            alt={provider.name}
                            className="size-8 rounded-full"
                            height={32}
                            src={provider.logo}
                            width={32}
                          />
                          <div className="grid gap-0.5">
                            <span className="font-medium text-sm">
                              {provider.name}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {provider.subtitle}
                            </span>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={isEditorPage ? "bg-muted/50" : ""}
              >
                Editors
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-lg grid-cols-2 gap-1 p-2">
                  {editors.map((editor) => (
                    <li key={editor.id}>
                      <NavigationMenuLink asChild>
                        <Link
                          className="flex items-center gap-3"
                          href={`/editors/${editor.id}`}
                        >
                          <Image
                            alt={editor.name}
                            className="size-8 rounded-full"
                            height={32}
                            src={editor.logo}
                            width={32}
                          />
                          <div className="grid gap-0.5">
                            <span className="font-medium text-sm">
                              {editor.name}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {editor.subtitle}
                            </span>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={isAgentPage ? "bg-muted/50" : ""}
              >
                Agents
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  {agents.length}
                </span>
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-2xl grid-cols-4 gap-1 p-2">
                  {agents.map((agent) => (
                    <li key={agent.id}>
                      <NavigationMenuLink asChild>
                        <Link
                          className="flex items-center gap-3"
                          href={`/agents/${agent.id}`}
                        >
                          <Image
                            alt={agent.name}
                            className="size-5 rounded-full"
                            height={20}
                            src={agent.logo}
                            width={20}
                          />
                          {agent.name}
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-px lg:flex">
          {links.map((link) => (
            <Button
              asChild
              className={link.className}
              key={link.href}
              variant={link.isActive(pathname) ? "secondary" : "ghost"}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>
        <Button asChild>
          <Link href={appUrl}>Dashboard</Link>
        </Button>

        <Sheet onOpenChange={setOpen} open={open}>
          <SheetTrigger asChild className="lg:hidden">
            <Button size="icon" variant="ghost">
              <MenuIcon className="size-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            className="w-full overflow-y-auto sm:max-w-md"
            side="right"
          >
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-2">
                {links.map((link) => (
                  <Link
                    className={cn(
                      "rounded-md px-3 py-2 font-medium text-sm",
                      link.className,
                      pathname === link.href ? "bg-muted" : "hover:bg-muted/50"
                    )}
                    href={link.href}
                    key={link.href}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <span className="px-3 font-semibold text-muted-foreground text-xs uppercase">
                  Providers
                </span>
                {providers.map((provider) => (
                  <Link
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
                    href={`/providers/${provider.id}`}
                    key={provider.id}
                    onClick={() => setOpen(false)}
                  >
                    <Image
                      alt={provider.name}
                      className="size-6 rounded-full"
                      height={24}
                      src={provider.logo}
                      width={24}
                    />
                    <span className="text-sm">{provider.name}</span>
                  </Link>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <span className="px-3 font-semibold text-muted-foreground text-xs uppercase">
                  Editors
                </span>
                {editors.map((editor) => (
                  <Link
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
                    href={`/editors/${editor.id}`}
                    key={editor.id}
                    onClick={() => setOpen(false)}
                  >
                    <Image
                      alt={editor.name}
                      className="size-6 rounded-full"
                      height={24}
                      src={editor.logo}
                      width={24}
                    />
                    <span className="text-sm">{editor.name}</span>
                  </Link>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <span className="px-3 font-semibold text-muted-foreground text-xs uppercase">
                  Agents ({agents.length})
                </span>
                {agents.map((agent) => (
                  <Link
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
                    href={`/agents/${agent.id}`}
                    key={agent.id}
                    onClick={() => setOpen(false)}
                  >
                    <Image
                      alt={agent.name}
                      className="size-5 rounded-full"
                      height={20}
                      src={agent.logo}
                      width={20}
                    />
                    <span className="text-sm">{agent.name}</span>
                  </Link>
                ))}
              </div>

              <div className="mt-auto flex flex-col gap-2 border-t pt-4">
                <Button asChild className="w-full">
                  <Link href={appUrl} onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                </Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
