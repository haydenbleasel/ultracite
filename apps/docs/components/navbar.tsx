"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/app/[lang]/(home)/components/logo";
import { SearchButton } from "@/components/search";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "./language-selector";

const links = [
  { href: "/", label: "Home", exact: true },
  { href: "/introduction", label: "Docs", exact: false },
  { href: "/social", label: "Social", exact: false },
];

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-50 w-full bg-background/90 py-3 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-2" href="/">
            <Logo className="size-4" />
            <p className="font-semibold text-lg tracking-tight">Ultracite</p>
          </Link>
          <div className="flex items-center gap-4 font-medium text-sm">
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

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-px">
            <LanguageSelector />
            <ThemeToggle />
          </div>
          <SearchButton />
        </div>
      </div>
    </div>
  );
};
