import { writeFile } from "node:fs/promises";

import { exists } from "../utils";

const oxfmtConfigPath = "./oxfmt.config.ts";

const configContent = `import config from "ultracite/oxfmt";

export default config;
`;

export const oxfmt = {
  create: async () => await writeFile(oxfmtConfigPath, configContent),
  exists: async () => await exists(oxfmtConfigPath),
  update: async () => await writeFile(oxfmtConfigPath, configContent),
};
