import { readFile } from "node:fs/promises";

import type { PackageManagerName } from "nypm";

import { agents } from "./data/agents";
import type { options } from "./data/options";
import { providers } from "./data/providers";
import { getRules } from "./data/rules";
import { localBinCommand } from "./integrations/project-command";
import { exists, writeProjectFile } from "./utils";

type AgentId = (typeof options.agents)[number];

export interface AgentFileTarget {
  agentIds: AgentId[];
  displayName: string;
  id: AgentId | "universal";
  path: string;
  promptLabel: string;
  representativeAgentId: AgentId;
}

const normalizeAgentName = (name: string) =>
  name.replace(/ Code$/u, "").replace(/ Agent$/u, "");

const buildPromptLabel = (path: string, agentNames: string[]) => {
  if (path === "AGENTS.md" && agentNames.length > 1) {
    const previewNames = agentNames.slice(0, 3);
    const suffix = agentNames.length > previewNames.length ? ", and more" : "";
    return `Universal (creates ${path} for ${previewNames.join(", ")}${suffix})`;
  }

  const [agentName] = agentNames;

  return `${agentName} (creates ${path})`;
};

export const getAgentFileTargets = (): AgentFileTarget[] => {
  const groupedTargets = new Map<string, typeof agents>();

  for (const agent of agents) {
    const existingGroup = groupedTargets.get(agent.config.path) ?? [];
    existingGroup.push(agent);
    groupedTargets.set(agent.config.path, existingGroup);
  }

  const targets = [...groupedTargets.entries()].map(([path, groupedAgents]) => {
    const [representativeAgent] = groupedAgents;
    const agentNames = groupedAgents.map((agent) =>
      normalizeAgentName(agent.name)
    );
    const isUniversal = path === "AGENTS.md" && groupedAgents.length > 1;

    return {
      agentIds: groupedAgents.map((agent) => agent.id),
      displayName: isUniversal
        ? "Universal"
        : normalizeAgentName(representativeAgent.name),
      id: isUniversal ? "universal" : representativeAgent.id,
      path,
      promptLabel: buildPromptLabel(path, agentNames),
      representativeAgentId: representativeAgent.id,
    };
  });

  return targets.toSorted((left, right) => {
    if (left.path === "AGENTS.md") {
      return -1;
    }

    if (right.path === "AGENTS.md") {
      return 1;
    }

    return 0;
  });
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

export const createAgents = (
  name: (typeof options.agents)[number],
  packageManager: PackageManagerName,
  linter: (typeof options.linters)[number]
) => {
  const agent = agents.find((a) => a.id === name);

  if (!agent) {
    throw new Error(`Agent "${name}" not found`);
  }

  const provider = providers.find((p) => p.id === linter);

  if (!provider) {
    throw new Error(`Provider "${linter}" not found`);
  }

  // The rules tell agents to run the project's installed CLI; a dlx runner
  // fetches the latest release, and `yarn dlx` doesn't exist in Yarn 1.
  const rules = getRules(
    localBinCommand(packageManager, "ultracite"),
    provider.name
  );
  const content = agent.config.header
    ? `${agent.config.header}\n\n${rules}`
    : rules;

  // An earlier version wrote the rules as Markdown into a file that must hold
  // something else (Firebender's firebender.json must be JSON). Reset it to an
  // empty config if it still holds exactly what we wrote.
  const repairSupersededFile = async (): Promise<void> => {
    const superseded = agent.config.supersedes;

    if (!(superseded && exists(superseded.path))) {
      return;
    }

    const contents = await readFile(superseded.path, "utf-8");

    if (contents.trimStart().startsWith(RULES_HEADER)) {
      await writeProjectFile(superseded.path, superseded.emptyContent);
    }
  };

  return {
    create: async () => {
      await writeProjectFile(agent.config.path, content);
      await repairSupersededFile();
    },

    exists: () => exists(agent.config.path),

    update: async () => {
      const doesExist = exists(agent.config.path);

      if (!(agent.config.appendMode && doesExist)) {
        await writeProjectFile(agent.config.path, content);
        await repairSupersededFile();
        return;
      }

      const existingContents = await readFile(agent.config.path, "utf-8");
      const eol = existingContents.includes("\r\n") ? "\r\n" : "\n";
      const replaced = replaceRulesBlock(existingContents, rules);

      if (replaced !== null) {
        if (replaced !== existingContents) {
          await writeProjectFile(agent.config.path, replaced);
        }
        return;
      }

      const kept = existingContents.trimEnd();
      await writeProjectFile(
        agent.config.path,
        kept === ""
          ? withLineEndings(rules, eol)
          : `${kept}${eol}${eol}${withLineEndings(rules, eol)}`
      );
    },
  };
};
