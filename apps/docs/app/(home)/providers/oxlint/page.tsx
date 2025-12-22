import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CallToAction } from "../../components/cta";
import { Footer } from "../../components/footer";
import { Installer } from "../../components/installer";
import OxlintLogo from "../../components/hero/oxlint.jpg";

const title = "Oxlint & Oxfmt | Ultracite";
const description =
  "The fastest linter available. Oxlint is part of the Oxc project, running 50-100x faster than ESLint with a focus on catching bugs and reducing false positives.";

export const metadata: Metadata = {
  title,
  description,
};

const plugins = [
  { name: "ESLint", description: "Core JavaScript rules" },
  { name: "TypeScript", description: "Type-aware rules" },
  { name: "Unicorn", description: "Various best practices" },
  { name: "React", description: "React-specific rules" },
  { name: "React Perf", description: "Performance optimizations" },
  { name: "Next.js", description: "Next.js specific rules" },
  { name: "JSX A11y", description: "Accessibility rules" },
  { name: "Import", description: "Import/export validation" },
  { name: "Node", description: "Node.js rules" },
  { name: "Promise", description: "Promise best practices" },
  { name: "Jest", description: "Jest testing rules" },
  { name: "Vitest", description: "Vitest testing rules" },
  { name: "JSDoc", description: "Documentation rules" },
  { name: "Oxc", description: "Oxc-specific rules" },
  { name: "Vue", description: "Vue.js rules" },
];

const categories = [
  {
    name: "Correctness",
    description: "Rules that prevent bugs and incorrect code",
  },
  {
    name: "Suspicious",
    description: "Rules that detect potentially problematic patterns",
  },
  {
    name: "Pedantic",
    description: "Strict rules for code quality purists",
  },
  {
    name: "Performance",
    description: "Rules that catch performance issues",
  },
  {
    name: "Restriction",
    description: "Rules that restrict certain patterns",
  },
  {
    name: "Style",
    description: "Rules that enforce consistent code style",
  },
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

const OxlintPage = () => (
  <>
    <div className="grid gap-8 sm:gap-20">
      <div className="grid gap-4">
        <Image
          alt="Oxlint"
          className="size-10 rounded-full"
          height={40}
          src={OxlintLogo}
          width={40}
        />
        <h1 className="mb-0 max-w-xl text-balance font-semibold text-3xl leading-none tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
          The fastest linter available
        </h1>
        <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
          {description}
        </p>
        <div className="flex w-full max-w-md flex-col items-center gap-2 sm:flex-row">
          <Installer command="npx ultracite@latest init --linters oxlint" />
          <Button
            className="px-4"
            nativeButton={false}
            render={<Link href="/docs">Read the docs</Link>}
            size="lg"
            variant="link"
          />
        </div>
      </div>

      <div className="grid gap-16">
        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              Why Oxlint?
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Oxlint is built on the Oxc (Oxidation Compiler) project, designed
              from scratch in Rust for maximum performance. It's designed to
              complement or replace ESLint, focusing on speed and catching real
              bugs while minimizing false positives.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-medium">50-100x faster</h3>
              <p className="text-muted-foreground text-sm">
                Lint your entire codebase in milliseconds. No more waiting for
                slow linting processes.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-medium">Bug-focused</h3>
              <p className="text-muted-foreground text-sm">
                Prioritizes catching real bugs over stylistic issues. High
                signal-to-noise ratio.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-medium">Drop-in ready</h3>
              <p className="text-muted-foreground text-sm">
                Works alongside your existing ESLint setup or as a complete
                replacement.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              Built-in plugins
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Oxlint includes support for popular ESLint plugins without
              requiring separate installations.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {plugins.map((plugin) => (
              <div className="rounded-lg border p-3" key={plugin.name}>
                <p className="font-medium text-sm">{plugin.name}</p>
                <p className="text-muted-foreground text-xs">
                  {plugin.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              Category-based rules
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Ultracite enables all rule categories at the error level for
              maximum code quality enforcement.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div className="rounded-lg border p-4" key={category.name}>
                <p className="font-medium text-sm">{category.name}</p>
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
              Framework support
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Ultracite provides framework-specific presets that extend the core
              Oxlint configuration.
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
              Two configuration files handle linting and formatting separately,
              giving you control over each aspect.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <code className="text-sm">.oxlintrc.json</code>
              <p className="mt-1 text-muted-foreground text-xs">
                Linting configuration with Ultracite presets and category-based
                rules
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <code className="text-sm">.oxfmtrc.jsonc</code>
              <p className="mt-1 text-muted-foreground text-xs">
                Formatting configuration powered by Oxfmt for consistent code
                style
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              Part of the Oxc ecosystem
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Oxlint is part of the larger Oxc (Oxidation Compiler) project,
              which includes a parser, resolver, transformer, and minifier - all
              built for speed.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-medium">Oxfmt</h3>
              <p className="text-muted-foreground text-sm">
                The Oxc formatter, designed to be a faster alternative to
                Prettier while maintaining compatibility.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-medium">Active development</h3>
              <p className="text-muted-foreground text-sm">
                The Oxc project is rapidly evolving with new features and rules
                being added regularly.
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

export default OxlintPage;
