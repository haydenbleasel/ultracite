import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface Release {
  id: string;
  title: string;
  content: string;
}

const changelogPath = join(
  process.cwd(),
  "..",
  "..",
  "packages",
  "cli",
  "CHANGELOG.md"
);

const toReleaseId = (title: string): string => {
  const firstToken = title.split(/\s+/)[0] ?? title;
  return firstToken.replace(/^v/, "");
};

let cached: Release[] | undefined;

export const getReleases = async (): Promise<Release[]> => {
  if (cached) {
    return cached;
  }

  const raw = await readFile(changelogPath, "utf-8");
  const chunks = raw.split(/^## /m).slice(1);
  const seen = new Set<string>();

  const releases: Release[] = [];
  for (const chunk of chunks) {
    const newlineIndex = chunk.indexOf("\n");
    const title =
      newlineIndex === -1 ? chunk.trim() : chunk.slice(0, newlineIndex).trim();
    const content =
      newlineIndex === -1 ? "" : chunk.slice(newlineIndex + 1).trim();
    const id = toReleaseId(title);

    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    releases.push({ content, id, title });
  }

  cached = releases;
  return releases;
};

export const getReleaseById = async (
  id: string
): Promise<Release | undefined> => {
  const releases = await getReleases();
  return releases.find((release) => release.id === id);
};

export interface ReleaseGroup {
  major: number;
  releases: Release[];
}

const getReleaseMajor = (release: Release): number => {
  const match = release.id.match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
};

export const getReleaseGroups = async (): Promise<ReleaseGroup[]> => {
  const releases = await getReleases();
  const byMajor = new Map<number, Release[]>();

  for (const release of releases) {
    const major = getReleaseMajor(release);
    const existing = byMajor.get(major);
    if (existing) {
      existing.push(release);
    } else {
      byMajor.set(major, [release]);
    }
  }

  return [...byMajor.entries()]
    .toSorted(([a], [b]) => b - a)
    .map(([major, groupReleases]) => ({ major, releases: groupReleases }));
};
