"use client";

import { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

export interface KineticCenterBuildProps {
  text: string;
  entryOffset?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  speed?: number;
  className?: string;
}

const FONT_FAMILY =
  "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif";

const MEASURE_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function measureWidths(
  words: string[],
  fontSize: number,
  fontWeight: number,
): number[] {
  if (typeof document === "undefined") {
    return words.map((w) => w.length * fontSize * 0.55);
  }
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return words.map((w) => w.length * fontSize * 0.55);
  ctx.font = `${fontWeight} ${fontSize}px ${MEASURE_FONT}`;
  return words.map((w) => ctx.measureText(w).width);
}

export function KineticCenterBuild({
  text,
  entryOffset = 88,
  fontSize = 72,
  color = "#171717",
  fontWeight = 600,
  speed = 1,
  className,
}: KineticCenterBuildProps) {
  const frame = useCurrentFrame() * speed;

  const words = useMemo(() => text.split(" "), [text]);
  const widths = useMemo(
    () => measureWidths(words, fontSize, fontWeight),
    [words, fontSize, fontWeight],
  );

  const gap = 10;
  const firstDur = 10;
  const pushDur = 13;
  const entryScale = 0.992;
  const entryBlur = 3.5;
  const reflowBlur = 0.8;
  const firstWordY = 6;
  const easing = Easing.bezier(0.2, 0.8, 0.2, 1);

  const positionsAt = useMemo(() => {
    const out: number[][] = [];
    for (let k = 1; k <= words.length; k++) {
      let total = gap * (k - 1);
      for (let j = 0; j < k; j++) total += widths[j];
      let cursor = -total / 2;
      const xs: number[] = [];
      for (let j = 0; j < k; j++) {
        xs.push(cursor + widths[j] / 2);
        cursor += widths[j] + gap;
      }
      out.push(xs);
    }
    return out;
  }, [words, widths]);

  const n = words.length;

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
      <div
        className={className}
        style={{
          position: "relative",
          fontSize,
          fontWeight,
          color,
          letterSpacing: "-0.03em",
          fontFamily: FONT_FAMILY,
          whiteSpace: "nowrap",
        }}
      >
        {words.map((word, j) => {
          const entryStart = j === 0 ? 0 : firstDur + (j - 1) * pushDur;
          const entryEnd = entryStart + (j === 0 ? firstDur : pushDur);
          const targetX = positionsAt[j][j];
          const xFrom = j === 0 ? 0 : targetX + entryOffset;

          let x = targetX;
          let opacity = 1;
          let scale = 1;
          let blur = 0;
          let y = 0;

          if (frame < entryStart) {
            opacity = 0;
            x = xFrom;
            scale = entryScale;
            blur = entryBlur;
            y = j === 0 ? firstWordY : 0;
          } else if (frame <= entryEnd) {
            const range: [number, number] = [entryStart, entryEnd];
            const opts = {
              extrapolateLeft: "clamp" as const,
              extrapolateRight: "clamp" as const,
              easing,
            };
            x = interpolate(frame, range, [xFrom, targetX], opts);
            opacity = interpolate(frame, range, [0, 1], opts);
            scale = interpolate(frame, range, [entryScale, 1], opts);
            blur = interpolate(frame, range, [entryBlur, 0], opts);
            y = j === 0 ? interpolate(frame, range, [firstWordY, 0], opts) : 0;
          } else {
            for (let w = j + 1; w < n; w++) {
              const pushStart = firstDur + (w - 1) * pushDur;
              const pushEnd = pushStart + pushDur;
              const fromX = positionsAt[w - 1][j];
              const toX = positionsAt[w][j];
              if (frame >= pushEnd) {
                x = toX;
              } else if (frame >= pushStart) {
                x = interpolate(frame, [pushStart, pushEnd], [fromX, toX], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing,
                });
                blur = interpolate(
                  frame,
                  [pushStart, (pushStart + pushEnd) / 2, pushEnd],
                  [0, reflowBlur, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                );
                break;
              } else {
                x = fromX;
                break;
              }
            }
          }

          return (
            <span
              key={j}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                whiteSpace: "nowrap",
                backfaceVisibility: "hidden",
                transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) scale(${scale})`,
                filter: `blur(${blur}px)`,
                opacity,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
