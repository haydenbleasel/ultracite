"use client";

import { SiGithub, SiX } from "@icons-pack/react-simple-icons";
import { docsUrl } from "@repo/data/consts";
import { useTheme } from "next-themes";
import Link from "next/link";

import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import { Logo } from "@/components/ultracite/logo";

const legalLinks = [
  {
    href: "/privacy",
    label: "Privacy Policy",
  },
  {
    href: "/terms",
    label: "Terms of Service",
  },
  {
    href: "/acceptable-use",
    label: "Acceptable Use Policy",
  },
];

const generalLinks = [
  {
    href: "/",
    label: "Home",
  },
  {
    href: docsUrl,
    label: "Docs",
  },
];

export const Footer = () => {
  const { theme, setTheme } = useTheme();

  return (
    <footer className="mt-24 mb-12 flex flex-col gap-12">
      <div className="flex flex-col gap-2">
        <p className="font-medium text-muted-foreground text-sm">General</p>
        {generalLinks.map((link) => (
          <Link
            className="text-sm transition-colors hover:text-primary"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-6 border-t pt-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Logo className="size-5" />
            <span className="font-semibold text-lg tracking-tight">
              Ultracite
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              className="text-muted-foreground transition-colors hover:text-primary"
              href="https://x.com/haydenbleasel"
              rel="noreferrer"
              target="_blank"
              aria-label="Follow on X"
            >
              <SiX className="size-4" />
            </a>
            <a
              className="text-muted-foreground transition-colors hover:text-primary"
              href="https://github.com/haydenbleasel/ultracite"
              rel="noreferrer"
              target="_blank"
              aria-label="View on GitHub"
            >
              <SiGithub className="size-4" />
            </a>
            <ThemeSwitcher
              onChange={setTheme}
              value={(theme ?? "system") as "light" | "dark" | "system"}
            />
          </div>
        </div>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-muted-foreground text-sm">
            Free and open source, forever. Made by{" "}
            <a
              className="text-primary underline"
              href="https://x.com/haydenbleasel"
              rel="noreferrer"
              target="_blank"
            >
              @haydenbleasel
            </a>
          </p>
          <nav className="flex flex-wrap gap-4" aria-label="Legal">
            {legalLinks.map((link) => (
              <Link
                className="text-muted-foreground text-sm transition-colors hover:text-primary"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};
