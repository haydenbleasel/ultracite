import process from "node:process";

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
const CURSOR_UP = (lines: number): string => `\u001B[${lines}A`;
const CLEAR_LINE = "\r\u001B[2K";

export interface FileGroup {
  file: string;
  issues: Diagnostic[];
}

export interface SettledIssue {
  fixed: boolean;
  issue: Diagnostic;
}

export interface RendererSink {
  write: (text: string) => unknown;
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

const truncateEnd = (text: string, max: number): string => {
  if (text.length <= max) {
    return text;
  }
  return max <= 1 ? text.slice(0, max) : `${text.slice(0, max - 1)}…`;
};

export const createRenderer = (
  groups: FileGroup[],
  options: RendererOptions
): Renderer => {
  const out = options.out ?? process.stdout;
  const isTTY = options.isTTY ?? process.stdout.isTTY === true;
  const useColor = isTTY && !process.env.NO_COLOR;
  const columns = options.columns ?? process.stdout.columns ?? DEFAULT_COLUMNS;
  const frameIntervalMs = options.frameIntervalMs ?? FRAME_INTERVAL_MS;

  const pending = new Map(groups.map((group) => [group.file, group.issues]));
  let activeFile: string | null = null;
  let activeIssues: Diagnostic[] = [];
  let activeHasSummaryLine = false;
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const color = (code: string, text: string): string =>
    useColor ? `${code}${text}${RESET}` : text;

  // Every part is truncated so the whole line fits in one terminal row — a
  // wrapped line would break the cursor-up math used to rewrite the block.
  const issueLine = (
    icon: string,
    iconColor: string,
    issue: Diagnostic
  ): string => {
    const budget = columns - 2;
    let location = `${issue.file}:${issue.line}:${issue.column}`;
    let mid = `  ${issue.rule} — `;
    let { message } = issue;

    if (location.length >= budget) {
      location = truncateEnd(location, budget);
      mid = "";
      message = "";
    } else if (location.length + mid.length >= budget) {
      mid = truncateEnd(mid, budget - location.length);
      message = "";
    } else {
      const available = budget - location.length - mid.length;
      if (message.length > available) {
        message =
          available < MIN_MESSAGE_WIDTH ? "" : truncateEnd(message, available);
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

  const drawActiveBlock = (rewrite: boolean): void => {
    const summary = queuedSummary();
    const lines = activeIssues.map((issue) =>
      issueLine(SPINNER_FRAMES[frame % SPINNER_FRAMES.length], CYAN, issue)
    );

    if (summary) {
      lines.push(summary);
    }

    const previousLineCount =
      activeIssues.length + (activeHasSummaryLine ? 1 : 0);

    if (rewrite) {
      out.write(CURSOR_UP(previousLineCount));
    }

    out.write(lines.map((line) => `${CLEAR_LINE}${line}\n`).join(""));
    activeHasSummaryLine = summary !== null;
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

    activeHasSummaryLine = false;
    drawActiveBlock(false);
    timer = setInterval(() => {
      frame += 1;
      drawActiveBlock(true);
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

    const lineCount = activeIssues.length + (activeHasSummaryLine ? 1 : 0);
    out.write(CURSOR_UP(lineCount));
    out.write(
      settledLines(settled)
        .map((line) => `${CLEAR_LINE}${line}\n`)
        .join("")
    );

    // The settled block can be shorter than what was drawn (the queued-summary
    // line goes away); clear the leftover line and leave the cursor there.
    if (activeHasSummaryLine) {
      out.write(CLEAR_LINE);
    }

    if (note) {
      out.write(`${CLEAR_LINE}${color(DIM, note)}\n`);
    }

    activeFile = null;
    activeHasSummaryLine = false;
  };

  return { settleFile, startFile, stop: stopTimer };
};
