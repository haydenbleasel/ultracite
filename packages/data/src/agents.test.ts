import { describe, expect, test } from "bun:test";

import {
  agents,
  getAgentSetupFacts,
  getDefaultAgentHookContent,
  getDefaultAgentRulesContent,
} from "./agents";

describe("agents content", () => {
  test("every agent includes the required SEO content fields", () => {
    for (const agent of agents) {
      expect(agent.category.length).toBeGreaterThan(0);
      expect(agent.content.intro.length).toBeGreaterThan(0);
      expect(agent.content.metaDescription.length).toBeGreaterThan(0);
      expect(agent.content.useCases.length).toBeGreaterThanOrEqual(3);
      expect(agent.content.useCases.length).toBeLessThanOrEqual(4);
      expect(agent.content.differentiators).toHaveLength(3);

      for (const useCase of agent.content.useCases) {
        expect(useCase.title.length).toBeGreaterThan(0);
        expect(useCase.description.length).toBeGreaterThan(0);
      }

      for (const differentiator of agent.content.differentiators) {
        expect(differentiator.title.length).toBeGreaterThan(0);
        expect(differentiator.description.length).toBeGreaterThan(0);
        expect(differentiator.icon.length).toBeGreaterThan(0);
      }
    }
  });

  test("hook-related setup facts only appear for agents that support hooks", () => {
    for (const agent of agents) {
      const facts = getAgentSetupFacts(agent);
      const hookContent = getDefaultAgentHookContent(agent);

      expect(facts.hookSupport).toBe(Boolean(agent.hooks));
      expect(Boolean(facts.hookPath)).toBe(Boolean(agent.hooks));
      expect(Boolean(hookContent)).toBe(Boolean(agent.hooks));
    }
  });

  test("default rules preview preserves agent-specific headers", () => {
    const copilot = agents.find((agent) => agent.id === "copilot");
    const codex = agents.find((agent) => agent.id === "codex");

    expect(copilot).toBeDefined();
    expect(codex).toBeDefined();

    expect(getDefaultAgentRulesContent(copilot!)).toContain("applyTo:");
    expect(getDefaultAgentRulesContent(codex!)).not.toContain("applyTo:");
  });
});
