// Agent stats from each CLI's own session log (model, effort, tokens, cost, tool calls), and
// the session-derived checks every topic records: tool calls that leave the run dir, and
// exposure to anything that could carry a solution. Shared by measure.cjs and topic modules.
//
// The session log (transcript.jsonl) is gitignored. When it isn't there, as in a fresh
// checkout, these fields are carried over from the run's committed measure.json.
"use strict";

const { existsSync, readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const lib = require("./lib.cjs");

function claudeStats(path) {
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const usageById = new Map();
  const models = new Set();
  const toolCalls = [];
  const toolErrors = [];
  let version = null;
  let costState = null;
  const efforts = new Set();
  for (const e of lines) {
    if (e.version) version = e.version;
    if (e.effort) efforts.add(e.effort);
    if (e.type === "cost-state") costState = e;
    const msg = e.message;
    if (e.type === "assistant" && msg) {
      if (msg.model) models.add(msg.model);
      if (msg.id && msg.usage) usageById.set(msg.id, msg.usage);
      for (const c of msg.content ?? []) {
        if (c.type === "tool_use") {
          const i = c.input ?? {};
          toolCalls.push({
            tool: c.name,
            target: i.file_path ?? i.path ?? i.pattern ?? i.command ?? null,
          });
        }
      }
    }
    if (e.type === "user" && Array.isArray(msg?.content)) {
      for (const c of msg.content) {
        if (c.type === "tool_result" && c.is_error) {
          const text = Array.isArray(c.content)
            ? c.content.map((x) => x.text ?? "").join(" ")
            : String(c.content ?? "");
          toolErrors.push(text.slice(0, 300));
        }
      }
    }
  }
  const tokens = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
  for (const u of usageById.values()) {
    tokens.input += u.input_tokens ?? 0;
    tokens.output += u.output_tokens ?? 0;
    tokens.cacheCreation += u.cache_creation_input_tokens ?? 0;
    tokens.cacheRead += u.cache_read_input_tokens ?? 0;
  }
  return {
    source: "Claude Code session transcript (~/.claude/projects/...)",
    cliVersionInTranscript: version,
    models: [...models].filter((m) => m !== "<synthetic>"),
    effort: [...efforts],
    apiResponses: usageById.size,
    tokens,
    costUSD: costState?.totalCostUSD ?? null,
    modelUsage: costState?.modelUsage ?? null,
    toolCalls,
    toolErrors,
  };
}

function codexStats(path, stderrText) {
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const models = new Set();
  const efforts = new Set();
  const toolCalls = [];
  let lastTotal = null;
  let cliVersion = null;
  for (const e of lines) {
    const p = e.payload ?? {};
    if (e.type === "session_meta") cliVersion = p.cli_version ?? null;
    if (e.type === "turn_context") {
      if (p.model) models.add(p.model);
      if (p.effort ?? p.reasoning_effort)
        efforts.add(p.effort ?? p.reasoning_effort);
    }
    if (e.type === "response_item") {
      if (
        p.type === "function_call" ||
        p.type === "custom_tool_call" ||
        p.type === "local_shell_call"
      ) {
        let target = p.arguments ?? p.input ?? p.action ?? null;
        if (typeof target === "string") {
          try {
            const parsed = JSON.parse(target);
            target = parsed.cmd ?? parsed.command ?? parsed;
          } catch {
            // apply_patch input is plain text
          }
        }
        if (typeof target !== "string") target = JSON.stringify(target);
        toolCalls.push({
          tool: p.name ?? p.type,
          target: String(target).slice(0, 600),
        });
      }
    }
    if (
      e.type === "event_msg" &&
      p.type === "token_count" &&
      p.info?.total_token_usage
    ) {
      lastTotal = p.info.total_token_usage;
    }
  }
  const m = /tokens used\s*\n\s*([\d,]+)/i.exec(stderrText);
  return {
    source: "Codex rollout log (~/.codex/sessions/...)",
    cliVersionInTranscript: cliVersion,
    models: [...models],
    reasoningEffort: [...efforts],
    tokens: lastTotal,
    tokensUsedReportedOnStderr: m ? Number(m[1].replaceAll(",", "")) : null,
    toolCalls,
  };
}

/**
 * Session-derived fields for one run: agentStats, tool calls outside the run dir, and exposure
 * (matches of `exposurePatterns(otherRunIds)` anywhere in the session log). Without the session
 * log they come from `previous` (the run's committed measure.json).
 */
function sessionFields({ runDir, runId, meta, previous, exposurePatterns }) {
  const transcriptPath = join(runDir, "transcript.jsonl");
  const stderrPath = join(runDir, "stderr.txt");
  if (!existsSync(transcriptPath)) {
    return {
      hasSessionLog: false,
      agentStats: previous?.agentStats ?? null,
      outsideRunDir: previous?.cheating.toolCallsOutsideRunDir ?? [],
      exposure: previous?.cheating.exposureInSessionLog ?? {},
    };
  }
  const stderrText = existsSync(stderrPath)
    ? readFileSync(stderrPath, "utf8")
    : "";
  const agentStats = lib.redact(
    meta.agent === "claude"
      ? claudeStats(transcriptPath)
      : codexStats(transcriptPath, stderrText)
  );
  // Tool calls that reach outside the run dir (absolute paths elsewhere, other runs, the repo
  // or `..`). Paths are already redacted, and so is meta.cwd.
  const outsideRunDir = (agentStats.toolCalls ?? []).filter((c) => {
    if (typeof c.target !== "string") return false;
    const stripped = c.target.split(meta.cwd).join("<RUN>");
    return /(^|[\s"'=(])(\/(Users|private|tmp|var|opt|etc|usr)\b|~\/|<(repo|experiment|tmp|run-root)>)|\.\.\//.test(
      stripped
    );
  });
  const otherRuns = readdirSync(lib.RUNS_DIR).filter(
    (d) => d !== runId && d !== meta.runId
  );
  const transcriptText = readFileSync(transcriptPath, "utf8");
  const exposure = Object.fromEntries(
    Object.entries(exposurePatterns(otherRuns))
      .map(([k, re]) => [k, (transcriptText.match(re) ?? []).length])
      .filter(([, v]) => v > 0)
  );
  return { hasSessionLog: true, agentStats, outsideRunDir, exposure };
}

module.exports = { claudeStats, codexStats, sessionFields };
