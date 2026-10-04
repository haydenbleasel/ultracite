import { readFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import type { PackageManagerName } from "nypm";
import YAML from "yaml";

import { exists, writeProjectFile } from "../utils";
import {
  isGeneratedUltraciteFixCommand,
  ultraciteFixCommand,
} from "./project-command";
import { renderYamlDocument, replaceYamlStrings } from "./yaml-document";

const path = "./.pre-commit-config.yaml";
const HOOK_ID = "ultracite";
const FILE_TYPES = ["javascript", "jsx", "ts", "tsx", "json", "css"];

const createPreCommitConfig = (packageManager: PackageManagerName) => `repos:
  - repo: local
    hooks:
      - id: ${HOOK_ID}
        name: ultracite
        entry: ${ultraciteFixCommand(packageManager)}
        language: system
        types_or: [${FILE_TYPES.join(", ")}]
        pass_filenames: false
`;

// The local repo entry holding the ultracite hook, as a YAML node. Maps keep
// the key order of a hand-written config.
const createRepoNode = (doc: YAML.Document, command: string): YAML.Node => {
  const fileTypes = doc.createNode(FILE_TYPES);
  fileTypes.flow = true;

  const hook = new Map<string, boolean | string | YAML.Node>([
    ["id", HOOK_ID],
    ["name", "ultracite"],
    ["entry", command],
    ["language", "system"],
    ["types_or", fileTypes],
    ["pass_filenames", false],
  ]);

  return doc.createNode(
    new Map<string, string | Map<string, boolean | string | YAML.Node>[]>([
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
        // Re-running init moves a hook from an earlier version (e.g. `yarn
        // dlx ultracite fix`, which Yarn 1 can't run) onto the current
        // command; a hand-written entry is left alone.
        if (
          replaceYamlStrings(
            existingHook,
            (value) =>
              value === existingHook.get("entry") &&
              isGeneratedUltraciteFixCommand(value),
            command
          )
        ) {
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
