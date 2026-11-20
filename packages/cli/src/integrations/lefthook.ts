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
import { stagedFileExtensions } from "./staged-files";
import { renderYamlDocument, someYamlString } from "./yaml-document";

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

// The narrower list init wrote before v8, when the job fixed the whole
// project and the globs only decided whether it ran.
const legacyFileExtensions = ["js", "jsx", "ts", "tsx", "json", "jsonc", "css"];

// The full list init has written since v8, first as one glob per extension
// and then as a single brace glob. A snapshot, not a copy to keep in sync:
// add new types to stagedFileExtensions only, so globs written with this
// list are still recognized (and widened) after they change.
const v8FileExtensions = [
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "mts",
  "cts",
  "json",
  "jsonc",
  "css",
  "scss",
  "less",
  "vue",
  "svelte",
  "astro",
  "html",
  "md",
  "mdx",
  "yaml",
  "yml",
  "graphql",
  "gql",
];

// With lefthook's default (gobwas) matcher `*` crosses directories, so
// `*.js` matches every .js file, while `**/*.js` needs at least one directory
// and skips root files like `index.ts` or `package.json`. The doublestar
// matcher behaves like a shell glob, where `**/*.js` is the one that matches
// everywhere.
const globPrefix = (doublestar: boolean): string => (doublestar ? "**/" : "");

const globsFor = (extensions: string[], doublestar: boolean): string[] =>
  extensions.map((extension) => `${globPrefix(doublestar)}*.${extension}`);

const compactGlobFor = (extensions: string[], doublestar: boolean): string =>
  `${globPrefix(doublestar)}*.{${extensions.join(",")}}`;

const createGlob = (doublestar: boolean): string =>
  compactGlobFor(stagedFileExtensions, doublestar);

// Every glob an init has written, for either matcher, as JSON, with the file
// types it covers: the legacy and v8 lists (the legacy `**` form also missed
// root-level files under the default matcher), and the brace glob for the v8
// and current extensions.
const generatedGlobs = new Map(
  [false, true].flatMap((doublestar) => [
    ...[legacyFileExtensions, v8FileExtensions].map(
      (extensions) =>
        [JSON.stringify(globsFor(extensions, doublestar)), extensions] as const
    ),
    ...[v8FileExtensions, stagedFileExtensions].map(
      (extensions) =>
        [
          JSON.stringify(compactGlobFor(extensions, doublestar)),
          extensions,
        ] as const
    ),
  ])
);

const renderJob = (command: string, doublestar: boolean): string =>
  [
    `    - run: ${command}`,
    `      glob: "${createGlob(doublestar)}"`,
    "      stage_fixed: true",
  ].join("\n");

// lefthook substitutes the staged files that match the job's globs, so only
// those are fixed, and stage_fixed re-stages just them.
const STAGED_FILES = "{staged_files}";

const stagedFixCommand = (packageManager: PackageManagerName): string =>
  `${ultraciteFixCommand(packageManager)} ${STAGED_FILES}`;

/**
 * Whether a job's `run` is one an `init` wrote: a generated `ultracite fix`
 * command followed by `{staged_files}`, or on its own as before v8, when the
 * job fixed the whole project.
 */
const isGeneratedJobCommand = (command: string): boolean => {
  const trimmed = command.trim();

  const withoutFiles = trimmed.endsWith(` ${STAGED_FILES}`)
    ? trimmed.slice(0, -STAGED_FILES.length)
    : trimmed;

  return isGeneratedUltraciteFixCommand(withoutFiles);
};

const createLefthookConfig = (packageManager: PackageManagerName) =>
  `pre-commit:
  jobs:
${renderJob(stagedFixCommand(packageManager), false)}
`;

