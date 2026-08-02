"use client";

import { Sequence, interpolate, useCurrentFrame } from "remotion";

export interface GlassCodeBlockProps {
  code?: string;
  title?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  glassColor?: string;
  staggerFrames?: number;
  showTrafficLights?: boolean;
  aura?: boolean;
  speed?: number;
  className?: string;
}

const FONT_MONO =
  "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace";

const DEFAULT_CODE = `import { motion } from "remotion";

// Generate a hero scene
export function Hero() {
  const frame = useCurrentFrame();
  const opacity = frame / 30;
  return <h1 style={{ opacity }}>Hello</h1>;
}`;

// Minimal regex tokenizer. NOT a real syntax highlighter — just enough to
// give the eye color anchors. Order matters: comments → strings → keywords.
const KEYWORDS = new Set([
  "import",
  "from",
  "export",
  "function",
  "const",
  "let",
  "var",
  "return",
  "if",
  "else",
  "for",
  "while",
  "new",
  "class",
  "extends",
  "default",
  "true",
  "false",
  "null",
  "undefined",
]);

type Token = {
  text: string;
  kind: "code" | "comment" | "string" | "keyword" | "number";
};

function tokenizeLine(line: string): Token[] {
  // Whole-line comment.
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) {
    return [{ text: line, kind: "comment" }];
  }

  const tokens: Token[] = [];
  // Split keeping delimiters: words, strings, numbers, everything else.
  const re = /("[^"]*"|'[^']*'|`[^`]*`|\b\d+\b|\b[A-Za-z_$][\w$]*\b|[^\w"']+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    const t = match[0];
    const first = t[0];
    if (first === '"' || first === "'" || first === "`") {
      tokens.push({ text: t, kind: "string" });
    } else if (/^\d+$/.test(t)) {
      tokens.push({ text: t, kind: "number" });
    } else if (/^[A-Za-z_$][\w$]*$/.test(t) && KEYWORDS.has(t)) {
      tokens.push({ text: t, kind: "keyword" });
    } else {
      tokens.push({ text: t, kind: "code" });
    }
  }
  return tokens;
}

const TOKEN_COLORS: Record<Token["kind"], string> = {
  code: "#e4e4e7",
  comment: "#52525b",
  string: "#86efac",
  keyword: "#c4b5fd",
  number: "#fcd34d",
};

export function GlassCodeBlock({
  code = DEFAULT_CODE,
  title = "hero.tsx",
  width = 760,
  height = 460,
  fontSize = 16,
  glassColor = "rgba(10, 10, 10, 0.6)",
  staggerFrames = 4,
  showTrafficLights = true,
  aura = false,
  speed = 1,
  className,
}: GlassCodeBlockProps) {
  const lines = code.split("\n");

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {aura && <BackdropAura />}

      {/* 1px gradient ring acting as a microborder */}
      <div
        style={{
          position: "relative",
          padding: 1,
          borderRadius: 16,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)",
          width,
          height,
          boxShadow: "0 50px 120px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 15,
            background: glassColor,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: FONT_MONO,
          }}
        >
          {/* Chrome */}
          <div
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {showTrafficLights && (
              <>
                <Light color="#ff5f57" />
                <Light color="#febc2e" />
                <Light color="#28c840" />
              </>
            )}
            <div
              style={{
                flex: 1,
                textAlign: "center",
                color: "#a1a1aa",
                fontSize: 12,
                letterSpacing: "0.02em",
              }}
            >
              {title}
            </div>
          </div>

          {/* Code body */}
          <div
            style={{
              flex: 1,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize,
              lineHeight: 1.55,
            }}
          >
            {lines.map((line, i) => (
              <Sequence
                key={i}
                from={Math.round((i * staggerFrames) / speed)}
                layout="none"
              >
                <CodeLine line={line} index={i} fontSize={fontSize} />
              </Sequence>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Light({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: color,
        opacity: 0.6,
      }}
    />
  );
}

function CodeLine({
  line,
  index,
  fontSize,
}: {
  line: string;
  index: number;
  fontSize: number;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ty = interpolate(frame, [0, 8], [4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tokens = tokenizeLine(line);
  // Render an empty line as a half-height spacer so blank lines still take
  // visual space without collapsing the gap.
  if (tokens.length === 0) {
    return <div style={{ height: fontSize * 0.8, opacity }} />;
  }
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${ty}px)`,
        whiteSpace: "pre",
        display: "flex",
        gap: 0,
      }}
    >
      <span style={{ width: 28, color: "#3f3f46", userSelect: "none" }}>
        {String(index + 1).padStart(2, " ")}
      </span>
      <span>
        {tokens.map((t, i) => (
          <span key={i} style={{ color: TOKEN_COLORS[t.kind] }}>
            {t.text}
          </span>
        ))}
      </span>
    </div>
  );
}

function BackdropAura() {
  // Slow, low-amplitude blob behind the glass so the backdrop blur has
  // perceptible content to refract.
  const frame = useCurrentFrame();
  const t = frame / 60;
  const x = 50 + Math.sin(t) * 20;
  const y = 50 + Math.cos(t * 0.7) * 15;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(circle at ${x}% ${y}%, rgba(56,189,248,0.22), transparent 50%), radial-gradient(circle at ${100 - x}% ${100 - y}%, rgba(168,85,247,0.18), transparent 55%)`,
      }}
    />
  );
}
