import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { intro, outro, spinner } from "@clack/prompts";

import type { FixAgent } from "../linter-args";
import { LinterExitError } from "../run-command";
import type { Linter } from "../utils";
import { agentAdapters, assertAgentAvailable } from "./agents";
import { partitionByRemaining } from "./diff";
import { getLinterAdapter } from "./linters";
import {
  buildPrompt,
  buildRetryPrompt,
  parseLeftForReview,
  retryIssueOrder,
  writeDiagnosticsFile,
} from "./prompt";
import type { LeftForReview, RetryIssues } from "./prompt";
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

  // Linters print files in the order their threads finish, so the same
  // project could have its fix made in a different file on each run.
  return [...groups.entries()]
    .map(([file, issues]) => ({ file, issues }))
    .toSorted((a, b) => a.file.localeCompare(b.file));
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
) => {
  // A linter can report a missing file as a clean run (Biome's I/O error
  // names it by absolute path, so the filter below drops it).
  if (!existsSync(file)) {
    return { error: "the file no longer exists.", remaining: null };
  }

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
  /** What the agent left for a person, one entry per attempt that left any. */
  leftForReview: LeftForReview[];
  verified: ReturnType<typeof verifySafely>;
}

interface AttemptInput {
  attempt: number;
  /** The issues handed to the agent, in the order the prompt numbers them. */
  issues: Diagnostic[];
  leftForReview: LeftForReview[];
  /** How the issues relate to the previous attempt's; absent on the first. */
  retry?: RetryIssues;
}

/**
 * Splits what's still reported against what the previous attempt was given,
 * for the retry prompt. A file that no longer parses runs no rules, so its
 * issues vanish without being fixed: every diagnostic then counts as still
 * reported, rather than as new problems after a successful edit.
 */
const toRetryIssues = (
  previous: Diagnostic[],
  remaining: Diagnostic[]
): RetryIssues => {
  if (remaining.some((diagnostic) => diagnostic.fatal)) {
    return { introduced: [], still: remaining };
  }

  const { introduced, stillReported } = partitionByRemaining(
    previous,
    remaining
  );

  return { introduced, still: stillReported };
};

/**
 * Runs the agent, re-lints, and — when diagnostics survive — retries with a
 * prompt that carries the file's fresh diagnostics and says what the previous
 * edit did. An issue that's still reported calls for a different approach,
 * which is what stops a plausible-but-superficial edit (e.g. re-spelling an
 * escape sequence) from ending the run. A new one calls for finishing the fix.
 * An issue the agent left for a person isn't retried.
 */
const attemptFileFix = async (
  context: FileFixContext,
  group: FileGroup,
  input: AttemptInput
): Promise<FileFixAttemptResult> => {
  const { agentAdapter, linterAdapter, passthrough, tempDir } = context;
  const { attempt, issues, retry } = input;

  const jsonPath = writeDiagnosticsFile(tempDir, group.file, issues);

  const prompt = retry
    ? buildRetryPrompt(group.file, retry, jsonPath, attempt)
    : buildPrompt(group.file, issues, jsonPath);

  const agentResult = await runAgent(agentAdapter, prompt);
  const left = parseLeftForReview(agentResult.output, issues);

  const leftForReview = left
    ? [...input.leftForReview, left]
    : input.leftForReview;

  // Verify even after an agent failure — a timed-out agent may still have
  // fixed some issues, and the re-lint is what the icons must reflect.
  const verified = verifySafely(linterAdapter, group.file, passthrough);
  const result = { agentResult, attempts: attempt, leftForReview, verified };

  if (
    verified.remaining === null ||
    agentResult.timedOut ||
    attempt >= MAX_AGENT_ATTEMPTS
  ) {
    return result;
  }

  const { introduced: unresolved } = partitionByRemaining(
    leftForReview.flatMap((entry) => entry.issues),
    verified.remaining
  );

  if (unresolved.length === 0) {
    return result;
  }

  const nextRetry = toRetryIssues(issues, unresolved);

  return attemptFileFix(context, group, {
    attempt: attempt + 1,
    issues: retryIssueOrder(nextRetry),
    leftForReview,
    retry: nextRetry,
  });
};

const describeLeftForReview = (
  agentLabel: string,
  { explanation, issues }: LeftForReview
): string => {
  const summary = `${agentLabel} left ${issues.length} issue${issues.length === 1 ? "" : "s"} for you to decide`;

  return explanation ? `${summary}:\n${explanation}` : `${summary}.`;
};