const createJobNode = (
  doc: YAML.Document,
  command: string,
  doublestar: boolean
): YAML.Node =>
  // A Map keeps lefthook's conventional key order (run first).
  doc.createNode(
    new Map<string, boolean | string>([
      ["run", command],
      ["glob", createGlob(doublestar)],
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

// Whether other hooks may share a job: an alias of the job, or of the list
// or hook holding it, changes along with it.
const isSharedJob = (hook: YAML.YAMLMap, job: YAML.YAMLMap): boolean => {
  const jobs = hook.get("jobs", true);

  const list =
    YAML.isSeq(jobs) && jobs.items.includes(job)
      ? jobs
      : hook.get("commands", true);

  return Boolean(
    hook.anchor || job.anchor || (YAML.isNode(list) && list.anchor)
  );
};

// Whether a job's glob is a scalar or a list of them that can be edited in
// place. Anchored globs, and lists with anchored items, may be shared with
// other jobs.
const isEditableGlob = (
  glob: unknown
): glob is YAML.Scalar | YAML.YAMLSeq<YAML.Scalar> =>
  (YAML.isScalar(glob) ||
    (YAML.isSeq(glob) &&
      glob.items.every((item) => YAML.isScalar(item) && !item.anchor))) &&
  !glob.anchor;

/**
 * Brings a glob an init wrote (a list, or a brace glob for other extensions
 * or the other matcher) up to date. With `widen`, it becomes the current
 * brace glob. Without it, for a job whose command was edited, it keeps its
 * form and file types and only gets the configured matcher's prefix, so it
 * still matches files in every directory. Hand-edited globs are left alone.
 * Returns whether anything changed.
 */
const upgradeGlob = (
  doc: YAML.Document,
  job: YAML.YAMLMap,
  doublestar: boolean,
  widen: boolean
): boolean => {
  // `get` types a kept node as a Scalar, but it can be any node.
  const glob: unknown = job.get("glob", true);

  if (!isEditableGlob(glob)) {
    return false;
  }

  const extensions = generatedGlobs.get(JSON.stringify(glob.toJSON()));

  if (!extensions) {
    return false;
  }

  const currentGlob = createGlob(doublestar);

  if (YAML.isScalar(glob)) {
    const value = widen ? currentGlob : compactGlobFor(extensions, doublestar);

    if (glob.value === value) {
      return false;
    }

    // Keeps the scalar's comments and quoting.
    glob.value = value;

    return true;
  }

  if (!widen) {
    const globs = globsFor(extensions, doublestar);

    if (JSON.stringify(glob.toJSON()) === JSON.stringify(globs)) {
      return false;
    }

    // Item by item, so each keeps its comments.
    for (const [index, item] of glob.items.entries()) {
      item.value = globs[index];
    }

    return true;
  }

  const compact = doc.createNode(currentGlob);

  // The list's item comments move above the replacement scalar.
  const comments = glob.items.flatMap((item) => [
    item.commentBefore,
    item.comment,
  ]);

  compact.commentBefore =
    [glob.commentBefore, ...comments, glob.comment]
      .filter(Boolean)
      .join("\n") || undefined;
  compact.spaceBefore = glob.spaceBefore;
  job.set("glob", compact);

  return true;
};

/**
 * Brings an ultracite job written by an earlier init up to date: a dlx
 * command (which Yarn 1 can't run, and which ignores the pinned version)
 * becomes the installed binary, a command without `{staged_files}` (which
 * fixed the whole project) gets it, and generated globs become a single
 * brace glob for the configured matcher. A job whose command was edited
 * keeps its command and file types, and only gets the matcher fixed.
 * Returns whether anything changed, or `shared-command` when an anchor
 * prevents a command upgrade.
 */
const upgradeUltraciteJob = (
  doc: YAML.Document,
  job: YAML.YAMLMap,
  {
    command,
    doublestar,
    shared,
  }: {
    command: string;
    doublestar: boolean;
    shared: boolean;
  }
): boolean | "shared-command" => {
  // `get` types a kept node as a Scalar, but it can be any node.
  const run: unknown = job.get("run", true);

  const generated =
    YAML.isScalar(run) && isGeneratedJobCommand(String(run.value));

  const commandChanged = generated && run.value !== command;

  if (commandChanged && (shared || run.anchor)) {
    return "shared-command";
  }

  if (shared) {
    return false;
  }

  if (commandChanged) {
    // Only `run`, keeping its comments.
    run.value = command;
  }

  const globChanged = upgradeGlob(doc, job, doublestar, generated);

  return commandChanged || globChanged;
};

/**
 * Adds the ultracite job to a lefthook config document, through the yaml
 * Document API so any indentation style stays valid and comments survive.
 * Returns whether the document changed, `shared-command` for a blocked
 * upgrade, or null when a job can't be added.
 */
const addUltraciteJob = (
  doc: YAML.Document,
  command: string
): boolean | "shared-command" | null => {
  if (doc.contents === null) {
    doc.contents = doc.createNode({});
  }

  const root = doc.contents;

  if (!YAML.isMap(root)) {
    return null;
  }

  const matcher: unknown = root.get("glob_matcher", true);

  const resolvedMatcher = YAML.isAlias(matcher)
    ? matcher.resolve(doc)
    : matcher;

  const doublestar =
    YAML.isScalar(resolvedMatcher) && resolvedMatcher.value === "doublestar";

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
    return upgradeUltraciteJob(doc, existingJob, {
      command,
      doublestar,
      shared: isSharedJob(hook, existingJob),
    });
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
  // The config file update edits (or create writes), for messages.
  configPath: () => (findConfigPath() ?? defaultPath).slice(2),
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
    const command = stagedFixCommand(packageManager);

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

    if (changed === "shared-command") {
      log.warn(
        `Could not update the Ultracite job in ${file} because it uses a shared YAML anchor. Update the existing pre-commit job to run this command:\n  ${command}`
      );

      return;
    }

    if (changed) {
      await writeProjectFile(file, renderYamlDocument(doc, existingContents));
    }
  },
};
