import type { Provider } from "@ultracite/data/providers";
import { Videos } from "../../components/videos";

interface SectionsProps {
  provider: Provider;
}

const RuleCategories = ({ provider }: SectionsProps) => {
  if (!provider.ruleCategories) {
    return null;
  }

  const hasCounts = provider.ruleCategories.some((c) => c.count !== undefined);

  if (hasCounts) {
    return (
      <section className="grid gap-8">
        <div className="grid gap-4">
          <h2 className="font-semibold text-2xl tracking-tight">
            287 preconfigured rules
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Ultracite enables the strictest rules by default, organized into
            categories that cover every aspect of code quality.
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
    );
  }

  return (
    <section className="grid gap-8">
      <div className="grid gap-4">
        <h2 className="font-semibold text-2xl tracking-tight">
          Category-based rules
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Ultracite enables all rule categories at the error level for maximum
          code quality enforcement.
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
  );
};

const Plugins = ({ provider }: SectionsProps) => {
  if (!provider.plugins) {
    return null;
  }

  return (
    <section className="grid gap-8">
      <div className="grid gap-4">
        <h2 className="font-semibold text-2xl tracking-tight">
          {provider.id === "eslint" ? "Included plugins" : "Built-in plugins"}
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
  );
};

const Languages = ({ provider }: SectionsProps) => {
  if (!provider.languages) {
    return null;
  }

  return (
    <section className="grid gap-8">
      <div className="grid gap-4">
        <h2 className="font-semibold text-2xl tracking-tight">
          Language support
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Biome natively supports formatting and linting for multiple languages
          without additional plugins.
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
  );
};

const Frameworks = ({ provider }: SectionsProps) => (
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
);

const getConfigDescription = (providerId: string): string => {
  if (providerId === "biome") {
    return "Biome handles both formatting and linting with one unified config.";
  }
  if (providerId === "eslint") {
    return "Ultracite handles the complexity of combining multiple tools into a cohesive setup.";
  }
  return "Giving you control over each aspect of linting and formatting.";
};

const getConfigGridClass = (count: number): string => {
  if (count === 1) {
    return "max-w-md";
  }
  if (count === 2) {
    return "sm:grid-cols-2";
  }
  return "sm:grid-cols-3";
};

const Configuration = ({ provider }: SectionsProps) => {
  const fileCountLabel =
    provider.configFiles.length === 1
      ? "A single configuration file is all you need."
      : `${provider.configFiles.length === 2 ? "Two" : "Three"} simple config files are all you need.`;

  return (
    <section className="grid gap-8">
      <div className="grid gap-4">
        <h2 className="font-semibold text-2xl tracking-tight">Configuration</h2>
        <p className="max-w-2xl text-muted-foreground">
          {fileCountLabel} {getConfigDescription(provider.id)}
        </p>
      </div>

      <div
        className={`grid gap-4 ${getConfigGridClass(provider.configFiles.length)}`}
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
  );
};

const SmartFeatures = ({ provider }: SectionsProps) => {
  if (!provider.smartFeatures) {
    return null;
  }

  return (
    <section className="grid gap-8">
      <div className="grid gap-4">
        <h2 className="font-semibold text-2xl tracking-tight">
          Smart features
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Beyond basic linting, Biome includes intelligent code assistance that
          helps you write better code.
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
  );
};

const OxcEcosystem = ({ provider }: SectionsProps) => {
  if (provider.id !== "oxlint") {
    return null;
  }

  return (
    <section className="grid gap-8">
      <div className="grid gap-4">
        <h2 className="font-semibold text-2xl tracking-tight">
          Part of the Oxc ecosystem
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Oxlint is part of the larger Oxc (Oxidation Compiler) project, which
          includes a parser, resolver, transformer, and minifier - all built for
          speed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h3 className="mb-2 font-medium">Oxfmt</h3>
          <p className="text-muted-foreground text-sm">
            The Oxc formatter, designed to be a faster alternative to Prettier
            while maintaining compatibility.
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
  );
};

export const Sections = ({ provider }: SectionsProps) => (
  <div className="grid gap-16">
    <RuleCategories provider={provider} />
    <Plugins provider={provider} />
    <Languages provider={provider} />
    <Frameworks provider={provider} />
    <Configuration provider={provider} />
    {provider.videos && <Videos data={provider.videos} />}
    <SmartFeatures provider={provider} />
    <OxcEcosystem provider={provider} />
  </div>
);
