import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { intro, outro, spinner } from "@clack/prompts";

import type { FixAgent } from "../linter-args";
import { LinterExitError } from "../run-command";
import type { Linter } from "../utils";
import { agentAdapters, assertAgentAvailable } from "./agents";
import { partitionByRemaining } from "./diff";
import { getLinterAdapter } from "./linters";
import { buildPrompt, buildRetryPrompt, writeDiagnosticsFile } from "./prompt";
import { createRenderer } from "./renderer";
import type { FileGroup } from "./renderer";
import { AGENT_TIMEOUT_MS, runAgent } from "./run-agent";
import type { Diagnostic, LinterAdapter } from "./types";

const MS_PER_MINUTE = 60_000;
const STDERR_NOTE_LENGTH = 200;
const MAX_AGENT_ATTEMPTS = 3;

export interface AgentFixOptions {
  agent: FixAgent;
  files: string[];
  linter: Linter;
  passthrough: string[];
}

const groupByFile = (diagnostics: Diagnostic[]): FileGroup[] => {
  const groups = new Map<string, Diagnostic[]>();

  for (const diagnostic of diagnostics) {
    const issues = groups.get(diagnostic.file);

    if (issues) {
      issues.push(diagnostic);
      continue;
    }

    groups.set(diagnostic.file, [diagnostic]);
  }

  return [...groups.entries()].map(([file, issues]) => ({ file, issues }));
};

const buildFailureNote = (
  agentLabel: string,
  result: { stderr: string; timedOut: boolean }
): string => {
  if (result.timedOut) {
    return `${agentLabel} timed out after ${AGENT_TIMEOUT_MS / MS_PER_MINUTE} minutes.`;
  }

  const stderrTail = result.stderr.trim().slice(-STDERR_NOTE_LENGTH);
  return `${agentLabel} exited with an error${stderrTail ? `: ${stderrTail}` : "."}`;
};

const verifySafely = (
  adapter: LinterAdapter,
  file: string,
  passthrough: string[]
): { error: string | null; remaining: Diagnostic[] | null } => {
  try {
    const allRemaining = adapter.verify(file, passthrough);
    // Single-file verify runs can still surface diagnostics for other files
    // (e.g. project-level rules); only this file's results matter here.
    return {
      error: null,
      remaining: allRemaining.filter((diagnostic) => diagnostic.file === file),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      remaining: null,
    };
  }
};

interface FileFixContext {
  agentAdapter: (typeof agentAdapters)[FixAgent];
  linterAdapter: LinterAdapter;
  passthrough: string[];
  renderer: ReturnType<typeof createRenderer>;
  tempDir: string;
}

interface FileFixAttemptResult {
  agentResult: Awaited<ReturnType<typeof runAgent>>;
  attempts: number;
  verified: ReturnType<typeof verifySafely>;
}

/**
 * Runs the agent, re-lints, and — when diagnostics survive — retries with a
 * prompt that carries the file's fresh diagnostics and calls out that the
 * previous approach failed. This is what stops a plausible-but-superficial
 * edit (e.g. re-spelling an escape sequence) from ending the run.
 */
const attemptFileFix = async (
  context: FileFixContext,
  group: FileGroup,
  issues: Diagnostic[],
  attempt: number
): Promise<FileFixAttemptResult> => {
  const { agentAdapter, linterAdapter, passthrough, tempDir } = context;

  const jsonPath = writeDiagnosticsFile(tempDir, group.file, issues);
  const prompt =
    attempt === 1
      ? buildPrompt(group.file, issues, jsonPath)
      : buildRetryPrompt(group.file, issues, jsonPath, attempt);
  const agentResult = await runAgent(agentAdapter, prompt);

  // Verify even after an agent failure — a timed-out agent may still have
  // fixed some issues, and the re-lint is what the icons must reflect.
  const verified = verifySafely(linterAdapter, group.file, passthrough);

  const { remaining } = verified;
  const canRetry = !agentResult.timedOut && attempt < MAX_AGENT_ATTEMPTS;

  if (remaining !== null && remaining.length > 0 && canRetry) {
    return attemptFileFix(context, group, remaining, attempt + 1);
  }

  return { agentResult, attempts: attempt, verified };
};

