import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { rulesFile } from '../docs/lib/rules';
import { EDITOR_RULES, type EditorRuleName } from './consts/rules';
import { exists } from './utils';

export const createEditorRules = (name: EditorRuleName) => {
  const config = EDITOR_RULES[name];
  const content = config.content ?? rulesFile;

  const ensureDirectory = async () => {
    const dir = dirname(config.path);
    // Only create directory if it's not the current directory
    if (dir !== '.') {
      // Remove leading './' if present for consistency with test expectations
      const cleanDir = dir.startsWith('./') ? dir.slice(2) : dir;
      await mkdir(cleanDir, { recursive: true });
    }
  };

  return {
    exists: () => exists(config.path),
    
    create: async () => {
      await ensureDirectory();
      await writeFile(config.path, content);
    },
    
    update: async () => {
      await ensureDirectory();
      
      if (config.appendMode) {
        if (!(await exists(config.path))) {
          await writeFile(config.path, content);
          return;
        }
        
        const existingContents = await readFile(config.path, 'utf-8');
        
        // Check if rules are already present to avoid duplicates
        if (existingContents.includes(content.trim())) {
          return;
        }
        
        await writeFile(config.path, `${existingContents}\n\n${content}`);
      } else {
        await writeFile(config.path, content);
      }
    },
  };
};