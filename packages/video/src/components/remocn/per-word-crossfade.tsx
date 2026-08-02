"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

export interface PerWordCrossfadeProps {
  fromText: string;
  toText: string;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  speed?: number;
  className?: string;
}

export function PerWordCrossfade({
  fromText,
  toText,
  fontSize = 72,
  color = "#171717",
  fontWeight = 600,
  speed = 1,
  className,
}: PerWordCrossfadeProps) {
  const frame = useCurrentFrame() * speed;

  const fromWords = fromText.split(" ");
  const toWords = toText.split(" ");

  const enterDur = 21;
  const exitDur = 15;
  const enterStagger = 2;
  const exitStagger = 1;
  const overlapF = 5;
  const microDelayF = 2;

  const enterEasing = Easing.bezier(0.16, 1, 0.3, 1);
  const exitEasing = Easing.bezier(0.7, 0, 0.84, 0);

  const exitTotal = exitDur + (fromWords.length - 1) * exitStagger;
  const newStart = Math.max(0, exitTotal - overlapF + microDelayF);

  const fontStack =
    "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif";

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        background: "transparent",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight,
            color,
            letterSpacing: "-0.03em",
            fontFamily: fontStack,
          }}
        >
          {fromWords.map((word, i) => {
            const local = frame - i * exitStagger;
            const opacity = interpolate(local, [0, exitDur], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: exitEasing,
            });
            const y = interpolate(local, [0, exitDur], [0, -6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: exitEasing,
            });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: "0.25em",
                  transformOrigin: "50% 55%",
                  opacity,
                  transform: `translateY(${y}px)`,
                }}
              >
                {word}
              </span>
            );
          })}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight,
            color,
            letterSpacing: "-0.03em",
            fontFamily: fontStack,
          }}
        >
          {toWords.map((word, j) => {
            const local = frame - newStart - j * enterStagger;
            const opacity = interpolate(local, [0, enterDur], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: enterEasing,
            });
            const y = interpolate(local, [0, enterDur], [8, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: enterEasing,
            });
            return (
              <span
                key={j}
                style={{
                  display: "inline-block",
                  marginRight: "0.25em",
                  transformOrigin: "50% 55%",
                  opacity,
                  transform: `translateY(${y}px)`,
                }}
              >
                {word}
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
}
