import process from "node:process";

import cliTruncate from "cli-truncate";
import { createLogUpdate } from "log-update";
import stringWidth from "string-width";

import type { Diagnostic } from "./types";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 80;
const DEFAULT_COLUMNS = 80;
const MIN_MESSAGE_WIDTH = 5;

const CYAN = "\u001B[36m";
const GREEN = "\u001B[32m";
const RED = "\u001B[31m";
const DIM = "\u001B[2m";
const RESET = "\u001B[0m";

export interface FileGroup {
  file: string;
  issues: Diagnostic[];
}

export interface SettledIssue {
  fixed: boolean;
  issue: Diagnostic;
}

export interface RendererSink {
  write: (text: string) => void;
}

export interface RendererOptions {
  agentLabel: string;
  columns?: number;
  frameIntervalMs?: number;
  isTTY?: boolean;
  out?: RendererSink;
}

export interface Renderer {
  settleFile: (file: string, settled: SettledIssue[], note?: string) => void;
  startFile: (file: string) => void;
  stop: () => void;
}

const pluralize = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

export const createRenderer = (
  groups: FileGroup[],
  options: RendererOptions
): Renderer => {
  const out = options.out ?? process.stdout;
  const isTTY = options.isTTY ?? process.stdout.isTTY === true;
  const useColor = isTTY && !process.env.NO_COLOR;
  const columns = options.columns ?? process.stdout.columns ?? DEFAULT_COLUMNS;
  const frameIntervalMs = options.frameIntervalMs ?? FRAME_INTERVAL_MS;

  // log-update tracks how many lines the previous render produced and rewrites
  // exactly that block on the next call — replacing the manual cursor-up /
  // clear-line bookkeeping. defaultWidth keeps its wrap math in sync with the
  // truncation budget when the sink doesn't report a width of its own.
  // SAFETY: log-update only calls `write` and reads the stream's width, which
  // defaultWidth backfills when the sink is not a real terminal stream.
  const logUpdate = createLogUpdate(out as NodeJS.WriteStream, {
    defaultWidth: columns,
    showCursor: true,
  });

  const pending = new Map(groups.map((group) => [group.file, group.issues]));
  let activeFile: string | null = null;
  let activeIssues: Diagnostic[] = [];
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const color = (code: string, text: string): string =>
    useColor ? `${code}${text}${RESET}` : text;

  // Every part is truncated so the whole line fits in one terminal row — a
  // wrapped line would double-count against log-update's block height. Widths
  // are measured with string-width, so emoji and CJK text in lint messages
  // can't overflow the budget the way code-unit counts would.
  const issueLine = (
    icon: string,
    iconColor: string,
    issue: Diagnostic
  ): string => {
    const budget = columns - 2;
    let location = `${issue.file}:${issue.line}:${issue.column}`;
    let mid = `  ${issue.rule} — `;
    let { message } = issue;

    const locationWidth = stringWidth(location);

    if (locationWidth >= budget) {
      location = cliTruncate(location, budget);
      mid = "";
      message = "";
    } else if (locationWidth + stringWidth(mid) >= budget) {
      mid = cliTruncate(mid, budget - locationWidth);
      message = "";
    } else {
      const available = budget - locationWidth - stringWidth(mid);
      if (stringWidth(message) > available) {
        message =
          available < MIN_MESSAGE_WIDTH ? "" : cliTruncate(message, available);
      }
    }

    return `${color(iconColor, icon)} ${color(DIM, location)}${mid}${message}`;
  };

  const queuedSummary = (): string | null => {
    let queuedIssues = 0;
    let queuedFiles = 0;

    for (const [file, issues] of pending) {
      if (file === activeFile) {
        continue;
      }
      queuedFiles += 1;
      queuedIssues += issues.length;
    }

    if (queuedFiles === 0) {
      return null;
    }

    return color(
      DIM,
      `… ${pluralize(queuedIssues, "more issue")} in ${pluralize(queuedFiles, "file")}`
    );
  };

  const drawActiveBlock = (): void => {
    const lines = activeIssues.map((issue) =>
      issueLine(SPINNER_FRAMES[frame % SPINNER_FRAMES.length], CYAN, issue)
    );
    const summary = queuedSummary();

    if (summary) {
      lines.push(summary);
    }

    logUpdate(lines.join("\n"));
  };

  const stopTimer = (): void => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startFile = (file: string): void => {
    activeFile = file;
    activeIssues = pending.get(file) ?? [];

    if (!isTTY) {
      out.write(
        `Fixing ${file} (${pluralize(activeIssues.length, "issue")}) with ${options.agentLabel}…\n`
      );
      return;
    }

    drawActiveBlock();
    timer = setInterval(() => {
      frame += 1;
      drawActiveBlock();
    }, frameIntervalMs);
  };

  const settledLines = (settled: SettledIssue[]): string[] =>
    settled.map(({ fixed, issue }) =>
      issueLine(fixed ? "✓" : "✗", fixed ? GREEN : RED, issue)
    );

  const settleFile = (
    file: string,
    settled: SettledIssue[],
    note?: string
  ): void => {
    pending.delete(file);

    if (!isTTY) {
      for (const line of settledLines(settled)) {
        out.write(`  ${line}\n`);
      }
      if (note) {
        out.write(`  ${note}\n`);
      }
      activeFile = null;
      return;
    }

    stopTimer();

    const lines = settledLines(settled);

    if (note) {
      lines.push(color(DIM, note));
    }

    logUpdate(lines.join("\n"));
    // Persist the settled block so the next file's spinner renders below it
    // instead of overwriting it.
    logUpdate.done();

    activeFile = null;
  };

  return { settleFile, startFile, stop: stopTimer };
};
