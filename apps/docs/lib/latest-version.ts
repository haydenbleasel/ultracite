import { readFile } from "node:fs/promises";
import path from "node:path";

const packageJsonPath = path.join(
  process.cwd(),
  "..",
  "..",
  "packages",
  "cli",
  "package.json"
);

let cached: string | undefined;

export const getLatestVersion = async (): Promise<string> => {
  if (cached) {
    return cached;
  }

  const raw = await readFile(packageJsonPath, "utf-8");
  // SAFETY: this reads packages/cli/package.json from this workspace, whose
  // string `version` field is maintained by changesets.
  const { version } = JSON.parse(raw) as { version: string };

  cached = version;
  return version;
};
