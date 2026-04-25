"use client";

import { SiGithub, SiX } from "@icons-pack/react-simple-icons";
import type { Agent } from "@repo/data/agents";
import { docsUrl } from "@repo/data/consts";
import type { Editor } from "@repo/data/editors";
import type { Provider } from "@repo/data/providers";
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
  {
    href: "/updates",
    label: "Updates",
  },
];

interface FooterProps {
  agents: Pick<Agent, "id" | "name">[];
  editors: Pick<Editor, "id" | "name">[];
  providers: Pick<Provider, "id" | "name">[];
}

export const Footer = ({ agents, editors, providers }: FooterProps) => {
  const { theme, setTheme } = useTheme();
  const sortedAgents = [...agents].toSorted((a, b) =>
    a.name.localeCompare(b.name)
  );
  const sortedEditors = [...editors].toSorted((a, b) =>
    a.name.localeCompare(b.name)
  );
  const sortedProviders = [...providers].toSorted((a, b) =>
    a.name.localeCompare(b.name)
  );
  const agentsThird = Math.ceil(sortedAgents.length / 3);
  const agentsCol1 = sortedAgents.slice(0, agentsThird);
  const agentsCol2 = sortedAgents.slice(agentsThird, agentsThird * 2);
  const agentsCol3 = sortedAgents.slice(agentsThird * 2);

  return (
    <footer className="mt-24 mb-12 flex flex-col gap-12">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
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

        <div className="flex flex-col gap-2">
          <p className="font-medium text-muted-foreground text-sm">Providers</p>
          {sortedProviders.map((provider) => (
            <Link
              className="text-sm transition-colors hover:text-primary"
              href={`/providers/${provider.id}`}
              key={provider.id}
            >
              {provider.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-medium text-muted-foreground text-sm">Editors</p>
          {sortedEditors.map((editor) => (
            <Link
              className="text-sm transition-colors hover:text-primary"
              href={`/editors/${editor.id}`}
              key={editor.id}
            >
              {editor.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-medium text-muted-foreground text-sm">Agents</p>
          {agentsCol1.map((agent) => (
            <Link
              className="text-sm transition-colors hover:text-primary"
              href={`/agents/${agent.id}`}
              key={agent.id}
            >
              {agent.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-medium text-muted-foreground text-sm max-sm:hidden">
            &nbsp;
          </p>
          {agentsCol2.map((agent) => (
            <Link
              className="text-sm transition-colors hover:text-primary"
              href={`/agents/${agent.id}`}
              key={agent.id}
            >
              {agent.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-medium text-muted-foreground text-sm max-sm:hidden">
            &nbsp;
          </p>
          {agentsCol3.map((agent) => (
            <Link
              className="text-sm transition-colors hover:text-primary"
              href={`/agents/${agent.id}`}
              key={agent.id}
            >
              {agent.name}
            </Link>
          ))}
        </div>
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
