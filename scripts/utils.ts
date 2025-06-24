import { access, readFile } from 'node:fs/promises';
import { parse } from 'jsonc-parser';

export const exists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

export const isMonorepo = async () => {
  if (await exists('pnpm-workspace.yaml')) {
    return true;
  }

  try {
    const pkgJson = parse(await readFile('package.json', 'utf-8')) as Record<string, unknown> | undefined;

    if (!pkgJson) {
      return false;
    }

    return !!pkgJson.workspaces;
  } catch {
    return false;
  }
};
