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

const repoUrl = "https://github.com/haydenbleasel/ultracite";

let cached: string | undefined;

export const getLatestVersion = async (): Promise<string> => {
  if (cached) {
    return cached;
  }

  const raw = await readFile(packageJsonPath, "utf-8");
  const { version } = JSON.parse(raw) as { version: string };

  cached = version;
  return version;
};

export const getReleaseUrl = (version: string): string =>
  `${repoUrl}/releases/tag/ultracite%40${version}`;
