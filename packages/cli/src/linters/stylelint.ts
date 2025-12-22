import { writeFile } from "node:fs/promises";
import { exists } from "../utils";

const configPath = "./stylelint.config.mjs";

const generateStylelintConfig = (): string => {
  return `export { default } from "ultracite/stylelint";
`;
};

export const stylelint = {
  exists: () => exists(configPath),
  create: async () => {
    const config = generateStylelintConfig();
    return writeFile(configPath, config);
  },
  update: async () => {
    const config = generateStylelintConfig();
    return writeFile(configPath, config);
  },
};
