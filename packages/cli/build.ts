import { cp, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import pkg from "./package.json" with { type: "json" };

// Match tsup's external-by-default behaviour: leave installed deps to be
// resolved at runtime and bundle only our own source (including src/data).
const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

// bun build does not clean its output directory, so wipe it to avoid
// accumulating stale content-hashed assets between builds.
await rm("dist", { force: true, recursive: true });

// Keep the installable agent skill in the npm package without maintaining a
// second copy of the source document in the repository.
const skillSource = path.join(import.meta.dirname, "../../skills/ultracite");
const skillDestination = path.join(import.meta.dirname, "skills/ultracite");
await rm(skillDestination, { force: true, recursive: true });
await cp(skillSource, skillDestination, { recursive: true });

const result = await Bun.build({
  banner: "#!/usr/bin/env node",
  entrypoints: ["src/index.ts"],
  external,
  format: "esm",
  minify: true,
  outdir: "dist",
  target: "node",
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}
