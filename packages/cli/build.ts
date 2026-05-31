import { rm } from "node:fs/promises";
import process from "node:process";

import pkg from "./package.json" with { type: "json" };

// Match tsup's external-by-default behaviour: leave installed deps to be
// resolved at runtime and bundle only the private @repo/data workspace
// package. This works because @repo/data's sole runtime dependency
// (deepmerge) is also a CLI dependency and its next/image import is
// type-only; if @repo/data ever gains a runtime dep that isn't listed here,
// the externalized bundle would fail at runtime.
const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

// bun build does not clean its output directory, so wipe it to avoid
// accumulating stale content-hashed assets between builds.
await rm("dist", { force: true, recursive: true });

const result = await Bun.build({
  banner: "#!/usr/bin/env node",
  entrypoints: ["src/index.ts"],
  external,
  format: "esm",
  minify: true,
  outdir: "dist",
  // @repo/data's agent/provider logos are colocated with the data so the
  // website can build from a single source of truth, but the CLI never reads
  // them. Stub the .svg imports to an empty module so they aren't emitted as
  // assets into the published package.
  plugins: [
    {
      name: "stub-svg",
      setup(build) {
        build.onLoad({ filter: /\.svg$/u }, () => ({
          contents: "export default ''",
          loader: "js",
        }));
      },
    },
  ],
  target: "node",
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}
