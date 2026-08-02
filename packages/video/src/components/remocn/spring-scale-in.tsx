"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

export interface SpringScaleInProps {
  text: string;
  staggerDelay?: number;
  scaleFrom?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  speed?: number;
  className?: string;
}

export function SpringScaleIn({
  text,
  staggerDelay = 3,
  scaleFrom = 0.7,
  fontSize = 72,
  color = "#171717",
  fontWeight = 600,
  speed = 1,
  className,
}: SpringScaleInProps) {
  const frame = useCurrentFrame() * speed;

  const words = text.split(" ");
  const wordDurationFrames = 11;
  const easing = Easing.bezier(0.34, 1.56, 0.64, 1);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <span
        className={className}
        style={{
          fontSize,
          fontWeight,
          color,
          letterSpacing: "-0.03em",
          fontFamily:
            "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {words.map((word, i) => {
          const local = frame - i * staggerDelay;
          const opacity = interpolate(local, [0, wordDurationFrames], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing,
          });
          const scale = interpolate(local, [0, wordDurationFrames], [scaleFrom, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing,
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.25em",
                transformOrigin: "50% 50%",
                opacity,
                transform: `scale(${scale})`,
              }}
            >
              {word}
            </span>
          );
        })}
      </span>
    </div>
  );
}
