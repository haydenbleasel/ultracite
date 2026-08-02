"use client";

import { loadFont as loadBodyFont } from "@remotion/google-fonts/Inter";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Caret } from "@/components/remocn/caret";
import { useTypewriter } from "@/lib/remocn-ui";

const { fontFamily: SANS_FAMILY } = loadBodyFont();

export interface ClaudeChatProps {
  greeting?: string;
  placeholder?: string;
  prompt?: string;
  modelName?: string;
  modelTier?: string;
  accentColor?: string;
  speed?: number;
}

interface Theme {
  page: string;
  cardBg: string;
  cardBorder: string;
  fg: string;
  fgMuted: string;
  placeholder: string;
  iconBtnBorder: string;
}

export const THEMES: Record<"light" | "dark", Theme> = {
  light: {
    page: "#F5F4EF",
    cardBg: "#FFFFFF",
    cardBorder: "#E8E5DD",
    fg: "#1F1E1D",
    fgMuted: "#73726C",
    placeholder: "#A3A097",
    iconBtnBorder: "#E0DDD4",
  },
  dark: {
    page: "#262624",
    cardBg: "#1F1E1D",
    cardBorder: "#3A3936",
    fg: "#F0EEE6",
    fgMuted: "#9B9892",
    placeholder: "#73726C",
    iconBtnBorder: "#3A3936",
  },
};

export const TYPING_START_FRAME = 42;

export const TYPING_CPS = 22;

export function morphProgressAt(
  frame: number,
  opts: { startFrame?: number; fps: number; speed: number },
): number {
  const startFrame = opts.startFrame ?? TYPING_START_FRAME;
  const value = spring({
    fps: opts.fps,
    frame: frame * opts.speed - startFrame,
    config: { damping: 14, stiffness: 200, mass: 0.6 },
  });
  return Math.max(0, Math.min(value, 1));
}

export function introBounceIn(
  frame: number,
  fps: number,
): { translateY: number; scale: number } {
  const s = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 110, mass: 0.7 },
  });
  const translateY = interpolate(s, [0, 1], [28, 0]);
  const scale = interpolate(s, [0, 1], [0.97, 1]);
  return { translateY, scale };
}

export function fadeUpAt(
  frame: number,
  range: [number, number],
): { opacity: number; translateY: number } {
  const opts = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  };
  return {
    opacity: interpolate(frame, range, [0, 1], opts),
    translateY: interpolate(frame, range, [12, 0], opts),
  };
}

function ChevronDown({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <title>Expand</title>
      <path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <title>Add</title>
      <path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <title>Voice input</title>
      <rect
        x={9}
        y={3}
        width={6}
        height={11}
        rx={3}
        stroke={color}
        strokeWidth={1.8}
      />
      <path
        d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M9 21h6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WaveformIcon({ size, color }: { size: number; color: string }) {
  const bars = [
    { x: 4, h: 8 },
    { x: 9, h: 16 },
    { x: 14, h: 12 },
    { x: 19, h: 20 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <title>Voice</title>
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x - 1}
          y={(24 - bar.h) / 2}
          width={2.4}
          height={bar.h}
          rx={1.2}
          fill={color}
        />
      ))}
    </svg>
  );
}

function SendIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <title>Send</title>
      <path
        d="M12 19V5M12 5l-6 6M12 5l6 6"
        stroke="#FFFFFF"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconButton({
  size,
  border,
  children,
}: {
  size: number;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "100%",
        border: `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export function ClaudeChat({
  placeholder = "Try: draft an email · summarize a doc · plan your week",
  prompt = "Draft a launch tweet for our new release",
  modelName = "Opus 4.8",
  modelTier = "Max",
  accentColor = "#D97757",
  speed = 1,
}: ClaudeChatProps) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = THEMES.light;

  const refW = 1280;
  const refH = 720;
  const stageScale = Math.min(width / refW, height / refH);

  const tw = useTypewriter(prompt, {
    cps: TYPING_CPS,
    speed,
    startFrame: TYPING_START_FRAME,
  });
  const visibleText = tw.text;
  const showText = tw.count > 0;
  const morph = morphProgressAt(frame, { fps, speed });

  const intro = introBounceIn(frame * speed, fps);
  const cardFade = fadeUpAt(frame * speed, [6, 22]);

  const cardWidth = 860;
  const cardLeft = (refW - cardWidth) / 2;
  const iconBtnSize = 36;
  const morphSize = 40;

  return (
    <AbsoluteFill style={{ background: "transparent" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: refW,
          height: refH,
          transform: `translate(-50%, -50%) scale(${stageScale})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: cardLeft,
            top: 300,
            width: cardWidth,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 24,
            boxShadow: "0 8px 30px -12px rgba(31,30,29,0.12)",
            opacity: cardFade.opacity,
            transform: `translateY(${cardFade.translateY + intro.translateY}px) scale(${intro.scale})`,
            transformOrigin: "center top",
          }}
        >
          <div
            style={{
              padding: "26px 28px",
              minHeight: 58,
              fontFamily: SANS_FAMILY,
              fontSize: 21,
              lineHeight: 1.3,
              display: "flex",
              alignItems: "center",
            }}
          >
            {showText ? (
              <span style={{ color: t.fg }}>
                {visibleText}
                <Caret
                  color={t.fg}
                  blink={!tw.typing}
                  speed={speed}
                  height={24}
                  radius={0}
                  marginLeft={1}
                  style={{
                    verticalAlign: "text-bottom",
                    transform: "translateY(3px)",
                  }}
                />
              </span>
            ) : (
              <span
                style={{
                  color: t.placeholder,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <Caret
                  color={t.fg}
                  blink={!tw.typing}
                  speed={speed}
                  height={24}
                  radius={0}
                  marginLeft={1}
                  style={{
                    verticalAlign: "text-bottom",
                    transform: "translateY(3px)",
                  }}
                />
                <span style={{ marginLeft: 2 }}>{placeholder}</span>
              </span>
            )}
          </div>

          <div
            style={{
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <IconButton size={iconBtnSize} border={t.iconBtnBorder}>
              <PlusIcon size={20} color={t.fg} />
            </IconButton>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span
                  style={{
                    fontFamily: SANS_FAMILY,
                    fontSize: 18,
                    fontWeight: 500,
                    color: t.fg,
                  }}
                >
                  {modelName}
                </span>
                <span
                  style={{
                    fontFamily: SANS_FAMILY,
                    fontSize: 18,
                    fontWeight: 400,
                    color: t.fgMuted,
                  }}
                >
                  {modelTier}
                </span>
                <ChevronDown size={16} color={t.fgMuted} />
              </div>

              <IconButton size={iconBtnSize} border={t.iconBtnBorder}>
                <MicIcon size={20} color={t.fg} />
              </IconButton>

              <div
                style={{
                  position: "relative",
                  width: morphSize,
                  height: morphSize,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "100%",
                    border: `1px solid ${t.iconBtnBorder}`,
                    opacity: 1 - morph,
                    transform: `scale(${1 - 0.1 * morph})`,
                  }}
                >
                  <WaveformIcon size={22} color={t.fg} />
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    background: accentColor,
                    opacity: morph,
                    transform: `scale(${0.8 + 0.2 * morph})`,
                  }}
                >
                  <SendIcon size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
