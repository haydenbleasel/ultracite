import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import type { PackageManagerName } from "nypm";

import { mergeAgentSettings } from "./agent-settings";
import { agents } from "./data/agents";
import type { Agent } from "./data/agents";
import type { options } from "./data/options";
import { providers } from "./data/providers";
import { getRules } from "./data/rules";
import { localBinCommand } from "./integrations/project-command";
import { exists, writeProjectFile } from "./utils";

type AgentId = (typeof options.agents)[number];

/** Every agent reads Ultracite's rules from here. */
export const AGENTS_FILE = "AGENTS.md";

/** One option in init's agent prompt. */
export interface AgentChoice {
  id: AgentId | "universal";
  promptLabel: string;
}

// Agents that need a step beyond AGENTS.md to see the rules.
const needsSetup = (agent: Agent): boolean =>
  Boolean(agent.imports || agent.rulesCopy || agent.settings);

const describeSetup = (agent: Agent): string => {
  if (agent.settings) {
    return `creates ${AGENTS_FILE} and ${agent.settings.path}`;
  }
  if (agent.rulesCopy) {
    return `creates ${AGENTS_FILE} and ${agent.rulesCopy}`;
  }
  return `creates ${AGENTS_FILE}, imported from your ${agent.imports?.[0] ?? "instructions file"}`;
};

/**
 * init's agent prompt: AGENTS.md, which covers every agent on its own, and
 * the agents that need one more file to read it.
 */
export const getAgentChoices = (): AgentChoice[] => {
  const covered = agents
    .filter((agent) => !needsSetup(agent))
    .slice(0, 3)
    .map((agent) => agent.name);

  return [
    {
      id: "universal",
      promptLabel: `Universal (creates ${AGENTS_FILE} for ${covered.join(", ")}, and more)`,
    },
    ...agents.filter(needsSetup).map((agent) => ({
      id: agent.id,
      promptLabel: `${agent.name} (${describeSetup(agent)})`,
    })),
  ];
};

const RULES_HEADER = "# Ultracite Code Standards";
// The last line of every rules block written since the header was
// introduced, whatever the linter and package manager.
const RULES_FOOTER_RE =
  /^Most formatting and common issues are automatically fixed by .+ before committing to ensure compliance\.$/u;
const HEADING_RE = /^# /u;

// Where the rules block starting at `start` ends (inclusive): its closing
// line, or else the line before the next top-level heading or the file end.
const findBlockEnd = (lines: string[], start: number): number => {
  for (let index = start + 1; index < lines.length; index += 1) {
    if (RULES_FOOTER_RE.test(lines[index])) {
      return index;
    }

    if (lines[index] === RULES_HEADER || HEADING_RE.test(lines[index])) {
      return index - 1;
    }
  }

  return lines.length - 1;
};

/**
 * `existing` with its Ultracite rules block replaced by `rules`, in place,
 * and any further copies removed (earlier versions appended a new block
 * whenever the linter, package manager or rules text changed). Returns null
 * when the file has no rules block. Line endings follow the file's own.
 */
export const replaceRulesBlock = (
  existing: string,
  rules: string
): string | null => {
  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  const lines = existing.split(/\r?\n/u);
  const blocks: [number, number][] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === RULES_HEADER) {
      const end = findBlockEnd(lines, index);
      blocks.push([index, end]);
      index = end;
    }
  }

  if (blocks.length === 0) {
    return null;
  }

  const output: string[] = [];
  let cursor = 0;

  for (const [position, [start, end]] of blocks.entries()) {
    output.push(...lines.slice(cursor, start));

    if (position === 0) {
      output.push(...rules.trimEnd().split("\n"));
    } else {
      // Drop the blank lines that separated the duplicate from what precedes it.
      while (output.at(-1) === "") {
        output.pop();
      }
    }

    cursor = end + 1;
  }

  const rest = lines.slice(cursor);

  // Keep a blank line between the rules and whatever follows them.
  if (rest.length > 0 && rest[0] !== "" && output.length > 0) {
    output.push("");
  }

  output.push(...rest);

  return output.join(eol);
};

const withLineEndings = (text: string, eol: string): string =>
  eol === "\n" ? text : text.replaceAll(/\r?\n/gu, eol);

const eolOf = (text: string): string => (text.includes("\r\n") ? "\r\n" : "\n");

// Adds Ultracite's block to `filePath`, or replaces the one it has, below the
// file's own content. Returns whether the file is new.
const upsertRulesBlock = async (
  filePath: string,
  rules: string
): Promise<boolean> => {
  if (!exists(filePath)) {
    await writeProjectFile(filePath, rules);
    return true;
  }

  const existing = await readFile(filePath, "utf-8");
  const replaced = replaceRulesBlock(existing, rules);

  if (replaced !== null) {
    if (replaced !== existing) {
      await writeProjectFile(filePath, replaced);
    }
    return false;
  }

  const eol = eolOf(existing);
  const kept = existing.trimEnd();
  await writeProjectFile(
    filePath,
    kept === ""
      ? withLineEndings(rules, eol)
      : `${kept}${eol}${eol}${withLineEndings(rules, eol)}`
  );
  return false;
};

