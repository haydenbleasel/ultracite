"use client";

import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// The Ultracite mark (apps/docs/components/home/logo.astro): a starburst — one
// fused top burst plus five lower rays. Each path carries a bloom `order` so
// the burst pops first and the lower rays sweep in clockwise, mirroring the
// asterisk spinning up. Paths use `currentColor`, so the mark takes its color
// from the svg's `color`.
const RAYS: { d: string; order: number }[] = [
  // the fused top burst
  {
    d: "M318.66 13.38L268.71 0L226.62 157.09L188.62 15.27L138.67 28.65L179.73 181.88L77.47 79.61L40.9 116.18L153.07 228.35L13.38 190.92L0 240.87L152.63 281.76C150.88 274.23 149.96 266.37 149.96 258.3C149.96 201.19 196.26 154.88 253.38 154.88C310.5 154.88 356.8 201.19 356.8 258.3C356.8 266.32 355.88 274.12 354.16 281.62L492.87 318.79L506.25 268.84L353.02 227.78L492.72 190.35L479.33 140.4L326.1 181.46L428.37 79.19L391.8 42.63L281.19 153.24L318.66 13.38Z",
    order: 0,
  },
  // lower right diagonal
  {
    d: "M354.01 282.2C349.73 300.3 340.69 316.57 328.28 329.6L428.77 430.09L465.34 393.52L354.01 282.2Z",
    order: 1,
  },
  // lower right vertical
  {
    d: "M327.26 330.65C314.71 343.47 298.84 353.04 281.05 357.97L317.62 494.44L367.57 481.06L327.26 330.65Z",
    order: 2,
  },
  // bottom center
  {
    d: "M279.19 358.47C270.94 360.59 262.29 361.72 253.37 361.72C243.82 361.72 234.57 360.43 225.79 358L189.19 494.6L239.13 507.98L279.19 358.47Z",
    order: 3,
  },
  // lower left vertical
  {
    d: "M224.01 357.5C206.5 352.32 190.91 342.63 178.61 329.77L77.87 430.51L114.44 467.07L224.01 357.5Z",
    order: 4,
  },
  // lower left diagonal
  {
    d: "M177.79 328.88C165.7 315.94 156.9 299.89 152.71 282.07L13.54 319.36L26.92 369.3L177.79 328.88Z",
    order: 5,
  },
];

export interface UltraciteLogoProps {
  color?: string;
  markHeight?: number;
  wordmark?: string;
  /** Wordmark cap height ≈ markHeight, so the two read as the same height. */
  wordmarkSize?: number;
  gap?: number;
  rayStagger?: number;
  wordmarkDelay?: number;
  speed?: number;
}

export const UltraciteLogo = ({
  color = "#ffffff",
  markHeight = 104,
  wordmark = "Ultracite",
  wordmarkSize = 122,
  gap = 30,
  rayStagger = 3,
  wordmarkDelay = 22,
  speed = 1,
}: UltraciteLogoProps) => {
  const frame = useCurrentFrame() * speed;
  const { fps } = useVideoConfig();

  const markWidth = markHeight * (507 / 508);

  const wordEasing = Easing.bezier(0.22, 1, 0.36, 1);
  const wl = frame - wordmarkDelay;
  const wordOpacity = interpolate(wl, [0, 20], [0, 1], {
    easing: wordEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wordX = interpolate(wl, [0, 20], [-14, 0], {
    easing: wordEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wordBlur = interpolate(wl, [0, 20], [10, 0], {
    easing: wordEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The whole mark settles with a slight counter-rotation so the burst reads
  // as spinning up rather than fading in.
  const markSpring = spring({
    config: { damping: 14, mass: 0.7, stiffness: 170 },
    fps,
    frame,
  });
  const markRotate = interpolate(markSpring, [0, 1], [-24, 0]);

  const containerStyle = {
    alignItems: "center",
    background: "transparent",
    display: "flex",
    flexDirection: "row",
    gap,
    inset: 0,
    justifyContent: "center",
    position: "absolute",
  } as const;

  const wordmarkStyle = {
    color,
    filter: `blur(${wordBlur}px)`,
    fontFamily:
      "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: wordmarkSize,
    fontWeight: 600,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    opacity: wordOpacity,
    transform: `translateY(-0.01em) translateX(${wordX}px)`,
  } as const;

  return (
    <div style={containerStyle}>
      <svg
        width={markWidth}
        height={markHeight}
        viewBox="0 0 507 508"
        fill="none"
        style={{
          color,
          overflow: "visible",
          transform: `rotate(${markRotate}deg)`,
        }}
        aria-label={wordmark}
      >
        {RAYS.map((ray) => {
          const local = frame - ray.order * rayStagger;
          const s = spring({
            config: { damping: 12, mass: 0.6, stiffness: 200 },
            fps,
            frame: local,
          });
          const scale = interpolate(s, [0, 1], [0, 1]);
          const opacity = interpolate(local, [0, 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const blur = interpolate(s, [0, 1], [7, 0]);
          return (
            <path
              key={ray.order}
              d={ray.d}
              fill="currentColor"
              style={{
                filter: `blur(${blur}px)`,
                opacity,
                transform: `scale(${scale})`,
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            />
          );
        })}
      </svg>

      <span style={wordmarkStyle}>{wordmark}</span>
    </div>
  );
};
