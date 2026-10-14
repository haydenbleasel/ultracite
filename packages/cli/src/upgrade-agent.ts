import process from "node:process";

import { spinner } from "@clack/prompts";

import { agentAdapters, assertAgentAvailable } from "./agent-fix/agents";
import { AGENT_TIMEOUT_MS, runAgent } from "./agent-fix/run-agent";
import type { FixAgent } from "./linter-args";
import { findPendingGuides } from "./upgrade-guides";
import type { UpgradeGuide } from "./upgrade-guides";
import type { Linter } from "./utils";

const MS_PER_MINUTE = 60_000;
const STDERR_NOTE_LENGTH = 200;

export interface UpgradePromptContext {
  guides: UpgradeGuide[];
  linter: Linter;
  /** The Ultracite version now installed. */
  version: string;
}

export const buildUpgradePrompt = ({
  guides,
  linter,
  version,
}: UpgradePromptContext): string =>
  [
    `Ultracite has been upgraded to ${version} and its ${linter} toolchain reinstalled. This project's configuration still has the older setup the guides below describe. Bring it up to date by following each guide, oldest first.`,
    "",
    `Project: ${process.cwd()}`,
    "",
    "Rules:",
    "- Change only what the guides describe: linter configs, package.json scripts, Git hook and lint-staged configs, CI workflows, and any comments a guide names. Don't change other code.",
    "- Keep everything else in each file as it is, including the project's own rules and settings.",
    "- Don't move the project to a different linter, and don't add or remove presets beyond what a guide says.",
    "- Don't install or remove packages; that's done.",
    "- When you finish, the project should match the newest guide.",
    ...guides.flatMap((guide) => [
      "",
      `--- ${guide.path} ---`,
      "",
      guide.content.trim(),
    ]),
  ].join("\n");

export interface UpgradeMigrationResult {
  /** A short note on why the agent's run failed, when it did. */
  failure: string | null;
  /** Guides whose changes are still missing after the agent's run. */
  remaining: UpgradeGuide[];
}

/**
 * Hands the pending guides to the coding agent, then checks the project
 * again, so what counts as migrated is what the project now looks like.
 */
export const migrateWithAgent = async (
  agent: FixAgent,
  context: UpgradePromptContext
): Promise<UpgradeMigrationResult> => {
  const adapter = agentAdapters[agent];
  assertAgentAvailable(adapter);

  const s = spinner();

  const versions = context.guides
    .map((guide) => `v${guide.version}`)
    .join(", ");

  s.start(`${adapter.label} is applying the ${versions} upgrade guides...`);

  const result = await runAgent(adapter, buildUpgradePrompt(context));
  const remaining = findPendingGuides();

  if (!result.ok) {
    const note = result.timedOut
      ? `${adapter.label} timed out after ${AGENT_TIMEOUT_MS / MS_PER_MINUTE} minutes.`
      : `${adapter.label} exited with an error: ${result.stderr.trim().slice(-STDERR_NOTE_LENGTH)}`;

    s.stop(note);

    return { failure: note, remaining };
  }

  s.stop(
    remaining.length === 0
      ? `${adapter.label} brought the configuration up to date.`
      : `${adapter.label} finished, but some changes are still missing.`
  );

  return { failure: null, remaining };
};
