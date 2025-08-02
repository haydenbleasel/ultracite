#!/usr/bin/env node

import { createCli, type TrpcCliMeta, trpcServer } from 'trpc-cli';
import z from 'zod';
import packageJson from '../package.json' with { type: 'json' };
import { format } from './commands/format';
import { lint } from './commands/lint';
import { initialize } from './initialize';
import { detectMonorepo } from './utils';

const t = trpcServer.initTRPC.meta<TrpcCliMeta>().create();

const packageManager = z
  .enum(['pnpm', 'bun', 'yarn', 'npm', 'deno'])
  .describe('Package manager to use');

const isMonorepo = z
  .boolean()
  .optional()
  .describe('Is the project a monorepo?')
  .default(await detectMonorepo());

const editors = z
  .array(z.enum(['vscode', 'zed']))
  .optional()
  .describe('Editors to configure');

const rules = z
  .array(
    z.enum([
      'vscode-copilot',
      'cursor',
      'windsurf',
      'zed',
      'claude',
      'codex',
      'kiro',
    ])
  )
  .optional()
  .describe('Editor rules to enable');

const features = z
  .array(z.enum(['husky', 'lefthook', 'lint-staged']))
  .optional()
  .describe('Additional features to enable');

const removePrettier = z
  .boolean()
  .optional()
  .describe('Remove Prettier dependencies and configuration');

const removeEslint = z
  .boolean()
  .optional()
  .describe('Remove ESLint dependencies and configuration');

const skipInstall = z
  .boolean()
  .optional()
  .describe('Skip installing dependencies');

const router = t.router({
  init: t.procedure
    .meta({
      description: 'Initialize Ultracite in the current directory',
    })
    .input(
      z.object({
        pm: packageManager,
        isMonorepo,
        editors,
        rules,
        features,
        removePrettier,
        removeEslint,
        skipInstall,
      })
    )
    .mutation(async ({ input }) => {
      await initialize(input);
    }),

  lint: t.procedure
    .meta({
      description: 'Run Biome linter without fixing files',
    })
    .input(
      z
        .array(z.string())
        .optional()
        .default([])
        .describe('specific files to lint')
    )
    .query(({ input }) => {
      lint(input);
    }),

  format: t.procedure
    .meta({
      description: 'Run Biome linter and fixes files',
    })
    .input(
      z.tuple([
        z
          .array(z.string())
          .optional()
          .default([])
          .describe('specific files to format'),
        z.object({
          unsafe: z.boolean().optional().describe('apply unsafe fixes'),
        }),
      ])
    )
    .mutation(({ input }) => {
      const [files, options] = input;
      format(files, { unsafe: options.unsafe });
    }),
});

const cli = createCli({
  router,
  name: 'ultracite',
  version: packageJson.version,
  description: 'Ship code faster and with more confidence.',
});

if (!process.env.VITEST) {
  cli.run();
}
