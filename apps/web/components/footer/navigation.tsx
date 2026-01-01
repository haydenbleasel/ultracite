import { SiX } from "@icons-pack/react-simple-icons";
import { agents } from "@repo/data/src/agents";
import { docsUrl, statusUrl } from "@repo/data/src/consts";
import { editors } from "@repo/data/src/editors";
import { providers } from "@repo/data/src/providers";
import { Logo } from "@repo/design-system/components/ultracite/logo";
import Link from "next/link";

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
    href: "/cloud",
    label: "Cloud",
  },
  {
    href: docsUrl,
    label: "Docs",
  },
  {
    href: "/social",
    label: "Social",
  },
  {
    href: statusUrl,
    label: "Status",
  },
];

export const Navigation = () => (
  <footer className="grid gap-8 lg:grid-cols-5">
    <div className="flex flex-col gap-4 lg:col-span-2">
      <div className="flex items-center gap-2">
        <Logo className="size-5" />
        <span className="font-semibold text-lg tracking-tight">Ultracite</span>
      </div>
      <p className="max-w-sm text-balance text-muted-foreground text-sm leading-relaxed">
        Made with ❤️ and ☕ by{" "}
        <a
          className="text-primary underline"
          href="https://x.com/haydenbleasel"
          rel="noreferrer"
          target="_blank"
        >
          @haydenbleasel
        </a>
        . Free and{" "}
        <a
          className="text-primary underline"
          href="https://github.com/haydenbleasel/ultracite"
          rel="noreferrer"
          target="_blank"
        >
          open source
        </a>
        , forever.
      </p>
      <p className="text-muted-foreground text-sm">
        <a
          className="inline-flex items-center gap-1 hover:text-primary"
          href="https://x.com/haydenbleasel"
          rel="noreferrer"
          target="_blank"
        >
          Follow me on <SiX className="inline-block size-3" />
        </a>
      </p>
    </div>

    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-sm">General</span>
      {generalLinks.map((link) => (
        <Link
          className="text-sm transition-colors hover:text-primary"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
      <span className="mt-8 font-medium text-muted-foreground text-sm">
        Legal
      </span>
      {legalLinks.map((link) => (
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
      <span className="font-medium text-muted-foreground text-sm">
        Providers
      </span>
      {providers.map((provider) => (
        <Link
          className="text-sm transition-colors hover:text-primary"
          href={`/providers/${provider.id}`}
          key={provider.id}
        >
          {provider.name}
        </Link>
      ))}
      <span className="mt-8 font-medium text-muted-foreground text-sm">
        Editors
      </span>
      {editors.map((editor) => (
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
      <span className="font-medium text-muted-foreground text-sm">Agents</span>
      {agents.map((agent) => (
        <Link
          className="text-sm transition-colors hover:text-primary"
          href={`/agents/${agent.id}`}
          key={agent.id}
        >
          {agent.name}
        </Link>
      ))}
    </div>
  </footer>
);
