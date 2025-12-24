import { getProviderById } from "@ultracite/data";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CallToAction } from "../../components/cta";
import { Footer } from "../../components/footer";
import { Installer } from "../../components/installer";

const provider = getProviderById("biome");

const title = "Biome | Ultracite";
const description =
  "The modern, all-in-one toolchain. Biome is a fast formatter and linter written in Rust that handles JavaScript, TypeScript, JSON, CSS, and more with a single tool.";

export const metadata: Metadata = {
  title,
  description,
};

const ruleCategories = [
  { name: "Accessibility", count: 35, description: "WCAG and ARIA compliance" },
  { name: "Complexity", count: 41, description: "Code complexity management" },
  { name: "Correctness", count: 45, description: "Bug prevention and safety" },
  { name: "Performance", count: 10, description: "Runtime optimizations" },
  { name: "Security", count: 5, description: "Security best practices" },
  { name: "Style", count: 70, description: "Code style consistency" },
  { name: "Suspicious", count: 80, description: "Potentially buggy patterns" },
];

const features = [
  {
    title: "Lightning fast",
    description:
      "Written in Rust, Biome is 25x faster than Prettier and can format a large codebase in milliseconds.",
  },
  {
    title: "All-in-one",
    description:
      "No more juggling ESLint, Prettier, and other tools. Biome handles formatting and linting in a single pass.",
  },
  {
    title: "Zero dependencies",
    description:
      "Biome has no JavaScript dependencies. One binary does everything with consistent behavior.",
  },
  {
    title: "Editor integration",
    description:
      "First-class VS Code extension with real-time diagnostics and code actions.",
  },
];

const languages = [
  "JavaScript",
  "TypeScript",
  "JSX",
  "TSX",
  "JSON",
  "JSONC",
  "CSS",
  "GraphQL",
  "HTML",
];

const frameworks = [
  "Next.js",
  "React",
  "Vue",
  "Svelte",
  "Solid",
  "Qwik",
  "Angular",
  "Remix",
  "Astro",
];

const BiomePage = () => (
  <>
    <div className="grid gap-8 sm:gap-20">
      <div className="grid gap-4">
        {provider && (
          <Image
            alt={provider.name}
            className="size-10 rounded-full"
            height={40}
            src={provider.logo}
            width={40}
          />
        )}
        <h1 className="mb-0 max-w-xl text-balance font-semibold text-3xl leading-none tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
          The modern all-in-one toolchain
        </h1>
        <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
          {description}
        </p>
        <div className="flex w-full max-w-md flex-col items-center gap-2 sm:flex-row">
          <Installer command="npx ultracite@latest init --linters biome" />
          <Button
            className="px-4"
            asChild
            size="lg"
            variant="link"
          >
            <Link href="/docs">Read the docs</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-16">
        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              Why Biome?
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Biome is the successor to Rome, built from the ground up in Rust
              for maximum performance. It provides formatting and linting with
              near-instant feedback, making it ideal for large codebases.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div className="rounded-lg border p-6" key={feature.title}>
                <h3 className="mb-2 font-medium">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              287 preconfigured rules
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Ultracite enables the strictest Biome rules by default, organized
              into categories that cover every aspect of code quality.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ruleCategories.map((category) => (
              <div className="rounded-lg border p-4" key={category.name}>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{category.name}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">
                    {category.count}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  {category.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              Language support
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Biome natively supports formatting and linting for multiple
              languages without additional plugins.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {languages.map((language) => (
              <span
                className="rounded-full border bg-muted/50 px-3 py-1 text-sm"
                key={language}
              >
                {language}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              Framework support
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Ultracite provides framework-specific presets that extend the core
              Biome configuration with rules tailored to your stack.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {frameworks.map((framework) => (
              <span
                className="rounded-full border bg-muted/50 px-3 py-1 text-sm"
                key={framework}
              >
                {framework}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              Configuration
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              A single configuration file is all you need. Biome handles both
              formatting and linting with one unified config.
            </p>
          </div>

          <div className="max-w-md rounded-lg border p-4">
            <code className="text-sm">biome.jsonc</code>
            <p className="mt-1 text-muted-foreground text-xs">
              Extends Ultracite presets with support for framework-specific
              rules
            </p>
          </div>
        </section>

        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              Smart features
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Beyond basic linting, Biome includes intelligent code assistance
              that helps you write better code.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="font-medium text-sm">Import sorting</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Automatically organizes imports by type and alphabetically
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium text-sm">Attribute sorting</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Sorts JSX attributes for consistent component props
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium text-sm">Tailwind CSS</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Sorts Tailwind classes automatically with useSortedClasses
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <CallToAction />
    <Footer />
  </>
);

export default BiomePage;
