import { isScalar, isSeq, parseDocument } from "yaml";
import type { Document } from "yaml";
import { z } from "zod";

import type { AgentSettings } from "./data/agents";

// Earlier versions wrote Aider's rules to this file, which nothing loaded.
const LEGACY_RULES_PATH = "ultracite.md";

// `read` and `lint-cmd` each take a string or a list of strings.
const stringsSchema = z.union([z.string(), z.array(z.string())]).nullish();
type Strings = z.infer<typeof stringsSchema>;

const mentionsUltracite = (command: string): boolean =>
  command.includes("ultracite");

const stringsAt = (document: Document, key: string, path: string): Strings => {
  const parsed = stringsSchema.safeParse(document.toJS()?.[key]);

  if (!parsed.success) {
    throw new Error(
      `Expected ${key} in ${path} to be a file name or a list of them.`
    );
  }

  return parsed.data;
};

/**
 * `existing` (the settings file's text, or "" when there's none) with the
 * rules file in its read list and, when the agent takes one, the lint command
 * set to `fixCommand`. Only those two keys change, through the YAML document,
 * so everything else in the file stays as written, comments included. A lint
 * command that isn't Ultracite's is left alone: Aider's catch-all `lint-cmd`
 * would override the user's per-language linters.
 */
export const mergeAgentSettings = (
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

  const readNode: unknown = document.get(settings.readKey);

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
    const read = stringsAt(document, settings.readKey, settings.path);
    if (read === undefined || read === null || read === LEGACY_RULES_PATH) {
      document.set(settings.readKey, rulesPath);
    } else if (read !== rulesPath) {
      document.set(settings.readKey, [read, rulesPath]);
    }
  }

  if (settings.lintKey) {
    const lint = stringsAt(document, settings.lintKey, settings.path);

    if (lint === undefined || lint === null) {
      document.set(settings.lintKey, fixCommand);
    } else if (Array.isArray(lint)) {
      const nextLint = lint.map((command) =>
        mentionsUltracite(command) ? fixCommand : command
      );
      if (JSON.stringify(lint) !== JSON.stringify(nextLint)) {
        document.set(settings.lintKey, nextLint);
      }
    } else if (mentionsUltracite(lint) && lint !== fixCommand) {
      document.set(settings.lintKey, fixCommand);
    }
  }

  return document.toString();
};
