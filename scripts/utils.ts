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
    const pkgJson = parse(await readFile('package.json', 'utf-8')) as
      | Record<string, unknown>
      | undefined;

    if (!pkgJson) {
      return false;
    }

    return !!pkgJson.workspaces;
  } catch {
    return false;
  }
};

export const title = `
888     888 888    88888888888 8888888b.         d8888  .d8888b. 8888888 88888888888 8888888888 
888     888 888        888     888   Y88b       d88888 d88P  Y88b  888       888     888        
888     888 888        888     888    888      d88P888 888    888  888       888     888        
888     888 888        888     888   d88P     d88P 888 888         888       888     8888888    
888     888 888        888     8888888P"     d88P  888 888         888       888     888        
888     888 888        888     888 T88b     d88P   888 888    888  888       888     888        
Y88b. .d88P 888        888     888  T88b   d8888888888 Y88b  d88P  888       888     888        
 "Y88888P"  88888888   888     888   T88b d88P     888  "Y8888P" 8888888     888     8888888888
`;
