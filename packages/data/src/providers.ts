/* biome-ignore-all lint/style/useNamingConvention: "Provider configs use various naming conventions" */

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
  vscodeExtensionId: string;
}

export const providers: Provider[] = [
  {
    configFiles: [
      {
        code: (presets: string[]) => `{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": [
    ${presets.map((p) => `"ultracite/biome/${p}"`).join(",\n    ")}
  ]
}`,
        lang: "json",
        name: "biome.jsonc",
      },
    ],
    id: "biome",
    name: "Biome",
    vscodeExtensionId: "biomejs.biome",
  },
  {
    configFiles: [
      {
        code: (
          presets: string[]
        ) => `import { defineConfig } from "eslint/config";
${presets.map((p) => `import ${p} from "ultracite/eslint/${p}";`).join("\n")}

export default defineConfig([
  {
    extends: [
      ${presets.join(",\n      ")}
    ],
  },
]);`,
        lang: "javascript",
        name: "eslint.config.mjs",
      },
      {
        code: () => `export { default } from "ultracite/prettier";`,
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
    vscodeExtensionId: "dbaeumer.vscode-eslint",
  },
  {
    configFiles: [
      {
        code: (presets: string[]) => `import { defineConfig } from "oxlint";

${presets.map((p) => `import ${p} from "ultracite/oxlint/${p}";`).join("\n")}

export default defineConfig({
  extends: [
    ${presets.join(",\n    ")}
  ],
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
    vscodeExtensionId: "oxc.oxc-vscode",
  },
];
