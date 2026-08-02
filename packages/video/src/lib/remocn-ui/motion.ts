export const easings = {
  linear: (t: number): number => t,
  out: (t: number): number => 1 - (1 - t) ** 3,
  in: (t: number): number => t * t * t,
  inOut: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
} as const;

export type EasingName = keyof typeof easings;

export const springs = {
  snappy: { damping: 18, stiffness: 220, mass: 0.7 },
  soft: { damping: 14, stiffness: 120, mass: 0.9 },
  bouncy: { damping: 10, stiffness: 180, mass: 0.8 },
} as const;

export type SpringName = keyof typeof springs;
