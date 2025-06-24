import { access, readFile } from 'node:fs/promises';

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
    const pkgJson = JSON.parse(await readFile('package.json', 'utf-8'));
    return !!pkgJson.workspaces;
  } catch {
    return false;
  }
};
