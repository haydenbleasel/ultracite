import { defineConfig } from "../../../config/config.mjs";

type PathConfig = {
  extends: string[];
  overrides: { extends: string[]; files: string[] }[];
};

const config = {
  extends: ["ultracite/core"],
  overrides: [
    { extends: ["ultracite/react"], files: ["apps/web/**/*"] },
    { extends: ["ultracite/astro"], files: ["apps/docs/**/*"] },
  ],
} satisfies PathConfig;

export default defineConfig(config);
