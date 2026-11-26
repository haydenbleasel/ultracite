export type ProviderId = "eslint" | "biome" | "bun" | "oxlint";

export interface Provider {
  id: ProviderId;
  name: string;
  vscodeExtensionId: string;
}

export const providers: Provider[] = [
  {
    id: "biome",
    name: "Biome",
    vscodeExtensionId: "biomejs.biome",
  },
  {
    // Bun's linter and formatter have no language server, so editors run
    // the same Oxlint and Oxfmt configs through the oxc extension.
    id: "bun",
    name: "Bun",
    vscodeExtensionId: "oxc.oxc-vscode",
  },
  {
    id: "eslint",
    name: "ESLint + Prettier + Stylelint",
    vscodeExtensionId: "dbaeumer.vscode-eslint",
  },
  {
    id: "oxlint",
    name: "Oxlint + Oxfmt",
    vscodeExtensionId: "oxc.oxc-vscode",
  },
];