const FRONTMATTER_ONLY_RE = /^---\r?\n[\s\S]*?\r?\n---$/u;

const holdsRules = async (filePath: string): Promise<boolean> => {
  if (!exists(filePath)) {
    return false;
  }
  const contents = await readFile(filePath, "utf-8");
  return contents.split(/\r?\n/u).includes(RULES_HEADER);
};

// Takes Ultracite's block out of a file an earlier version wrote the rules
// into, and removes the file when nothing else is left (Firebender's rule
// file keeps only the frontmatter we wrote).
const removeLegacyRules = async (filePath: string): Promise<boolean> => {
  if (!exists(filePath)) {
    return false;
  }

  const existing = await readFile(filePath, "utf-8");
  const remaining = replaceRulesBlock(existing, "");

  if (remaining === null) {
    return false;
  }

  const rest = remaining.trim();
  const nothingLeft = rest === "" || FRONTMATTER_ONLY_RE.test(rest);

  await (nothingLeft
    ? rm(filePath, { force: true })
    : writeProjectFile(filePath, `${rest}${eolOf(existing)}`));
  return true;
};

// Adds an `@AGENTS.md` import to the first of the agent's own instructions
// files that exists, unless it already has one. Returns the file it changed.
const importAgentsFile = async (agent: Agent): Promise<string | null> => {
  const filePath = agent.imports?.find((candidate) => exists(candidate));

  if (!filePath) {
    return null;
  }

  const target = path.posix.relative(path.posix.dirname(filePath), AGENTS_FILE);
  const line = `@${target}`;
  const existing = await readFile(filePath, "utf-8");
  const imported = existing
    .split(/\r?\n/u)
    .some((text) => [line, `@./${target}`].includes(text.trim()));

  if (imported) {
    return null;
  }

  const eol = eolOf(existing);
  const kept = existing.trimEnd();
  await writeProjectFile(
    filePath,
    kept === "" ? `${line}${eol}` : `${kept}${eol}${eol}${line}${eol}`
  );
  return filePath;
};

// What an agent needs beyond AGENTS.md, in order: its old rules file
// cleaned up first, so the import can land in what's left of it. Returns the
// files it changed.
const setUpAgent = async (
  agent: Agent,
  rules: string,
  fixCommand: string
): Promise<string[]> => {
  const legacy = agent.legacyRules ?? [];
  const cleaned = await Promise.all(legacy.map(removeLegacyRules));
  const files = legacy.filter((_, index) => cleaned[index]);

  if (agent.rulesCopy) {
    await upsertRulesBlock(agent.rulesCopy, rules);
    files.push(agent.rulesCopy);
  }

  if (agent.settings) {
    const existing = exists(agent.settings.path)
      ? await readFile(agent.settings.path, "utf-8")
      : "";
    const merged = mergeAgentSettings(
      existing,
      agent.settings,
      AGENTS_FILE,
      fixCommand
    );
    if (merged !== existing) {
      await writeProjectFile(agent.settings.path, merged);
      files.push(agent.settings.path);
    }
  }

  const imported = await importAgentsFile(agent);
  if (imported) {
    files.push(imported);
  }

  return files;
};

/** What `writeAgentFiles` did. */
export interface AgentFilesResult {
  /** Whether AGENTS.md is new. */
  created: boolean;
  /** Other files it created or changed. */
  files: string[];
}

/**
 * Writes the rules to AGENTS.md, then gives each selected agent what it needs
 * to read them: an import, a copy, or a settings file. Agents an earlier
 * version set up (their old rules file still holds Ultracite's block) are
 * moved over too, whether or not they were selected, so the old file stops
 * shadowing AGENTS.md.
 */
export const writeAgentFiles = async (
  selection: readonly (AgentId | "universal")[],
  packageManager: PackageManagerName,
  linter: (typeof options.linters)[number]
): Promise<AgentFilesResult> => {
  const provider = providers.find((p) => p.id === linter);

  if (!provider) {
    throw new Error(`Provider "${linter}" not found`);
  }

  // The rules tell agents to run the project's installed CLI; a dlx runner
  // fetches the latest release, and `yarn dlx` doesn't exist in Yarn 1.
  const ultracite = localBinCommand(packageManager, "ultracite");
  const rules = getRules(ultracite, provider.name);
  const created = await upsertRulesBlock(AGENTS_FILE, rules);

  const legacy = await Promise.all(
    agents.map(async (agent) => {
      const found = await Promise.all(
        (agent.legacyRules ?? []).map((file) => holdsRules(file))
      );
      return found.includes(true);
    })
  );
  const toSetUp = agents.filter(
    (agent, index) => selection.includes(agent.id) || legacy[index]
  );

  // No two agents touch the same file, so they're set up side by side.
  const touched = await Promise.all(
    toSetUp.map((agent) => setUpAgent(agent, rules, `${ultracite} fix`))
  );

  return { created, files: [...new Set(touched.flat())] };
};
