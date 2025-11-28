"use client";

import { NavbarSidebarTrigger } from "fumadocs-ui/layouts/notebook-client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/app/[lang]/(home)/components/logo";
import { SearchButton } from "@/components/search";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "./language-selector";
import { Button } from "./ui/button";

const links = [
  { href: "/", label: "Home", exact: true },
  { href: "/introduction", label: "Docs", exact: false },
  { href: "/social", label: "Social", exact: false },
];

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-50 w-full bg-background/90 py-3 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-2" href="/">
            <Logo className="size-4" />
            <p className="font-semibold text-lg tracking-tight">Ultracite</p>
          </Link>
          <div className="hidden items-center gap-4 font-medium text-sm md:flex">
            {links.map((link) => (
              <Link
                className={cn(
                  "text-muted-foreground hover:text-primary",
                  (link.exact
                    ? pathname === link.href
                    : pathname.startsWith(link.href)) && "text-primary"
                )}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-px">
            <LanguageSelector />
            <ThemeToggle />
          </div>
          <SearchButton />
        </div>
        <div className="sm:hidden">
          {pathname === "/" ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/introduction">Docs</Link>
            </Button>
          ) : (
            <NavbarSidebarTrigger />
          )}
        </div>
      </div>
    </div>
  );
};
