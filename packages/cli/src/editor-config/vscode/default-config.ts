type Linter = "biome" | "eslint" | "oxlint";

const baseConfig = {
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "emmet.showExpandedAbbreviation": "never",
};

const biomeConfig = {
  ...baseConfig,
  "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[javascriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[json]": { "editor.defaultFormatter": "biomejs.biome" },
  "[jsonc]": { "editor.defaultFormatter": "biomejs.biome" },
  "[css]": { "editor.defaultFormatter": "biomejs.biome" },
  "[graphql]": { "editor.defaultFormatter": "biomejs.biome" },
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit",
  },
};

const oxlintConfig = {
  ...baseConfig,
  "[javascript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[javascriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[json]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[jsonc]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[css]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[graphql]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "editor.codeActionsOnSave": {
    "source.fixAll.oxc": "explicit",
  },
};

const eslintPrettierConfig = {
  ...baseConfig,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit",
  },
};

export const getDefaultConfig = (linters: Linter[] = ["biome"]) => {
  // Priority: biome > oxlint > eslint (use the first one found)
  if (linters.includes("biome")) {
    return biomeConfig;
  }
  if (linters.includes("oxlint")) {
    return oxlintConfig;
  }
  if (linters.includes("eslint")) {
    return eslintPrettierConfig;
  }
  // Default to biome config
  return biomeConfig;
};

// For backwards compatibility
export const defaultConfig = biomeConfig;
