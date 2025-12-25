import {
  type ProviderId,
  getProviderById,
  providerIds,
} from "@ultracite/data/providers";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CallToAction } from "../../components/cta";
import { Footer } from "../../components/footer";
import { Installer } from "../../components/installer";
import { Videos } from "../components/videos";

interface ProviderPageProps {
  params: Promise<{ provider: string }>;
}

export const generateStaticParams = () =>
  providerIds.map((provider) => ({ provider }));

export const generateMetadata = async ({
  params,
}: ProviderPageProps): Promise<Metadata> => {
  const { provider: providerId } = await params;
  const provider = getProviderById(providerId as ProviderId);

  if (!provider) {
    return {};
  }

  return {
    title: provider.title,
    description: provider.description,
  };
};

const ProviderPage = async ({ params }: ProviderPageProps) => {
  const { provider: providerId } = await params;
  const provider = getProviderById(providerId as ProviderId);

  if (!provider) {
    notFound();
  }

  return (
    <>
      <div className="grid gap-8 sm:gap-20">
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <Image
              alt={provider.name}
              className="size-12 rounded-full"
              height={48}
              src={provider.logo}
              width={48}
            />
            {provider.additionalLogos?.map((logo, index) => (
              <Image
                key={index}
                alt=""
                className="-ml-3 size-12 rounded-full ring-2 ring-background"
                height={48}
                src={logo}
                width={48}
              />
            ))}
          </div>
          <h1 className="mb-0 max-w-xl text-balance font-semibold text-3xl leading-none tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
            {provider.subtitle}
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
            {provider.description}
          </p>
          <div className="flex w-full max-w-md flex-col items-center gap-2 sm:flex-row">
            <Installer
              command={`npx ultracite@latest init --linter ${provider.id}`}
            />
            <Button asChild className="px-4" size="lg" variant="link">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-16">
          {/* Why Section */}
          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                Why {provider.name.split(" ")[0]}?
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                {provider.whyContent}
              </p>
            </div>

            <div
              className={`grid gap-4 ${provider.features.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
            >
              {provider.features.map((feature) => (
                <div className="rounded-lg border p-6" key={feature.title}>
                  <h3 className="mb-2 font-medium">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Rule Categories (Biome) */}
          {provider.ruleCategories &&
            provider.ruleCategories.some((c) => c.count !== undefined) && (
              <section className="grid gap-8">
                <div className="grid gap-4">
                  <h2 className="font-semibold text-2xl tracking-tight">
                    287 preconfigured rules
                  </h2>
                  <p className="max-w-2xl text-muted-foreground">
                    Ultracite enables the strictest rules by default, organized
                    into categories that cover every aspect of code quality.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {provider.ruleCategories.map((category) => (
                    <div className="rounded-lg border p-4" key={category.name}>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{category.name}</p>
                        {category.count !== undefined && (
                          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">
                            {category.count}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {category.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Plugins */}
          {provider.plugins && (
            <section className="grid gap-8">
              <div className="grid gap-4">
                <h2 className="font-semibold text-2xl tracking-tight">
                  {provider.id === "eslint"
                    ? "Included plugins"
                    : "Built-in plugins"}
                </h2>
                <p className="max-w-2xl text-muted-foreground">
                  {provider.id === "eslint"
                    ? "Ultracite bundles and preconfigures the most essential ESLint plugins so you don't have to manage them yourself."
                    : "Oxlint includes support for popular ESLint plugins without requiring separate installations."}
                </p>
              </div>

              <div
                className={`grid gap-3 ${provider.id === "eslint" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-3 lg:grid-cols-5"}`}
              >
                {provider.plugins.map((plugin) => (
                  <div
                    className={`rounded-lg border ${provider.id === "eslint" ? "flex items-start gap-3 p-4" : "p-3"}`}
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
          )}

          {/* Category-based rules (Oxlint) */}
          {provider.ruleCategories &&
            !provider.ruleCategories.some((c) => c.count !== undefined) && (
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
                  {provider.ruleCategories.map((category) => (
                    <div className="rounded-lg border p-4" key={category.name}>
                      <p className="font-medium text-sm">{category.name}</p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {category.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Language Support (Biome only) */}
          {provider.languages && (
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
                {provider.languages.map((language) => (
                  <span
                    className="rounded-full border bg-muted/50 px-3 py-1 text-sm"
                    key={language}
                  >
                    {language}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Framework Support */}
          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                Framework support
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                Ultracite provides framework-specific presets that extend the
                core configuration with rules tailored to your stack.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {provider.frameworks.map((framework) => (
                <span
                  className="rounded-full border bg-muted/50 px-3 py-1 text-sm"
                  key={framework}
                >
                  {framework}
                </span>
              ))}
            </div>
          </section>

          {/* Configuration */}
          <section className="grid gap-8">
            <div className="grid gap-4">
              <h2 className="font-semibold text-2xl tracking-tight">
                Configuration
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                {provider.configFiles.length === 1
                  ? "A single configuration file is all you need."
                  : `${provider.configFiles.length === 2 ? "Two" : "Three"} simple config files are all you need.`}{" "}
                {provider.id === "biome"
                  ? "Biome handles both formatting and linting with one unified config."
                  : provider.id === "eslint"
                    ? "Ultracite handles the complexity of combining multiple tools into a cohesive setup."
                    : "Giving you control over each aspect of linting and formatting."}
              </p>
            </div>

            <div
              className={`grid gap-4 ${provider.configFiles.length === 1 ? "max-w-md" : provider.configFiles.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
            >
              {provider.configFiles.map((file) => (
                <div className="rounded-lg border p-4" key={file.name}>
                  <code className="text-sm">{file.name}</code>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {file.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Videos (if available) */}
          {provider.videos && <Videos data={provider.videos} />}

          {/* Smart Features (Biome only) */}
          {provider.smartFeatures && (
            <section className="grid gap-8">
              <div className="grid gap-4">
                <h2 className="font-semibold text-2xl tracking-tight">
                  Smart features
                </h2>
                <p className="max-w-2xl text-muted-foreground">
                  Beyond basic linting, Biome includes intelligent code
                  assistance that helps you write better code.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {provider.smartFeatures.map((feature) => (
                  <div className="rounded-lg border p-4" key={feature.name}>
                    <p className="font-medium text-sm">{feature.name}</p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Oxc Ecosystem (Oxlint only) */}
          {provider.id === "oxlint" && (
            <section className="grid gap-8">
              <div className="grid gap-4">
                <h2 className="font-semibold text-2xl tracking-tight">
                  Part of the Oxc ecosystem
                </h2>
                <p className="max-w-2xl text-muted-foreground">
                  Oxlint is part of the larger Oxc (Oxidation Compiler) project,
                  which includes a parser, resolver, transformer, and minifier -
                  all built for speed.
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
                    The Oxc project is rapidly evolving with new features and
                    rules being added regularly.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <CallToAction />
      <Footer />
    </>
  );
};

export default ProviderPage;
