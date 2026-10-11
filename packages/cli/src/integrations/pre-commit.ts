import { readFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import type { PackageManagerName } from "nypm";
import YAML from "yaml";

import { exists, writeProjectFile } from "../utils";
import {
  isGeneratedUltraciteFixCommand,
  ultraciteFixCommand,
} from "./project-command";
import { stagedFileExtensions } from "./staged-files";
import { renderYamlDocument, replaceYamlStrings } from "./yaml-document";

const path = "./.pre-commit-config.yaml";
const HOOK_ID = "ultracite";
// A `files` pattern rather than `types_or`, because pre-commit's file type
// tags (from identify) have none for .jsonc, .mts, .cts or .gql.
const FILES_PATTERN = String.raw`\.(${stagedFileExtensions.join("|")})$`;

// The `types_or` init wrote before v8, which missed most of those types.
const LEGACY_FILE_TYPES = ["javascript", "jsx", "ts", "tsx", "json", "css"];

// pre-commit passes the staged files that match `files` (and stashes
// unstaged changes while the hook runs), so only those are fixed.
// require_serial keeps it to one `ultracite fix` run rather than one per CPU,
// each of which would load the whole toolchain.
const createPreCommitConfig = (packageManager: PackageManagerName) => `repos:
  - repo: local
    hooks:
      - id: ${HOOK_ID}
        name: ultracite
        entry: ${ultraciteFixCommand(packageManager)}
        language: system
        files: ${FILES_PATTERN}
        require_serial: true
`;

// The local repo entry holding the ultracite hook, as a YAML node. Maps keep
// the key order of a hand-written config.
const createRepoNode = (doc: YAML.Document, command: string): YAML.Node => {
  const hook = new Map<string, boolean | string>([
    ["id", HOOK_ID],
    ["name", "ultracite"],
    ["entry", command],
    ["language", "system"],
    ["files", FILES_PATTERN],
    ["require_serial", true],
  ]);

  return doc.createNode(
    new Map<string, string | Map<string, boolean | string>[]>([
      ["repo", "local"],
      ["hooks", [hook]],
    ])
  );
};

// The ultracite hook's mapping, if the config already has one.
const findUltraciteHook = (repos: YAML.YAMLSeq): YAML.YAMLMap | undefined => {
  for (const repo of repos.items) {
    const hooks = YAML.isMap(repo) ? repo.get("hooks", true) : undefined;

    if (!YAML.isSeq(hooks)) {
      continue;
    }

    const hook = hooks.items.find(
      (item) => YAML.isMap(item) && item.get("id") === HOOK_ID
    );

    if (YAML.isMap(hook)) {
      return hook;
    }
  }

  return undefined;
};

/**
 * Swaps the `types_or` an earlier init wrote for the `files` pattern, in the
 * same place in the mapping. Hand-edited types are left alone. Returns
 * whether it changed anything.
 */
const upgradeFileFilter = (hook: YAML.YAMLMap): boolean => {
  const pair = hook.items.find(
    (item) => YAML.isScalar(item.key) && item.key.value === "types_or"
  );
  const types = YAML.isSeq(pair?.value) ? pair.value.toJSON() : null;

  if (
    !pair ||
    hook.has("files") ||
    JSON.stringify(types) !== JSON.stringify(LEGACY_FILE_TYPES)
  ) {
    return false;
  }

  pair.key = new YAML.Scalar("files");
  pair.value = new YAML.Scalar(FILES_PATTERN);
  return true;
};

/**
 * Brings a hook an earlier init wrote up to date: a dlx command (e.g. `yarn
 * dlx ultracite fix`, which Yarn 1 can't run) becomes the current one, a hook
 * that fixed the whole project (`pass_filenames: false`, before v8) gets the
 * staged files instead, and the old `types_or`, which missed most file types,
 * becomes the `files` pattern. A hand-written entry is left alone. Returns
 * whether anything changed.
 */
const upgradeUltraciteHook = (hook: YAML.YAMLMap, command: string): boolean => {
  const entry = String(hook.get("entry") ?? "");

  if (!isGeneratedUltraciteFixCommand(entry)) {
    return false;
  }

  const entryChanged = replaceYamlStrings(
    hook,
    (value) => value === entry,
    command
  );
  const fixedWholeProject = hook.get("pass_filenames") === false;

  if (fixedWholeProject) {
    hook.delete("pass_filenames");

    if (!hook.has("require_serial")) {
      hook.set("require_serial", true);
    }
  }

  const filterChanged = upgradeFileFilter(hook);

  return entryChanged || fixedWholeProject || filterChanged;
};

const warnManualEdit = (command: string): void => {
  log.warn(
    `Could not add the Ultracite hook to ${path} automatically. Add a local repo entry running \`${command}\`.`
  );
};

export const preCommit = {
  create: async (packageManager: PackageManagerName) => {
    const config = createPreCommitConfig(packageManager);
    await writeProjectFile(path, config);
  },
  exists: () => exists(path),
  update: async (packageManager: PackageManagerName) => {
    const content = await readFile(path, "utf-8");
    const command = ultraciteFixCommand(packageManager);
    const doc = YAML.parseDocument<YAML.Node>(content);

    // Edited through the yaml Document API so any indentation style
    // (including `-   repo:` from `pre-commit sample-config`) stays valid and
    // comments survive.
    if (doc.errors.length > 0) {
      warnManualEdit(command);
      return;
    }

    if (doc.contents === null) {
      doc.contents = doc.createNode({});
    }

    const root = doc.contents;

    if (!YAML.isMap(root)) {
      warnManualEdit(command);
      return;
    }

    const repos = root.get("repos", true);

    if (YAML.isSeq(repos)) {
      const existingHook = findUltraciteHook(repos);

      if (existingHook) {
        if (upgradeUltraciteHook(existingHook, command)) {
          await writeProjectFile(path, renderYamlDocument(doc, content));
        }
        return;
      }

      repos.items.unshift(createRepoNode(doc, command));
    } else if (repos === undefined || YAML.isScalar(repos)) {
      if (YAML.isScalar(repos) && repos.value !== null) {
        warnManualEdit(command);
        return;
      }

      root.set("repos", doc.createNode([createRepoNode(doc, command)]));
    } else {
      warnManualEdit(command);
      return;
    }

    await writeProjectFile(path, renderYamlDocument(doc, content));
  },
};
