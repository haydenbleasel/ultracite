/**
 * Copies the Ultracite agent skill from the repository root into the package
 * so it ships with the npm distribution without maintaining a second copy of
 * the source document. Runs as `prepack`, so every `npm pack` / `npm publish`
 * refreshes the copy regardless of turbo's build cache, and a missing source
 * fails the pack instead of silently shipping without the skill.
 */
import { cp, rm } from "node:fs/promises";
import path from "node:path";

const skillSource = path.join(import.meta.dirname, "../../../skills/ultracite");
const skillDestination = path.join(import.meta.dirname, "../skills/ultracite");

await rm(skillDestination, { force: true, recursive: true });
await cp(skillSource, skillDestination, { recursive: true });

console.log(
  `Copied agent skill to ${path.relative(process.cwd(), skillDestination)}`
);
