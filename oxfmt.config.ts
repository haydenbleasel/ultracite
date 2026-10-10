import { defineConfig } from "oxfmt";

import base from "./packages/cli/config/oxfmt/index.mjs";

export default defineConfig({
  ...base,
  ignorePatterns: [
    "packages/design-system/components/ui",
    "packages/design-system/components/kibo-ui",
    "packages/design-system/lib/utils.ts",
    "packages/design-system/hooks/use-mobile.ts",
    "packages/cli/config/biome",
    "benchmark/fixtures",
    "benchmark/.work",
    "**/CHANGELOG.md",
    "packages/video/src/components",
    "packages/video/src/lib/utils.ts",
    "packages/video/src/lib/remocn-ui",
    "packages/video/.agents/skills",
    // Generated bundle of the vendored anti-slop oxlint plugin — see
    // packages/cli/scripts/vendor-anti-slop.ts.
    "packages/cli/config/oxlint/anti-slop/plugin.mjs",
    // Blog research artifacts that must stay as written (see
    // research/README.md): third-party code copied with its license,
    // fixtures and agent output whose hashes and line numbers are recorded,
    // generated results, and the gitignored clones and mirrors.
    "research/corpus/examples",
    "research/corpus/calibration",
    "research/corpus/results",
    "research/corpus/repos",
    "research/corpus/biome-input",
    "research/corpus/out",
    "research/agent-experiment/subjects",
    "research/agent-experiment/harness-tests",
    "research/agent-experiment/results",
    "research/agent-experiment/biome-config",
    "research/agent-experiment/biome-input",
  ],
});
