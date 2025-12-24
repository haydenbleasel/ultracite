"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { agents, editors, providers } from "@ultracite/data";
import { IconMenu2 } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/app/(home)/components/logo";
import { Button } from "../ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

const links = [
  {
    href: "/docs",
    label: "Docs",
  },
  {
    href: "/social",
    label: "Social",
  },
];

export const Navbar = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isProviderPage = pathname.startsWith("/providers");
  const isEditorPage = pathname.startsWith("/editors");
  const isAgentPage = pathname.startsWith("/agents");

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between bg-background py-4">
      <div className="flex items-center gap-4">
        <Link className="flex items-center gap-2" href="/">
          <Logo className="size-4" />
          <span className="font-semibold text-lg tracking-tight">
            Ultracite
          </span>
        </Link>
        <NavigationMenu className="hidden md:flex">
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
        <div className="hidden items-center gap-px md:flex">
          {links.map((link) => (
            <Button
              asChild
              key={link.href}
              variant={pathname === link.href ? "secondary" : "ghost"}
            >
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            </Button>
          ))}
        </div>
        <SignedOut>
          <SignInButton>
            <Button asChild className="hidden md:inline-flex">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <Button asChild className="hidden md:inline-flex">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <UserButton />
        </SignedIn>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <IconMenu2 className="size-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      pathname === link.href
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <span className="px-3 text-xs font-semibold uppercase text-muted-foreground">
                  Providers
                </span>
                {providers.map((provider) => (
                  <Link
                    key={provider.id}
                    href={`/providers/${provider.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
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
                <span className="px-3 text-xs font-semibold uppercase text-muted-foreground">
                  Editors
                </span>
                {editors.map((editor) => (
                  <Link
                    key={editor.id}
                    href={`/editors/${editor.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
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
                <span className="px-3 text-xs font-semibold uppercase text-muted-foreground">
                  Agents ({agents.length})
                </span>
                {agents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
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
                <SignedOut>
                  <Button asChild className="w-full">
                    <Link href="/sign-in" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                </SignedOut>
                <SignedIn>
                  <Button asChild className="w-full">
                    <Link href="/dashboard" onClick={() => setOpen(false)}>
                      Dashboard
                    </Link>
                  </Button>
                </SignedIn>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
