import { readFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import { addDevDependency } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";
import YAML from "yaml";

import { getRootInstallOptions } from "../package-manager";
import { readPackageJson } from "../schemas";
import { spawnSync } from "../spawn-sync";
import { exists, updatePackageJson, writeProjectFile } from "../utils";
import {
  chainScript,
  isGeneratedUltraciteFixCommand,
  localBinCommand,
  runsUltraciteFix,
  ultraciteFixCommand,
} from "./project-command";
import {
  renderYamlDocument,
  replaceYamlStrings,
  someYamlString,
} from "./yaml-document";

const defaultPath = "./lefthook.yml";

// lefthook's own lookup order (internal/config/load.go): extensions in the
// outer loop, names in the inner one, and the first file found is the only
// one used. Writing lefthook.yml next to a user's .lefthook.yml or
// lefthook.yaml would silently replace their config.
const configNames = ["lefthook", ".lefthook", ".config/lefthook"];
const configExtensions = [".yml", ".yaml", ".json", ".jsonc", ".toml"];
const configPaths = configExtensions.flatMap((extension) =>
  configNames.map((name) => `./${name}${extension}`)
);

const findConfigPath = (): string | undefined =>
  configPaths.find((file) => exists(file));

const isYamlPath = (file: string): boolean =>
  file.endsWith(".yml") || file.endsWith(".yaml");

const fileExtensions = ["js", "jsx", "ts", "tsx", "json", "jsonc", "css"];

// With lefthook's default (gobwas) matcher `*` crosses directories, so
// `*.js` matches every .js file, while `**/*.js` needs at least one directory
// and skips root files like `index.ts` or `package.json`. The doublestar
// matcher behaves like a shell glob, where `**/*.js` is the one that matches
// everywhere.
const createGlobs = (doublestar: boolean): string[] =>
  fileExtensions.map((extension) =>
    doublestar ? `**/*.${extension}` : `*.${extension}`
  );

// The glob list earlier versions wrote, which missed root-level files.
const legacyGlobs = createGlobs(true);

const renderJob = (command: string, doublestar: boolean): string =>
  [
    `    - run: ${command}`,
    "      glob:",
    ...createGlobs(doublestar).map((glob) => `        - "${glob}"`),
    "      stage_fixed: true",
  ].join("\n");

const createLefthookConfig = (packageManager: PackageManagerName) =>
  `pre-commit:
  jobs:
${renderJob(ultraciteFixCommand(packageManager), false)}
`;

const createJobNode = (
  doc: YAML.Document,
  command: string,
  doublestar: boolean
): YAML.Node =>
  // A Map keeps lefthook's conventional key order (run first).
  doc.createNode(
    new Map<string, boolean | string | string[]>([
      ["run", command],
      ["glob", createGlobs(doublestar)],
      ["stage_fixed", true],
    ])
  );

const warnManualEdit = (file: string, command: string): void => {
  log.warn(
    `Could not add the Ultracite job to ${file} automatically. Add this to its pre-commit jobs:\n  - run: ${command}`
  );
};

// The job (or command) in a pre-commit hook that runs ultracite fix.
const findUltraciteJob = (hook: YAML.YAMLMap): YAML.YAMLMap | undefined => {
  const jobs = hook.get("jobs", true);
  const commands = hook.get("commands", true);
  const candidates = [
    ...(YAML.isSeq(jobs) ? jobs.items : []),
    ...(YAML.isMap(commands) ? commands.items.map((pair) => pair.value) : []),
  ];

  return candidates.find(
    (item): item is YAML.YAMLMap =>
      YAML.isMap(item) && runsUltraciteFix(String(item.get("run") ?? ""))
  );
};

/**
 * Brings an ultracite job written by an earlier init up to date: a dlx
 * command (which Yarn 1 can't run, and which ignores the pinned version)
 * becomes the installed binary, and the old `**` globs that skipped
 * root-level files are replaced. Returns whether anything changed.
 */
const upgradeUltraciteJob = (
  doc: YAML.Document,
  job: YAML.YAMLMap,
  command: string,
  doublestar: boolean
): boolean => {
  const commandChanged = replaceYamlStrings(
    job,
    (value) =>
      value === job.get("run") && isGeneratedUltraciteFixCommand(value),
    command
  );

  const glob = job.get("glob", true);
  const hasLegacyGlobs =
    !doublestar &&
    YAML.isSeq(glob) &&
    JSON.stringify(glob.toJSON()) === JSON.stringify(legacyGlobs);

  if (hasLegacyGlobs) {
    job.set("glob", doc.createNode(createGlobs(doublestar)));
  }

  return commandChanged || hasLegacyGlobs;
};

/**
 * Adds the ultracite job to a lefthook config document, through the yaml
 * Document API so any indentation style stays valid and comments survive.
 * Returns whether the document changed, or null when it can't be edited.
 */
const addUltraciteJob = (
  doc: YAML.Document,
  command: string
): boolean | null => {
  if (doc.contents === null) {
    doc.contents = doc.createNode({});
  }

  const root = doc.contents;

  if (!YAML.isMap(root)) {
    return null;
  }

  const doublestar = root.get("glob_matcher") === "doublestar";
  const hook = root.get("pre-commit", true);

  if (hook === undefined || (YAML.isScalar(hook) && hook.value === null)) {
    root.set(
      "pre-commit",
      doc.createNode({ jobs: [createJobNode(doc, command, doublestar)] })
    );
    return true;
  }

  if (!YAML.isMap(hook)) {
    return null;
  }

  const existingJob = findUltraciteJob(hook);

  if (existingJob) {
    return upgradeUltraciteJob(doc, existingJob, command, doublestar);
  }

  // A hand-written command elsewhere in the hook already runs ultracite.
  if (someYamlString(hook, runsUltraciteFix)) {
    return false;
  }

  const jobs = hook.get("jobs", true);

  if (YAML.isSeq(jobs)) {
    // First, so files are fixed before other jobs check them.
    jobs.items.unshift(createJobNode(doc, command, doublestar));
    return true;
  }

  if (jobs === undefined || (YAML.isScalar(jobs) && jobs.value === null)) {
    // `jobs` and `commands` can live side by side; lefthook runs jobs first.
    hook.set("jobs", doc.createNode([createJobNode(doc, command, doublestar)]));
    return true;
  }

  return null;
};

export const lefthook = {
  create: async (packageManager: PackageManagerName) => {
    const config = createLefthookConfig(packageManager);
    await writeProjectFile(defaultPath, config);
  },
  exists: () => findConfigPath() !== undefined,
  install: async (packageManager: PackageManager) => {
    await addDevDependency("lefthook", {
      corepack: false,
      silent: true,
      ...getRootInstallOptions(packageManager),
    });

    // Initialize hooks on install, keeping any prepare script the project
    // already has (e.g. `svelte-kit sync`, or husky's).
    const packageJson = await readPackageJson();
    await updatePackageJson({
      scripts: {
        prepare: chainScript(
          packageJson?.scripts?.prepare,
          "lefthook install",
          /\blefthook\s+install\b/u
        ),
      },
    });

    // Run the lefthook just installed, split so spawn gets a real binary and
    // never a shell.
    const [command, ...args] = localBinCommand(
      packageManager.name,
      "lefthook",
      ["install"]
    ).split(" ");

    // The result is deliberately ignored: lefthook install fails with exit
    // code 128 when not in a git repository. The dependency and prepare script
    // are still set up, so lefthook will initialize hooks on the next
    // `prepare` run after git is initialized.
    spawnSync(command, args, { stdio: "pipe" });
  },
  update: async (packageManager: PackageManagerName) => {
    const file = findConfigPath() ?? defaultPath;
    const command = ultraciteFixCommand(packageManager);

    if (!isYamlPath(file)) {
      warnManualEdit(file, command);
      return;
    }

    const existingContents = await readFile(file, "utf-8");
    const doc = YAML.parseDocument(existingContents);

    // `lefthook install` writes a fully commented-out example config when
    // none exists; replace it rather than appending below the comments.
    if (
      existingContents.startsWith("# EXAMPLE USAGE:") &&
      doc.contents === null
    ) {
      await writeProjectFile(file, createLefthookConfig(packageManager));
      return;
    }

    if (doc.errors.length > 0) {
      warnManualEdit(file, command);
      return;
    }

    const changed = addUltraciteJob(doc, command);

    if (changed === null) {
      warnManualEdit(file, command);
      return;
    }

    if (changed) {
      await writeProjectFile(file, renderYamlDocument(doc, existingContents));
    }
  },
};