const fixFileGroup = async (
  context: FileFixContext,
  group: FileGroup
): Promise<{ fixed: number; remaining: number }> => {
  const { renderer } = context;

  renderer.startFile(group.file);

  const { agentResult, attempts, verified } = await attemptFileFix(
    context,
    group,
    group.issues,
    1
  );
  const notes: string[] = [];

  if (!agentResult.ok) {
    notes.push(buildFailureNote(context.agentAdapter.label, agentResult));
  }

  if (attempts > 1) {
    notes.push(`Took ${attempts} attempts.`);
  }

  if (verified.remaining === null) {
    notes.push(`Verification failed: ${verified.error}`);
    renderer.settleFile(
      group.file,
      group.issues.map((issue) => ({ fixed: false, issue })),
      notes.join(" ")
    );
    return { fixed: 0, remaining: group.issues.length };
  }

  const { cleared, introduced, still } = partitionByRemaining(
    group.issues,
    verified.remaining
  );

  if (introduced > 0) {
    notes.push(
      `${introduced} new issue${introduced === 1 ? "" : "s"} reported after the fix.`
    );
  }

  renderer.settleFile(
    group.file,
    group.issues.map((issue) => ({
      fixed: cleared.includes(issue),
      issue,
    })),
    notes.length > 0 ? notes.join(" ") : undefined
  );

  return { fixed: cleared.length, remaining: still.length + introduced };
};

export const runAgentFix = async ({
  agent,
  files,
  linter,
  passthrough,
}: AgentFixOptions): Promise<void> => {
  const agentAdapter = agentAdapters[agent];
  const linterAdapter = getLinterAdapter(linter);

  assertAgentAvailable(agentAdapter);

  intro(`ultracite fix — powered by ${agentAdapter.label}`);

  const autofixSpinner = spinner();
  autofixSpinner.start("Running autofix…");

  let diagnostics: Diagnostic[];

  try {
    diagnostics = linterAdapter.fixAndCollect(files, passthrough);
  } catch (error) {
    autofixSpinner.stop("Autofix failed.");
    throw error;
  }

  if (diagnostics.length === 0) {
    autofixSpinner.stop("Autofix complete.");
    outro(`No issues remaining — nothing for ${agentAdapter.label} to do.`);
    return;
  }

  const groups = groupByFile(diagnostics);
  autofixSpinner.stop(
    `Autofix complete. ${diagnostics.length} issue${diagnostics.length === 1 ? "" : "s"} in ${groups.length} file${groups.length === 1 ? "" : "s"} left for ${agentAdapter.label}.`
  );

  const tempDir = mkdtempSync(path.join(tmpdir(), "ultracite-"));
  const renderer = createRenderer(groups, { agentLabel: agentAdapter.label });
  const context: FileFixContext = {
    agentAdapter,
    linterAdapter,
    passthrough,
    renderer,
    tempDir,
  };
  const totals = { fixed: 0, remaining: 0 };

  // Files are fixed strictly one at a time — concurrent agents could race on
  // shared context — hence recursion over the queue instead of Promise.all.
  const fixQueue = async (queue: FileGroup[]): Promise<void> => {
    const [group, ...rest] = queue;

    if (!group) {
      return;
    }

    const result = await fixFileGroup(context, group);
    totals.fixed += result.fixed;
    totals.remaining += result.remaining;
    await fixQueue(rest);
  };

  try {
    await fixQueue(groups);
  } finally {
    renderer.stop();
    rmSync(tempDir, { force: true, recursive: true });
  }

  outro(
    `Fixed ${totals.fixed} of ${diagnostics.length} issue${diagnostics.length === 1 ? "" : "s"} with ${agentAdapter.label}.`
  );

  if (totals.remaining > 0) {
    throw new LinterExitError(linterAdapter.name, 1);
  }
};
