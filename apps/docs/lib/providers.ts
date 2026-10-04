// Example config files for the homepage, written to match byte for byte what
// `ultracite init` generates today (packages/cli/src/linters/*.ts). Keep them
// in step when a generator's output changes.

export type ProviderId = "eslint" | "biome" | "oxlint";

export interface ConfigFile {
  code: (presets: string[]) => string;
  lang: "json" | "javascript" | "typescript";
  name: string;
}

export interface Provider {
  configFiles: ConfigFile[];
  id: ProviderId;
  name: string;
}

// linters/oxlint.ts puts the extends array on one line while it fits oxfmt's
// 80-column print width, and one entry per line beyond that.
const OXLINT_LINE_WIDTH = 80;

const oxlintExtends = (presets: string[]): string => {
  const singleLine = `  extends: [${presets.join(", ")}],`;
  if (singleLine.length <= OXLINT_LINE_WIDTH) {
    return singleLine;
  }
  return `  extends: [\n${presets.map((preset) => `    ${preset},`).join("\n")}\n  ],`;
};

export const providers: Provider[] = [
  {
    configFiles: [
      {
        code: (presets: string[]) =>
          JSON.stringify(
            {
              $schema:
                "./node_modules/@biomejs/biome/configuration_schema.json",
              extends: presets.map((preset) => `ultracite/biome/${preset}`),
            },
            null,
            2
          ),
        lang: "json",
        name: "biome.jsonc",
      },
    ],
    id: "biome",
    name: "Biome",
  },
  {
    configFiles: [
      {
        code: (presets: string[]) => `${presets
          .map(
            (preset) => `import ${preset} from "ultracite/eslint/${preset}";`
          )
          .join("\n")}

export default [
  ${presets.map((preset) => `...${preset}`).join(",\n  ")},
];`,
        lang: "javascript",
        name: "eslint.config.mjs",
      },
      {
        code: () => `import config from "ultracite/prettier";

export default {
  ...config,
  plugins: ["prettier-plugin-tailwindcss"],
};`,
        lang: "javascript",
        name: "prettier.config.mjs",
      },
      {
        code: () => `export { default } from "ultracite/stylelint";`,
        lang: "javascript",
        name: "stylelint.config.mjs",
      },
    ],
    id: "eslint",
    name: "ESLint + Prettier + Stylelint",
  },
  {
    configFiles: [
      {
        code: (presets: string[]) => `import { defineConfig } from "oxlint";
${presets.map((preset) => `import ${preset} from "ultracite/oxlint/${preset}";`).join("\n")}

export default defineConfig({
${oxlintExtends(presets)}
  ignorePatterns: core.ignorePatterns,
});`,
        lang: "typescript",
        name: "oxlint.config.ts",
      },
      {
        code: () => `import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
});`,
        lang: "typescript",
        name: "oxfmt.config.ts",
      },
    ],
    id: "oxlint",
    name: "Oxlint + Oxfmt",
  },
];
