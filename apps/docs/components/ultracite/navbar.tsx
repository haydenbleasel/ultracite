"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { agents } from "@/app/(home)/agents/data";
import BiomeLogo from "@/app/(home)/components/hero/biome.jpg";
import ESLintLogo from "@/app/(home)/components/hero/eslint.jpg";
import OxlintLogo from "@/app/(home)/components/hero/oxlint.jpg";
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

const providers = [
  {
    href: "/providers/eslint",
    label: "ESLint + Prettier + Stylelint",
    description: "The most mature linting ecosystem",
    logo: ESLintLogo,
  },
  {
    href: "/providers/biome",
    label: "Biome",
    description: "The modern all-in-one toolchain",
    logo: BiomeLogo,
  },
  {
    href: "/providers/oxlint",
    label: "Oxlint + Oxfmt",
    description: "The fastest linter available",
    logo: OxlintLogo,
  },
];

export const Navbar = () => {
  const pathname = usePathname();
  const isProviderPage = pathname.startsWith("/providers");
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
                    <li key={provider.href}>
                      <NavigationMenuLink
                        render={
                          <Link
                            className="flex items-center gap-3"
                            href={provider.href}
                          >
                            <Image
                              alt={provider.label}
                              className="size-8 rounded-full"
                              height={32}
                              src={provider.logo}
                              width={32}
                            />
                            <div className="grid gap-0.5">
                              <span className="font-medium text-sm">
                                {provider.label}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {provider.description}
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
        <Button
          nativeButton={false}
          render={<Link href="/sign-in">Sign in</Link>}
        />
      </div>
    </div>
  );
};
