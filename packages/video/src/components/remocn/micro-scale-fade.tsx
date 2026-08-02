"use client";

import { Easing, interpolate, useCurrentFrame } from "remotion";

export interface MicroScaleFadeProps {
  text: string;
  scaleFrom?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  speed?: number;
  className?: string;
}

export function MicroScaleFade({
  text,
  scaleFrom = 0.96,
  fontSize = 72,
  color = "#171717",
  fontWeight = 600,
  speed = 1,
  className,
}: MicroScaleFadeProps) {
  const frame = useCurrentFrame() * speed;
  const easing = Easing.bezier(0.32, 0.72, 0, 1);

  const opacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

  const scale = interpolate(frame, [0, 18], [scaleFrom, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

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
          display: "inline-block",
          transformOrigin: "50% 50%",
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        {text}
      </span>
    </div>
  );
}
