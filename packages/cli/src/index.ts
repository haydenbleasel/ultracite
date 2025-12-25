import { options } from "@ultracite/data/options";
import { initTRPC } from "@trpc/server";
import { createCli, type TrpcCliMeta } from "trpc-cli";
import { type PackageManagerName, packageManagers } from "nypm";
import z from "zod";
import packageJson from "../package.json" with { type: "json" };
import { check } from "./commands/check";
import { doctor } from "./commands/doctor";
import { fix } from "./commands/fix";
import { initialize } from "./initialize";

const t = initTRPC.meta<TrpcCliMeta>().create();

export const router = t.router({
  init: t.procedure
    .meta({
      description: "Initialize Ultracite in the current directory",
    })
    .input(
      z.object({
        pm: z
          .enum(
            packageManagers.map((pm) => pm.name) as [
              PackageManagerName,
              ...PackageManagerName[],
            ]
          )
          .optional()
          .describe("Package manager to use"),
        linter: z
          .enum(options.linters)
          .optional()
          .describe("Linter / formatter to use"),
        editors: z
          .array(z.enum(options.editorConfigs))
          .optional()
          .describe("Editors to configure"),
        agents: z
          .array(z.enum(options.agents))
          .optional()
          .describe("Agents to enable"),
        hooks: z
          .array(z.enum(options.hooks))
          .optional()
          .describe("Hooks to enable"),
        frameworks: z
          .array(z.enum(options.frameworks))
          .optional()
          .describe("Frameworks being used"),
        integrations: z
          .array(z.enum(options.integrations))
          .optional()
          .describe("Additional integrations to enable"),
        migrate: z
          .array(z.enum(options.migrations))
          .optional()
          .describe(
            "Migration tools to remove (e.g., eslint, prettier). Removes dependencies, config files, and editor settings."
          ),
        skipInstall: z
          .boolean()
          .default(false)
          .describe("Skip installing dependencies"),
        quiet: z
          .boolean()
          .default(process.env.CI === "true" || process.env.CI === "1")
          .describe(
            "Suppress all interactive prompts and visual output. Automatically enabled in CI environments."
          ),
      })
    )
    .mutation(async ({ input }) => {
      await initialize(input);
    }),

  check: t.procedure
    .meta({
      description: "Run linter without fixing files",
    })
    .input(
      z
        .tuple([
          z
            .array(z.string())
            .optional()
            .default([])
            .describe("specific files to lint"),
          z.object({
            "diagnostic-level": z
              .enum(["info", "warn", "error"])
              .optional()
              .describe(
                "level of diagnostics to show. In order, from the lowest to the most important: info, warn, error."
              ),
            linter: z
              .enum(options.linters)
              .optional()
              .describe("linter to use (biome, eslint, or oxlint)"),
          }),
        ])
        .optional()
    )
    .query(async ({ input }) => {
      await check(input);
    }),

  fix: t.procedure
    .meta({
      description: "Run linter and fix files",
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
          linter: z
            .enum(options.linters)
            .optional()
            .describe("linter to use (biome, eslint, or oxlint)"),
        }),
      ])
    )
    .mutation(async ({ input }) => {
      const [files, opts] = input;
      await fix(files, { unsafe: opts.unsafe, linter: opts.linter });
    }),

  doctor: t.procedure
    .meta({
      description: "Verify your Ultracite setup and check for issues",
    })
    .query(async () => {
      await doctor();
    }),

  // Deprecated commands for backwards compatibility
  lint: t.procedure
    .meta({
      description:
        "⚠️ DEPRECATED: Use 'check' instead - Run Biome linter without fixing files",
    })
    .input(
      z
        .array(z.string())
        .optional()
        .default([])
        .describe("specific files to lint")
    )
    .query(async ({ input }) => {
      console.warn(
        "⚠️  Warning: 'lint' command is deprecated. Please use 'check' instead."
      );
      await check([input, {}]);
    }),

  format: t.procedure
    .meta({
      description:
        "⚠️ DEPRECATED: Use 'fix' instead - Run Biome linter and fixes files",
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
    .mutation(async ({ input }) => {
      const [files, opts] = input;
      console.warn(
        "⚠️  Warning: 'format' command is deprecated. Please use 'fix' instead."
      );
      await fix(files, { unsafe: opts.unsafe });
    }),
});

const cli = createCli({
  router,
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
});

if (!process.env.TEST) {
  cli.run();
}
