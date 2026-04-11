import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["nextjs"],
  rules: {},
  overrides: [
    {
      files: ["**/next-env.d.ts"],
      rules: {
        "import/no-unassigned-import": "off",
      },
    },
  ],
});
