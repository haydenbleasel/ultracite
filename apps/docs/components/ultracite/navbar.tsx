"use client";

// import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { agents, editors, providers } from "@ultracite/data";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
        <NavigationMenu>
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
                      <NavigationMenuLink
                        render={
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
                        }
                      />
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
                <ul className="grid grid-cols-2 gap-1 p-2">
                  {editors.map((editor) => (
                    <li key={editor.id}>
                      <NavigationMenuLink
                        render={
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
                        }
                      />
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
                <ul className="grid grid-cols-4 gap-1 p-2">
                  {agents.map((agent) => (
                    <li key={agent.id}>
                      <NavigationMenuLink
                        render={
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
                        }
                      />
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-px">
          {links.map((link) => (
            <Button
              key={link.href}
              nativeButton={false}
              render={
                <Link href={link.href} key={link.href}>
                  {link.label}
                </Link>
              }
              variant={pathname === link.href ? "secondary" : "ghost"}
            />
          ))}
        </div>
        {/* <SignedOut>
          <SignInButton>
            <Button
              nativeButton={false}
              render={<Link href="/sign-in">Sign in</Link>}
            />
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <Button
            nativeButton={false}
            render={<Link href="/dashboard">Dashboard</Link>}
          />
          <UserButton />
        </SignedIn> */}
      </div>
    </div>
  );
};
