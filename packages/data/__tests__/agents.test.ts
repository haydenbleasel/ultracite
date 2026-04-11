import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

const decoder = new TextDecoder();
const monorepoRoot = resolve(import.meta.dir, "../../..");

interface AgentSummary {
  category: string;
  differentiators: {
    descriptionLength: number;
    iconLength: number;
    titleLength: number;
  }[];
  facts: {
    hookPath?: string;
    hookSupport: boolean;
  };
  hookContentAvailable: boolean;
  id: string;
  introLength: number;
  metaDescriptionLength: number;
  rulesContainsApplyTo: boolean;
  useCases: {
    descriptionLength: number;
    titleLength: number;
  }[];
}

const loadAgentsSummary = () => {
  const result = Bun.spawnSync({
    cmd: [
      "bun",
      "-e",
      `
        import {
          agents,
          getAgentSetupFacts,
          getDefaultAgentHookContent,
          getDefaultAgentRulesContent,
        } from "./packages/data/src/agents.ts";

        const summary = agents.map((agent) => ({
          category: agent.category,
          differentiators: agent.content.differentiators.map((item) => ({
            descriptionLength: item.description.length,
            iconLength: item.icon.length,
            titleLength: item.title.length,
          })),
          facts: {
            hookPath: getAgentSetupFacts(agent).hookPath,
            hookSupport: getAgentSetupFacts(agent).hookSupport,
          },
          hookContentAvailable: Boolean(getDefaultAgentHookContent(agent)),
          id: agent.id,
          introLength: agent.content.intro.length,
          metaDescriptionLength: agent.content.metaDescription.length,
          rulesContainsApplyTo: getDefaultAgentRulesContent(agent).includes("applyTo:"),
          useCases: agent.content.useCases.map((item) => ({
            descriptionLength: item.description.length,
            titleLength: item.title.length,
          })),
        }));

        console.log(JSON.stringify(summary));
      `,
    ],
    cwd: monorepoRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  expect(result.exitCode).toBe(0);

  return JSON.parse(decoder.decode(result.stdout)) as AgentSummary[];
};

describe("agents content", () => {
  test("every agent includes the required SEO content fields", () => {
    const summary = loadAgentsSummary();

    for (const agent of summary) {
      expect(agent.category.length).toBeGreaterThan(0);
      expect(agent.introLength).toBeGreaterThan(0);
      expect(agent.metaDescriptionLength).toBeGreaterThan(0);
      expect(agent.useCases.length).toBeGreaterThanOrEqual(3);
      expect(agent.useCases.length).toBeLessThanOrEqual(4);
      expect(agent.differentiators).toHaveLength(3);

      for (const useCase of agent.useCases) {
        expect(useCase.titleLength).toBeGreaterThan(0);
        expect(useCase.descriptionLength).toBeGreaterThan(0);
      }

      for (const differentiator of agent.differentiators) {
        expect(differentiator.titleLength).toBeGreaterThan(0);
        expect(differentiator.descriptionLength).toBeGreaterThan(0);
        expect(differentiator.iconLength).toBeGreaterThan(0);
      }
    }
  });

  test("hook-related setup facts only appear for agents that support hooks", () => {
    const summary = loadAgentsSummary();

    for (const agent of summary) {
      expect(Boolean(agent.facts.hookPath)).toBe(agent.facts.hookSupport);
      expect(agent.hookContentAvailable).toBe(agent.facts.hookSupport);
    }
  });

  test("default rules preview omits frontmatter when agent config has no header", () => {
    const summary = loadAgentsSummary();
    const copilot = summary.find((agent) => agent.id === "copilot");
    const codex = summary.find((agent) => agent.id === "codex");

    expect(copilot).toBeDefined();
    expect(codex).toBeDefined();

    if (!copilot || !codex) {
      throw new Error("Expected copilot and codex fixtures to exist");
    }

    expect(copilot.rulesContainsApplyTo).toBeFalse();
    expect(codex.rulesContainsApplyTo).toBeFalse();
  });
});
