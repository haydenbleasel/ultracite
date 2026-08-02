"use client";

import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

// The `ultracite fix --codex` terminal scene: a frosted card replaying the
// real agent-fix renderer (packages/cli/src/agent-fix/renderer.ts). The run
// mirrors the CLI verbatim — clack intro, autofix spinner flipping to the
// handoff line, one braille-spinner block per file that settles to green
// checks after the verify re-lint (file two takes a retry), the queued-issues
// summary under the active block, and the clack outro.

const MONO = "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace";

const INK = "rgba(0,0,0,0.85)";
const MUTED = "rgba(0,0,0,0.55)";
const FAINT = "rgba(0,0,0,0.34)";
const ACCENT = "#0e7490";
const CYAN = "#0891b2";
const GREEN = "#1a9950";
const CHROME_BORDER = "rgba(90,100,120,0.14)";

const CARD_W = 960;
const CARD_H = 564;
const CHROME_H = 40;
const PAD_X = 26;
const PAD_TOP = 14;
const LINE_H = 23;

const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const CHARS_PER_FRAME = 2;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// The renderer's spinner, advanced every other frame (80ms at 30fps ≈ 2.4f).
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_STEP = 2;
// clack's spinner glyphs for the autofix phase.
const CLACK_SPINNER = ["◐", "◓", "◑", "◒"];
const CLACK_STEP = 4;

interface IssueSpec {
  location: string;
  message: string;
  rule: string;
}

interface GroupSpec {
  issues: IssueSpec[];
  /** Frame the issue block appears with spinners. */
  start: number;
  /** Frame the verify re-lint lands and the block flips to checks. */
  settle: number;
  /** Renderer note shown dim under the block once settled. */
  note?: string;
  /** Queued-summary line shown under the block while it spins. */
  queued?: string;
}

// Nine issues across three files — the shapes autofix leaves behind: async
// contracts, eval, switch fallthrough. Locations and messages are real oxlint
// diagnostics.
const GROUPS: GroupSpec[] = [
  {
    issues: [
      {
        location: "src/queue.ts:2:22",
        message: "Promise executor functions should not be async.",
        rule: "no-async-promise-executor",
      },
      {
        location: "src/queue.ts:8:15",
        message: "Async function has no 'await' expression.",
        rule: "require-await",
      },
      {
        location: "src/queue.ts:23:26",
        message: "Async function has no 'await' expression.",
        rule: "require-await",
      },
    ],
    queued: "… 6 more issues in 2 files",
    settle: 150,
    start: 76,
  },
  {
    issues: [
      {
        location: "src/config-loader.ts:3:10",
        message: "eval can be harmful.",
        rule: "no-eval",
      },
      {
        location: "src/config-loader.ts:10:22",
        message: "Expected === and instead saw ==",
        rule: "eqeqeq",
      },
      {
        location: "src/config-loader.ts:18:10",
        message: "Both sides of this comparison are exactly the same.",
        rule: "no-self-compare",
      },
    ],
    note: "Took 2 attempts.",
    queued: "… 3 more issues in 1 file",
    settle: 254,
    start: 156,
  },
  {
    issues: [
      {
        location: "src/parser.ts:14:7",
        message: "Expected a 'break' statement before 'case'.",
        rule: "no-fallthrough",
      },
      {
        location: "src/parser.ts:22:9",
        message: "Unexpected lexical declaration in case block.",
        rule: "no-case-declarations",
      },
      {
        location: "src/parser.ts:31:3",
        message: "Unexpected control character in regular expression.",
        rule: "no-control-regex",
      },
    ],
    settle: 330,
    start: 260,
  },
];

const CMD = "npx ultracite fix --codex";
const CMD_START = 14;
const CMD_DONE = CMD_START + Math.ceil(CMD.length / CHARS_PER_FRAME);

