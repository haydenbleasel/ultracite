import { access, readFile } from 'node:fs/promises';

export const exists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Parse JSON with comments (JSONC format) by stripping comments before parsing
 */
export const parseJsonc = (content: string): unknown => {
  // Remove single-line comments (// ...)
  const withoutSingleLineComments = content.replace(/\/\/.*$/gm, '');

  // Remove multi-line comments (/* ... */)
  const withoutMultiLineComments = withoutSingleLineComments.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove trailing commas before closing brackets/braces
  const withoutTrailingCommas = withoutMultiLineComments.replace(/,(\s*[}\]])/g, '$1');

  return JSON.parse(withoutTrailingCommas);
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
