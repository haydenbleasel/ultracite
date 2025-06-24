import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import deepmerge from 'deepmerge';
import { parse } from 'jsonc-parser';
import { exists } from './utils';

const lintStagedConfig = {
  '*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}': ['npx ultracite format'],
};

// Check for existing configuration files in order of preference
const configFiles = [
  './package.json',
  './.lintstagedrc.json',
  './.lintstagedrc.js',
  './.lintstagedrc.cjs',
  './.lintstagedrc.mjs',
  './lint-staged.config.js',
  './lint-staged.config.cjs',
  './lint-staged.config.mjs',
  './.lintstagedrc.yaml',
  './.lintstagedrc.yml',
  './.lintstagedrc',
];

// Helper function to process YAML lines
const processYamlLine = (
  line: string,
  result: Record<string, unknown>,
  currentKey: string | null,
  currentArray: string[]
): { newCurrentKey: string | null; newCurrentArray: string[] } => {
  const trimmed = line.trim();

  if (trimmed.includes(':') && !trimmed.startsWith('-')) {
    // Save previous array if exists
    if (currentKey && currentArray.length > 0) {
      result[currentKey] = currentArray;
    }

    const [key, ...valueParts] = trimmed.split(':');
    const value = valueParts.join(':').trim();
    const newCurrentKey = key.trim().replace(/['"]/g, '');

    if (value && value !== '') {
      if (value.startsWith('[') && value.endsWith(']')) {
        // Handle inline arrays
        result[newCurrentKey] = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim().replace(/['"]/g, ''));
      } else {
        result[newCurrentKey] = value.replace(/['"]/g, '');
      }
      return { newCurrentKey: null, newCurrentArray: [] };
    }
    return { newCurrentKey, newCurrentArray: [] };
  }

  if (trimmed.startsWith('-') && currentKey) {
    const newCurrentArray = [
      ...currentArray,
      trimmed.slice(1).trim().replace(/['"]/g, ''),
    ];
    return { newCurrentKey: currentKey, newCurrentArray };
  }

  return { newCurrentKey: currentKey, newCurrentArray: currentArray };
};

// Simple YAML parser for basic objects (limited but functional)
const parseSimpleYaml = (content: string): Record<string, unknown> => {
  const lines = content
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#'));
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  for (const line of lines) {
    const processed = processYamlLine(line, result, currentKey, currentArray);
    currentKey = processed.newCurrentKey;
    currentArray = processed.newCurrentArray;
  }

  // Save final array if exists
  if (currentKey && currentArray.length > 0) {
    result[currentKey] = currentArray;
  }

  return result;
};

// Convert object to simple YAML format
const stringifySimpleYaml = (obj: Record<string, unknown>): string => {
  let yaml = '';
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      yaml += `${key}:\n`;
      for (const item of value) {
        yaml += `  - '${item}'\n`;
      }
    } else {
      yaml += `${key}: '${value}'\n`;
    }
  }
  return yaml;
};

// Check if project uses ESM
const isProjectESM = async (): Promise<boolean> => {
  try {
    const packageJson = parse(await readFile('./package.json', 'utf-8'));
    return packageJson.type === 'module';
  } catch {
    return false;
  }
};

// Update package.json lint-staged config
const updatePackageJson = async (): Promise<void> => {
  const packageJson = parse(await readFile('./package.json', 'utf-8'));

  if (packageJson['lint-staged']) {
    packageJson['lint-staged'] = deepmerge(
      packageJson['lint-staged'],
      lintStagedConfig
    );
  } else {
    packageJson['lint-staged'] = lintStagedConfig;
  }

  await writeFile('./package.json', JSON.stringify(packageJson, null, 2));
};

// Update JSON config files
const updateJsonConfig = async (filename: string): Promise<void> => {
  const content = await readFile(filename, 'utf-8');
  const existingConfig = parse(content);
  const mergedConfig = deepmerge(existingConfig, lintStagedConfig);
  await writeFile(filename, JSON.stringify(mergedConfig, null, 2));
};

// Update YAML config files
const updateYamlConfig = async (filename: string): Promise<void> => {
  const content = await readFile(filename, 'utf-8');
  const existingConfig = parseSimpleYaml(content);
  const mergedConfig = deepmerge(existingConfig, lintStagedConfig);
  await writeFile(filename, stringifySimpleYaml(mergedConfig));
};

// Update ESM config files
const updateEsmConfig = async (filename: string): Promise<void> => {
  const fileUrl = pathToFileURL(filename).href;
  const module = await import(fileUrl);
  const existingConfig = module.default || {};
  const mergedConfig = deepmerge(existingConfig, lintStagedConfig);

  const esmContent = `export default ${JSON.stringify(mergedConfig, null, 2)};
`;
  await writeFile(filename, esmContent);
};

// Update CommonJS config files
const updateCjsConfig = async (filename: string): Promise<void> => {
  // For CommonJS, we need to be more careful about imports
  // Let's create a temporary file and require it
  delete require.cache[require.resolve(`./${filename}`)];
  const existingConfig = require(`./${filename}`);
  const mergedConfig = deepmerge(existingConfig, lintStagedConfig);

  const cjsContent = `module.exports = ${JSON.stringify(mergedConfig, null, 2)};
`;
  await writeFile(filename, cjsContent);
};

// Create fallback config file
const createFallbackConfig = async (): Promise<void> => {
  await writeFile(
    '.lintstagedrc.json',
    JSON.stringify(lintStagedConfig, null, 2)
  );
};

// Handle updating different config file types
const handleConfigFileUpdate = async (filename: string): Promise<void> => {
  if (filename === './package.json') {
    await updatePackageJson();
    return;
  }

  if (filename.endsWith('.json') || filename === './.lintstagedrc') {
    await updateJsonConfig(filename);
    return;
  }

  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
    await updateYamlConfig(filename);
    return;
  }

  const isEsm = await isProjectESM();

  if (filename.endsWith('.mjs') || (filename.endsWith('.js') && isEsm)) {
    try {
      await updateEsmConfig(filename);
    } catch {
      await createFallbackConfig();
    }
    return;
  }

  if (filename.endsWith('.cjs') || (filename.endsWith('.js') && !isEsm)) {
    try {
      await updateCjsConfig(filename);
    } catch {
      await createFallbackConfig();
    }
  }
};

export const lintStaged = {
  exists: async () => {
    for (const file of configFiles) {
      // biome-ignore lint/nursery/noAwaitInLoop: "this is fine."
      if (await exists(file)) {
        return true;
      }
    }

    return false;
  },
  install: (packageManagerAdd: string) => {
    execSync(`${packageManagerAdd} -D lint-staged`);
  },
  create: async () => {
    await writeFile(
      '.lintstagedrc.json',
      JSON.stringify(lintStagedConfig, null, 2)
    );
  },
  update: async () => {
    let existingConfigFile: string | null = null;

    for (const file of configFiles) {
      // biome-ignore lint/nursery/noAwaitInLoop: "this is fine."
      if (await exists(file)) {
        existingConfigFile = file;
        break;
      }
    }

    if (!existingConfigFile) {
      throw new Error('No config file found.');
    }

    await handleConfigFileUpdate(existingConfigFile);
  },
};