const INTRO_START = CMD_DONE + 8;
const AUTOFIX_START = INTRO_START + 4;
const AUTOFIX_DONE = 70;

const OUTRO_BLANK = 338;
const OUTRO_START = 340;
const TAIL_HOLD = 80;

export const FIX_CODEX_TERMINAL_DURATION = OUTRO_START + TAIL_HOLD;

const TrafficLight = ({ color }: { color: string }) => (
  <span
    style={{
      background: color,
      borderRadius: 999,
      display: "inline-block",
      height: 11,
      width: 11,
    }}
  />
);

/** A row that fades in at `start`; blank rows just hold their line height. */
const Row = ({
  start,
  frame,
  children,
}: {
  start: number;
  frame: number;
  children?: React.ReactNode;
}) => {
  if (frame < start) {
    return null;
  }
  const landed = interpolate(frame - start, [0, 4], [0, 1], clamp);
  return (
    <div style={{ height: LINE_H, opacity: landed, whiteSpace: "pre" }}>
      {children}
    </div>
  );
};

/** A transient row (the queued summary): collapses once the block settles. */
const TransientRow = ({
  start,
  end,
  frame,
  children,
}: {
  start: number;
  end: number;
  frame: number;
  children: React.ReactNode;
}) => {
  if (frame < start) {
    return null;
  }
  const landed = interpolate(frame - start, [0, 4], [0, 1], clamp);
  const remain = interpolate(frame - end, [0, 6], [1, 0], {
    ...clamp,
    easing: EASE,
  });
  return (
    <div
      style={{
        height: LINE_H * remain,
        opacity: Math.min(landed, remain),
        overflow: "hidden",
        whiteSpace: "pre",
      }}
    >
      {children}
    </div>
  );
};

const IssueRow = ({
  issue,
  group,
  frame,
}: {
  issue: IssueSpec;
  group: GroupSpec;
  frame: number;
}) => {
  const settled = frame >= group.settle;
  const icon = settled
    ? "✓"
    : SPINNER_FRAMES[
        Math.floor((frame - group.start) / SPINNER_STEP) % SPINNER_FRAMES.length
      ];
  return (
    <Row start={group.start} frame={frame}>
      <span style={{ color: settled ? GREEN : CYAN }}>{icon}</span>
      <span style={{ color: FAINT }}>{` ${issue.location}`}</span>
      <span style={{ color: MUTED }}>{`  ${issue.rule} — `}</span>
      <span style={{ color: MUTED }}>{issue.message}</span>
    </Row>
  );
};

const AutofixRow = ({ frame }: { frame: number }) => {
  const done = frame >= AUTOFIX_DONE;
  if (!done) {
    return (
      <Row start={AUTOFIX_START} frame={frame}>
        <span style={{ color: CYAN }}>
          {
            CLACK_SPINNER[
              Math.floor((frame - AUTOFIX_START) / CLACK_STEP) %
                CLACK_SPINNER.length
            ]
          }
        </span>
        <span style={{ color: MUTED }}>{"  Running autofix…"}</span>
      </Row>
    );
  }
  return (
    <Row start={AUTOFIX_START} frame={frame}>
      <span style={{ color: GREEN }}>◇</span>
      <span style={{ color: INK }}>
        {"  Autofix complete. 9 issues in 3 files left for Codex."}
      </span>
    </Row>
  );
};

