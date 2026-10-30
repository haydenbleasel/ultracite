import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  env: core.env,
  extends: [core],
  ignorePatterns: core.ignorePatterns,
});
