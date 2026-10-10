import {
  applyEdits,
  findNodeAtLocation,
  getNodeValue,
  modify,
  parseTree,
} from "jsonc-parser";
import type { ParseError } from "jsonc-parser";
import { isNode, isScalar, isSeq, parseDocument } from "yaml";
import { z } from "zod";

import type { AgentSettings } from "./data/agents";

// Earlier versions wrote Aider's rules to this file, which nothing loaded.
const LEGACY_RULES_PATH = "ultracite.md";

// The instruction-file and lint keys each take a string or a list of strings.
const stringsSchema = z.union([z.string(), z.array(z.string())]).nullish();
type Strings = z.infer<typeof stringsSchema>;

const mentionsUltracite = (command: string): boolean =>
  command.includes("ultracite");

const expectStrings = (
  parsed: ReturnType<typeof stringsSchema.safeParse>,
  key: readonly string[],
  path: string
): Strings => {
  if (!parsed.success) {
    throw new Error(
      `Expected ${key.join(".")} in ${path} to be a file name or a list of them.`
    );
  }

  return parsed.data;
};

/**
 * The instruction files the agent should load: what it loads now (its
 * defaults while the key is unset), minus the old ultracite.md, plus
 * `rulesPath`. Null when that's what the file already says.
 */
const nextRead = (
  current: Strings,
  settings: AgentSettings,
  rulesPath: string
): string[] | null => {
  const loaded =
    current === undefined || current === null
      ? (settings.defaultRead ?? [])
      : [current].flat();
  const kept = loaded.filter((file) => file !== LEGACY_RULES_PATH);
  const next = kept.includes(rulesPath) ? kept : [...kept, rulesPath];

  return JSON.stringify([current].flat()) === JSON.stringify(next)
    ? null
    : next;
};

/**
 * The lint command to set, or null to leave the key alone: Ultracite's
 * command where there's none or an older one, but never over another
 * linter's (Aider's catch-all `lint-cmd` would override the user's
 * per-language linters).
 */
const nextLint = (current: Strings, fixCommand: string): Strings | null => {
  if (current === undefined || current === null) {
    return fixCommand;
  }

  const commands = [current].flat();
  const next = commands.map((command) =>
    mentionsUltracite(command) ? fixCommand : command
  );

  if (JSON.stringify(commands) === JSON.stringify(next)) {
    return null;
  }

  return Array.isArray(current) ? next : fixCommand;
};

const mergeYaml = (
  existing: string,
  settings: AgentSettings,
  rulesPath: string,
  fixCommand: string
): string => {
  const document = parseDocument(existing);

  if (document.errors.length > 0) {
    throw new Error(
      `Couldn't parse ${settings.path}: ${document.errors[0]?.message ?? "invalid YAML"}`
    );
  }

  const stringsAt = (key: string[]): Strings => {
    const node = document.getIn(key);
    return expectStrings(
      stringsSchema.safeParse(isNode(node) ? node.toJSON() : node),
      key,
      settings.path
    );
  };

  const readNode = document.getIn(settings.readKey);

  if (isSeq(readNode)) {
    // Edit the list in place, so comments on the user's entries survive.
    readNode.items = readNode.items.filter(
      (item) => !(isScalar(item) && item.value === LEGACY_RULES_PATH)
    );
    if (
      !readNode.items.some((item) => isScalar(item) && item.value === rulesPath)
    ) {
      readNode.add(rulesPath);
    }
  } else {
    const read = nextRead(stringsAt(settings.readKey), settings, rulesPath);
    if (read) {
      document.setIn(settings.readKey, read.length === 1 ? read[0] : read);
    }
  }

  if (settings.lintKey) {
    const lint = nextLint(stringsAt(settings.lintKey), fixCommand);
    if (lint !== null) {
      document.setIn(settings.lintKey, lint);
    }
  }

  return document.toString();
};

const editJson = (source: string, key: string[], value: Strings): string =>
  applyEdits(
    source,
    modify(source, key, value, {
      formattingOptions: { insertSpaces: true, tabSize: 2 },
    })
  );

const mergeJson = (
  existing: string,
  settings: AgentSettings,
  rulesPath: string,
  fixCommand: string
): string => {
  const text = existing.trim() === "" ? "{}\n" : existing;
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, { allowTrailingComma: true });

  if (errors.length > 0 || !tree) {
    throw new Error(`Couldn't parse ${settings.path}: invalid JSON.`);
  }

  const stringsAt = (key: string[]): Strings => {
    const node = findNodeAtLocation(tree, key);
    return expectStrings(
      stringsSchema.safeParse(node ? getNodeValue(node) : undefined),
      key,
      settings.path
    );
  };

  let merged = text;
  const read = nextRead(stringsAt(settings.readKey), settings, rulesPath);
  if (read) {
    merged = editJson(merged, settings.readKey, read);
  }

  if (settings.lintKey) {
    const lint = nextLint(stringsAt(settings.lintKey), fixCommand);
    if (lint !== null) {
      merged = editJson(merged, settings.lintKey, lint);
    }
  }

  return merged === text ? existing : merged;
};

/**
 * `existing` (the settings file's text, or "" when there's none) with the
 * rules file in its list of instruction files and, when the agent takes one,
 * its lint command set to `fixCommand`. Only those keys change, through a
 * YAML or JSON editor that keeps everything else in the file as written,
 * comments included.
 */
export const mergeAgentSettings = (
  existing: string,
  settings: AgentSettings,
  rulesPath: string,
  fixCommand: string
): string =>
  settings.path.endsWith(".json")
    ? mergeJson(existing, settings, rulesPath, fixCommand)
    : mergeYaml(existing, settings, rulesPath, fixCommand);