export const FixCodexTerminal = () => {
  const frame = useCurrentFrame();

  const cardOpacity = interpolate(frame, [0, 14], [0, 1], clamp);
  const cardScale = interpolate(frame, [0, 20], [0.985, 1], {
    ...clamp,
    easing: EASE,
  });
  const cardY = interpolate(frame, [0, 20], [18, 0], {
    ...clamp,
    easing: EASE,
  });

  const revealed = Math.min(
    CMD.length,
    Math.max(0, Math.floor((frame - CMD_START) * CHARS_PER_FRAME))
  );
  const typing = frame >= CMD_START && revealed < CMD.length;
  const cursorOn = Math.floor(frame / 15) % 2 === 0;

  const cardStyle = {
    // oxlint-disable-next-line react-doctor/no-large-animated-blur -- intentional video visual — frosted-glass blur radius tuned for the release render
    WebkitBackdropFilter: "blur(16px)",
    // oxlint-disable-next-line react-doctor/no-large-animated-blur -- intentional video visual — frosted-glass blur radius tuned for the release render
    backdropFilter: "blur(16px)",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(255,255,255,0.85)",
    borderRadius: 14,
    boxShadow:
      "0 30px 70px rgba(30,40,60,0.24), inset 0 1px 0 rgba(255,255,255,0.8)",
    height: CARD_H,
    opacity: cardOpacity,
    overflow: "hidden",
    transform: `translateY(${cardY}px) scale(${cardScale})`,
    width: CARD_W,
  } as const;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={cardStyle}>
        {/* terminal chrome */}
        <div
          style={{
            alignItems: "center",
            borderBottom: `1px solid ${CHROME_BORDER}`,
            display: "flex",
            gap: 8,
            height: CHROME_H,
            padding: "0 16px",
            position: "relative",
          }}
        >
          <TrafficLight color="#ff5f57" />
          <TrafficLight color="#febc2e" />
          <TrafficLight color="#28c840" />
          <div
            style={{
              color: MUTED,
              fontFamily: MONO,
              fontSize: 13,
              left: 0,
              position: "absolute",
              right: 0,
              textAlign: "center",
            }}
          >
            ~/acme
          </div>
        </div>

        {/* buffer */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 14.5,
            lineHeight: `${LINE_H}px`,
            padding: `${PAD_TOP}px ${PAD_X}px 0`,
          }}
        >
          {frame >= CMD_START && (
            <div
              style={{
                alignItems: "center",
                display: "flex",
                height: LINE_H,
                whiteSpace: "pre",
              }}
            >
              <span style={{ color: ACCENT, marginRight: 8 }}>$</span>
              <span style={{ color: INK }}>{CMD.slice(0, revealed)}</span>
              {typing && cursorOn && (
                <span
                  style={{
                    background: INK,
                    display: "inline-block",
                    height: 15,
                    marginLeft: 2,
                    transform: "translateY(2px)",
                    width: 8,
                  }}
                />
              )}
            </div>
          )}
          <Row start={CMD_DONE + 4} frame={frame} />
          <Row start={INTRO_START} frame={frame}>
            <span style={{ color: FAINT }}>┌</span>
            <span style={{ color: INK }}>
              {"  ultracite fix — powered by Codex"}
            </span>
          </Row>
          <Row start={INTRO_START + 2} frame={frame}>
            <span style={{ color: FAINT }}>│</span>
          </Row>
          <AutofixRow frame={frame} />

          {GROUPS.map((group) => (
            <div key={group.issues[0].location}>
              {group.issues.map((issue) => (
                <IssueRow
                  key={issue.location + issue.rule}
                  issue={issue}
                  group={group}
                  frame={frame}
                />
              ))}
              {group.note && (
                <Row start={group.settle} frame={frame}>
                  <span style={{ color: FAINT }}>{group.note}</span>
                </Row>
              )}
              {group.queued && (
                <TransientRow
                  start={group.start}
                  end={group.settle}
                  frame={frame}
                >
                  <span style={{ color: FAINT }}>{group.queued}</span>
                </TransientRow>
              )}
            </div>
          ))}

          <Row start={OUTRO_BLANK} frame={frame} />
          <Row start={OUTRO_START} frame={frame}>
            <span style={{ color: FAINT }}>└</span>
            <span style={{ color: INK, fontWeight: 600 }}>
              {"  Fixed 9 of 9 issues with Codex."}
            </span>
          </Row>
        </div>
      </div>
    </AbsoluteFill>
  );
};
