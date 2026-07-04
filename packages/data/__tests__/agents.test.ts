import { describe, expect, test } from "bun:test";
import path from "node:path";

const decoder = new TextDecoder();
const monorepoRoot = path.resolve(import.meta.dir, "../../..");

interface AgentSummary {
  facts: {
    hookPath?: string;
    hookSupport: boolean;
  };
  hookContentAvailable: boolean;
  id: string;
  rulesContainsApplyTo: boolean;
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
          facts: {
            hookPath: getAgentSetupFacts(agent).hookPath,
            hookSupport: getAgentSetupFacts(agent).hookSupport,
          },
          hookContentAvailable: Boolean(getDefaultAgentHookContent(agent)),
          id: agent.id,
          rulesContainsApplyTo: getDefaultAgentRulesContent(agent).includes("applyTo:"),
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
