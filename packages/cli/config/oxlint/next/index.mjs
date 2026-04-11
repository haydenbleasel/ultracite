import { defineConfig } from "oxlint";

export default defineConfig({
  overrides: [
    {
      files: ["**/next-env.d.ts"],
      rules: {
        "import/no-unassigned-import": "off",
      },
    },
  ],
  plugins: ["nextjs"],
  rules: {},
});
