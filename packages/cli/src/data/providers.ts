export type ProviderId = "eslint" | "biome" | "oxlint";

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
