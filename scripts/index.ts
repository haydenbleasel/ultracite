#!/usr/bin/env node

import { createCli, type TrpcCliMeta, trpcServer } from "trpc-cli";
import z from "zod";
import packageJson from "../package.json" with { type: "json" };
import { format } from "./commands/format";
import { lint } from "./commands/lint";
import { options } from "./consts/options";
import { initialize } from "./initialize";

const t = trpcServer.initTRPC.meta<TrpcCliMeta>().create();

export const router = t.router({
  init: t.procedure
    .meta({
      description: "Initialize Ultracite in the current directory",
    })
    .input(
      z.object({
        pm: z
          .enum(options.packageManagers)
          .optional()
          .describe("Package manager to use"),
        editors: z
          .array(z.enum(options.editorConfigs))
          .optional()
          .describe("Editors to configure"),
        rules: z
          .array(z.enum(options.editorRules))
          .optional()
          .describe("Editor rules to enable"),
        integrations: z
          .array(z.enum(options.integrations))
          .optional()
          .describe("Additional integrations to enable"),
        removePrettier: z
          .boolean()
          .optional()
          .describe("Remove Prettier dependencies and configuration"),
        removeEslint: z
          .boolean()
          .optional()
          .describe("Remove ESLint dependencies and configuration"),
        skipInstall: z
          .boolean()
          .default(false)
          .describe("Skip installing dependencies"),
      })
    )
    .mutation(async ({ input }) => {
      await initialize(input);
    }),

  lint: t.procedure
    .meta({
      description: "Run Biome linter without fixing files",
    })
    .input(
      z
        .array(z.string())
        .optional()
        .default([])
        .describe("specific files to lint")
    )
    .query(({ input }) => {
      lint(input);
    }),

  format: t.procedure
    .meta({
      description: "Run Biome linter and fixes files",
    })
    .input(
      z.tuple([
        z
          .array(z.string())
          .optional()
          .default([])
          .describe("specific files to format"),
        z.object({
          unsafe: z.boolean().optional().describe("apply unsafe fixes"),
        }),
      ])
    )
    .mutation(({ input }) => {
      const [files, opts] = input;
      format(files, { unsafe: opts.unsafe });
    }),
});

const cli = createCli({
  router,
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
});

if (!process.env.VITEST) {
  cli.run();
}
