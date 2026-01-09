import { options } from "@repo/data/options";
import { initTRPC } from "@trpc/server";
import { type PackageManagerName, packageManagers } from "nypm";
import { createCli, type TrpcCliMeta } from "trpc-cli";
import z from "zod";

import packageJson from "../package.json" with { type: "json" };
import { check } from "./commands/check";
import { doctor } from "./commands/doctor";
import { fix } from "./commands/fix";
import { initialize } from "./initialize";

const t = initTRPC.meta<TrpcCliMeta>().create();

export const router = t.router({
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
            "error-on-warnings": z
              .boolean()
              .optional()
              .describe("treat warnings as errors (biome only)"),
            linter: z
              .enum(options.linters)
              .optional()
              .describe("linter to use (biome, eslint, or oxlint)"),
            "no-error-on-unmatched-pattern": z
              .boolean()
              .optional()
              .describe(
                "suppress errors when files don't match patterns (useful for hooks/CI)"
              ),
            "type-aware": z
              .boolean()
              .optional()
              .describe("enable type-aware linting rules (oxlint only)"),
            "type-check": z
              .boolean()
              .optional()
              .describe("enable TypeScript compiler diagnostics (oxlint only)"),
          }),
        ])
        .optional()
    )
    .query(async ({ input }) => {
      await check(input);
    }),

  doctor: t.procedure
    .meta({
      description: "Verify your Ultracite setup and check for issues",
    })
    .query(async () => {
      await doctor();
    }),

  fix: t.procedure
    .meta({
      description: "Run linter and fix files",
    })
    .input(
      z
        .tuple([
          z
            .array(z.string())
            .optional()
            .default([])
            .describe("specific files to format"),
          z.object({
            "error-on-warnings": z
              .boolean()
              .optional()
              .describe("treat warnings as errors (biome only)"),
            linter: z
              .enum(options.linters)
              .optional()
              .describe("linter to use (biome, eslint, or oxlint)"),
            "type-aware": z
              .boolean()
              .optional()
              .describe("enable type-aware linting rules (oxlint only)"),
            "type-check": z
              .boolean()
              .optional()
              .describe("enable TypeScript compiler diagnostics (oxlint only)"),
            unsafe: z.boolean().optional().describe("apply unsafe fixes"),
          }),
        ])
        .optional()
    )
    .mutation(async ({ input }) => {
      const [files, opts] = input ?? [[], {}];
      await fix(files, {
        "error-on-warnings": opts["error-on-warnings"],
        linter: opts.linter,
        "type-aware": opts["type-aware"],
        "type-check": opts["type-check"],
        unsafe: opts.unsafe,
      });
    }),

  init: t.procedure
    .meta({
      description: "Initialize Ultracite in the current directory",
    })
    .input(
      z.object({
        agents: z
          .array(z.enum(options.agents))
          .optional()
          .describe("Agents to enable"),
        editors: z
          .array(z.enum(options.editorConfigs))
          .optional()
          .describe("Editors to configure"),
        frameworks: z
          .array(z.enum(options.frameworks))
          .optional()
          .describe("Frameworks being used"),
        hooks: z
          .array(z.enum(options.hooks))
          .optional()
          .describe("Hooks to enable"),
        integrations: z
          .array(z.enum(options.integrations))
          .optional()
          .describe("Additional integrations to enable"),
        linter: z
          .enum(options.linters)
          .optional()
          .describe("Linter / formatter to use"),
        migrate: z
          .array(z.enum(options.migrations))
          .optional()
          .describe(
            "Migration tools to remove (e.g., eslint, prettier). Removes dependencies, config files, and editor settings."
          ),
        pm: z
          .enum(
            packageManagers.map((pm) => pm.name) as [
              PackageManagerName,
              ...PackageManagerName[],
            ]
          )
          .optional()
          .describe("Package manager to use"),
        quiet: z
          .boolean()
          .default(process.env.CI === "true" || process.env.CI === "1")
          .describe(
            "Suppress all interactive prompts and visual output. Automatically enabled in CI environments."
          ),
        skipInstall: z
          .boolean()
          .default(false)
          .describe("Skip installing dependencies"),
        "type-aware": z
          .boolean()
          .optional()
          .describe(
            "enable type-aware linting (oxlint only, installs oxlint-tsgolint)"
          ),
      })
    )
    .mutation(async ({ input }) => {
      await initialize(input);
    }),
});

const cli = createCli({
  description: packageJson.description,
  name: packageJson.name,
  router,
  version: packageJson.version,
});

if (!process.env.TEST) {
  cli.run();
}
