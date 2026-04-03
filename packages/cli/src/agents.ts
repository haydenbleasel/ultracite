import { readFile, writeFile } from "node:fs/promises";

import { agents } from "@repo/data/agents";
import type { options } from "@repo/data/options";
import { providers } from "@repo/data/providers";
import { getRules } from "@repo/data/rules";
import { dlxCommand } from "nypm";
import type { PackageManagerName } from "nypm";

import { ensureDirectory, exists } from "./utils";

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
  name.replace(/ Code$/, "").replace(/ Agent$/, "");

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
      agentIds: groupedAgents.map((agent) => agent.id as AgentId),
      displayName: isUniversal
        ? "Universal"
        : normalizeAgentName(representativeAgent.name),
      id: isUniversal ? "universal" : (representativeAgent.id as AgentId),
      path,
      promptLabel: buildPromptLabel(path, agentNames),
      representativeAgentId: representativeAgent.id as AgentId,
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

  const dlx = dlxCommand(packageManager, "");
  const rules = getRules(dlx, provider.name);
  const content = agent.config.header
    ? `${agent.config.header}\n\n${rules}`
    : rules;

  return {
    create: async () => {
      await ensureDirectory(agent.config.path);
      await writeFile(agent.config.path, content);
    },

    exists: () => exists(agent.config.path),

    update: async () => {
      await ensureDirectory(agent.config.path);
      const doesExist = await exists(agent.config.path);

      if (!(agent.config.appendMode && doesExist)) {
        await writeFile(agent.config.path, content);
        return;
      }

      const existingContents = await readFile(agent.config.path, "utf-8");

      // Check if rules are already present to avoid duplicates
      if (existingContents.includes(rules.trim())) {
        return;
      }

      await writeFile(agent.config.path, `${existingContents}\n\n${rules}`);
    },
  };
};
