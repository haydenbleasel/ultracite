import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CallToAction } from "../../components/cta";
import { Footer } from "../../components/footer";
import ESLintLogo from "../../components/hero/eslint.jpg";
import PrettierLogo from "../../components/hero/prettier.jpg";
import StylelintLogo from "../../components/hero/stylelint.jpg";
import { Installer } from "../../components/installer";

const title = "ESLint, Prettier & Stylelint | Ultracite";
const description =
  "The most mature and comprehensive linting solution. Combines ESLint for JavaScript/TypeScript, Prettier for formatting, and Stylelint for CSS with 20+ plugins and hundreds of preconfigured rules.";

export const metadata: Metadata = {
  title,
  description,
};

const plugins = [
  { name: "React", description: "React-specific linting rules" },
  { name: "React Hooks", description: "Rules of Hooks enforcement" },
  { name: "TypeScript", description: "Type-aware linting rules" },
  { name: "JSX A11y", description: "Accessibility linting for JSX" },
  { name: "Import", description: "Import/export syntax validation" },
  { name: "Promise", description: "Promise best practices" },
  { name: "Node", description: "Node.js specific rules" },
  { name: "Next.js", description: "Next.js specific rules" },
  { name: "Unicorn", description: "Various awesome ESLint rules" },
  { name: "SonarJS", description: "Code quality and security" },
  { name: "Compat", description: "Browser compatibility checking" },
  { name: "TanStack Query", description: "React Query best practices" },
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

const ESLintPage = () => (
  <>
    <div className="grid gap-8 sm:gap-20">
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <Image
            alt="ESLint"
            className="size-10 rounded-full"
            height={40}
            src={ESLintLogo}
            width={40}
          />
          <Image
            alt="Prettier"
            className="-ml-3 size-10 rounded-full ring-2 ring-background"
            height={40}
            src={PrettierLogo}
            width={40}
          />
          <Image
            alt="Stylelint"
            className="-ml-3 size-10 rounded-full ring-2 ring-background"
            height={40}
            src={StylelintLogo}
            width={40}
          />
        </div>
        <h1 className="mb-0 max-w-xl text-balance font-semibold text-3xl leading-none tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
          The most mature linting ecosystem
        </h1>
        <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
          {description}
        </p>
        <div className="flex w-full max-w-md flex-col items-center gap-2 sm:flex-row">
          <Installer command="npx ultracite@latest init --linters eslint" />
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
              Why ESLint + Prettier + Stylelint?
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              This combination is the industry standard for
              JavaScript/TypeScript projects. ESLint handles code quality and
              potential bugs, Prettier ensures consistent formatting, and
              Stylelint keeps your CSS clean. Together, they provide the most
              comprehensive coverage available.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-medium">Battle-tested</h3>
              <p className="text-muted-foreground text-sm">
                Used by millions of developers worldwide. The largest ecosystem
                of plugins and configurations available.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-medium">Maximum coverage</h3>
              <p className="text-muted-foreground text-sm">
                20+ plugins preconfigured with hundreds of rules covering
                accessibility, security, performance, and best practices.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-medium">Framework-aware</h3>
              <p className="text-muted-foreground text-sm">
                First-class support for React, Next.js, Vue, Svelte, and more
                with framework-specific rules and optimizations.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-8">
          <div className="grid gap-4">
            <h2 className="font-semibold text-2xl tracking-tight">
              Included plugins
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Ultracite bundles and preconfigures the most essential ESLint
              plugins so you don't have to manage them yourself.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plugins.map((plugin) => (
              <div
                className="flex items-start gap-3 rounded-lg border p-4"
                key={plugin.name}
              >
                <div>
                  <p className="font-medium text-sm">{plugin.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {plugin.description}
                  </p>
                </div>
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
              configuration with rules tailored to your stack.
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
              Three simple config files are all you need. Ultracite handles the
              complexity of combining multiple tools into a cohesive setup.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <code className="text-sm">eslint.config.mjs</code>
              <p className="mt-1 text-muted-foreground text-xs">
                ESLint flat config format with Ultracite presets
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <code className="text-sm">prettier.config.mjs</code>
              <p className="mt-1 text-muted-foreground text-xs">
                Consistent formatting with sensible defaults
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <code className="text-sm">stylelint.config.mjs</code>
              <p className="mt-1 text-muted-foreground text-xs">
                CSS linting with modern best practices
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

export default ESLintPage;