interface FileFixInput {
  /** Issues an earlier file's fix already cleared, shown as fixed. */
  clearedEarlier: Diagnostic[];
  /** The issues handed to the agent. */
  issues: Diagnostic[];
}

const fixFileGroup = async (
  context: FileFixContext,
  group: FileGroup,
  input?: FileFixInput
): Promise<{ fixed: number; remaining: number }> => {
  const { renderer } = context;
  const clearedEarlier = input?.clearedEarlier ?? [];
  const issues = input?.issues ?? group.issues;

  renderer.startFile(group.file);

  const { agentResult, attempts, leftForReview, verified } =
    await attemptFileFix(context, group, {
      attempt: 1,
      issues,
      leftForReview: [],
    });

  const notes: string[] = [];

  if (clearedEarlier.length > 0) {
    notes.push(
      `${clearedEarlier.length} cleared by an earlier file's fix before ${context.agentAdapter.label} ran.`
    );
  }

  if (!agentResult.ok) {
    notes.push(buildFailureNote(context.agentAdapter.label, agentResult));
  }

  if (attempts > 1) {
    notes.push(`Took ${attempts} attempts.`);
  }

  const settle = (fixed: (issue: Diagnostic) => boolean): void => {
    // The agent's explanations go on lines of their own, after the notes.
    const note = [
      notes.join(" "),
      ...leftForReview.map((entry) =>
        describeLeftForReview(context.agentAdapter.label, entry)
      ),
    ]
      .filter((part) => part.length > 0)
      .join("\n");

    renderer.settleFile(
      group.file,
      [
        ...clearedEarlier.map((issue) => ({ fixed: true, issue })),
        ...issues.map((issue) => ({ fixed: fixed(issue), issue })),
      ],
      note || undefined
    );
  };

  if (verified.remaining === null) {
    notes.push(`Verification failed: ${verified.error}`);
    settle(() => false);

    return { fixed: clearedEarlier.length, remaining: issues.length };
  }

  // No rule runs on a file that doesn't parse, so its issues vanish from the
  // report without having been fixed.
  const parseError = verified.remaining.find((diagnostic) => diagnostic.fatal);

  if (parseError) {
    notes.push(
      `The file no longer parses (line ${parseError.line}: ${parseError.message}).`
    );
    settle(() => false);

    return {
      fixed: clearedEarlier.length,
      remaining: Math.max(issues.length, verified.remaining.length),
    };
  }

  const { cleared, introduced, still } = partitionByRemaining(
    issues,
    verified.remaining
  );

  if (introduced.length > 0) {
    notes.push(
      `${introduced.length} new issue${introduced.length === 1 ? "" : "s"} reported after the fix.`
    );
  }

  settle((issue) => cleared.includes(issue));

  return {
    fixed: clearedEarlier.length + cleared.length,
    remaining: still.length + introduced.length,
  };
};

/**
 * An earlier file's fix can change what a later file reports — breaking an
 * import cycle in one file clears it in the other — so every file after the
 * first is re-linted before it's handed over. The agent gets the file's
 * current diagnostics, and a file with none left is skipped.
 */
const refreshAndFixFileGroup = (
  context: FileFixContext,
  group: FileGroup
): Promise<{ fixed: number; remaining: number }> => {
  const refreshed = verifySafely(
    context.linterAdapter,
    group.file,
    context.passthrough
  );

  // Without a fresh report, hand over the original diagnostics.
  if (refreshed.remaining === null) {
    return fixFileGroup(context, group);
  }

  if (refreshed.remaining.length === 0) {
    context.renderer.startFile(group.file);
    context.renderer.settleFile(
      group.file,
      group.issues.map((issue) => ({ fixed: true, issue })),
      `Cleared by an earlier file's fix; ${context.agentAdapter.label} didn't run.`
    );

    return Promise.resolve({ fixed: group.issues.length, remaining: 0 });
  }

  const { cleared } = partitionByRemaining(group.issues, refreshed.remaining);

  return fixFileGroup(context, group, {
    clearedEarlier: cleared,
    issues: refreshed.remaining,
  });
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
  const fixQueue = async (queue: FileGroup[], first = true): Promise<void> => {
    const [group, ...rest] = queue;

    if (!group) {
      return;
    }

    const result = first
      ? await fixFileGroup(context, group)
      : await refreshAndFixFileGroup(context, group);

    totals.fixed += result.fixed;
    totals.remaining += result.remaining;
    await fixQueue(rest, false);
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
