import { SiJavascript, SiJson } from "@icons-pack/react-simple-icons";
import type { Provider, ProviderId } from "@ultracite/data/providers";
import { CodeBlock } from "@/components/ultracite/code-block/server";

interface ConfigProps {
  provider: Provider;
}

interface ConfigFile {
  path: string;
  content: string;
  lang: "json" | "javascript";
}

const getConfigFiles = (providerId: ProviderId): ConfigFile[] => {
  if (providerId === "biome") {
    return [
      {
        path: "biome.jsonc",
        content: JSON.stringify(
          {
            $schema: "./node_modules/@biomejs/biome/configuration_schema.json",
            extends: ["ultracite/biome/core"],
          },
          null,
          2
        ),
        lang: "json",
      },
    ];
  }

  if (providerId === "eslint") {
    return [
      {
        path: "eslint.config.mjs",
        content: `import ultracite from "ultracite/eslint";

export default [
  ...ultracite.core,
];`,
        lang: "javascript",
      },
      {
        path: "prettier.config.mjs",
        content: `export { default } from "ultracite/prettier";`,
        lang: "javascript",
      },
      {
        path: "stylelint.config.mjs",
        content: `export { default } from "ultracite/stylelint";`,
        lang: "javascript",
      },
    ];
  }

  if (providerId === "oxlint") {
    return [
      {
        path: ".oxlintrc.json",
        content: JSON.stringify(
          {
            $schema: "./node_modules/oxlint/configuration_schema.json",
            extends: ["ultracite/oxlint/core"],
          },
          null,
          2
        ),
        lang: "json",
      },
    ];
  }

  return [];
};

const getConfigDescription = (providerId: ProviderId): string => {
  if (providerId === "biome") {
    return "Biome handles both formatting and linting with one unified config.";
  }
  if (providerId === "eslint") {
    return "Ultracite handles the complexity of combining multiple tools into a cohesive setup.";
  }
  return "Giving you control over each aspect of linting and formatting.";
};

const ConfigIcon = ({ lang }: { lang: "json" | "javascript" }) => {
  if (lang === "json") {
    return <SiJson className="size-4 text-muted-foreground" />;
  }
  return <SiJavascript className="size-4 text-muted-foreground" />;
};

export const Config = ({ provider }: ConfigProps) => {
  const configFiles = getConfigFiles(provider.id);
  const isSingleFile = configFiles.length === 1;

  return (
    <div
      className={`grid items-start gap-8 ${isSingleFile ? "lg:grid-cols-3" : ""}`}
    >
      <div className="grid gap-4">
        <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
          Configuration
        </h2>
        <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
          {configFiles.length === 1
            ? "A single configuration file is all you need."
            : `${configFiles.length === 2 ? "Two" : "Three"} simple config files are all you need.`}{" "}
          {getConfigDescription(provider.id)}
        </p>
      </div>

      <div
        className={`grid gap-4 ${isSingleFile ? "col-span-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}
      >
        {configFiles.map((file) => (
          <div
            className="mx-auto w-full max-w-3xl divide-y overflow-hidden rounded-lg border"
            key={file.path}
          >
            <div className="flex items-center gap-2 bg-secondary p-4">
              <ConfigIcon lang={file.lang} />
              <p className="inline-flex flex-auto grow-0 items-center gap-2 rounded-sm font-mono text-xs">
                {file.path}
              </p>
            </div>
            <div className="mx-auto h-48 w-full max-w-3xl overflow-hidden overflow-y-auto">
              <CodeBlock code={file.content} lang={file.lang} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
