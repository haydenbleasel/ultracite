import {
  clampChroma,
  converter,
  formatRgb,
  interpolate,
  parse,
  type Oklch,
  type Rgb,
} from "culori";

const toRgb = converter("rgb");
const toOklch = converter("oklch");

const BLACK: Rgb = { mode: "rgb", r: 0, g: 0, b: 0, alpha: 1 };

export function parseColor(c: string): Rgb {
  const s = c.trim();

  if (s.startsWith("var(")) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[remocn-ui] parseColor cannot resolve CSS variable "${s}" under Remotion's per-frame render. ` +
        "Animated colors must be concrete oklch/hex/rgb values supplied via the theme. " +
        "Falling back to the JS default.",
      );
    }
    return { ...BLACK };
  }

  const rgb = toRgb(parse(s));
  if (!rgb) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[remocn-ui] parseColor could not parse "${s}"; using black.`);
    }
    return { ...BLACK };
  }

  return { mode: "rgb", r: rgb.r, g: rgb.g, b: rgb.b, alpha: rgb.alpha ?? 1 };
}

export function oklchToRgb(l: number, c: number, h: number): Rgb {
  const mapped = clampChroma({ mode: "oklch", l, c, h }, "oklch", "rgb");
  return toRgb(mapped);
}

export function rgbToOklch(rgb: Rgb): Oklch {
  const { l, c, h } = toOklch(rgb);
  return { mode: "oklch", l, c, h: Number.isFinite(h) ? h : 0 };
}

function resolveColorString(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("var(")) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[remocn-ui] mixOklch cannot resolve CSS variable "${trimmed}" under Remotion's per-frame render. ` +
        "Animated colors must be concrete oklch/hex/rgb values supplied via the theme. " +
        "Falling back to the JS default.",
      );
    }
    return "#000";
  }
  if (!parse(trimmed)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[remocn-ui] mixOklch could not parse "${trimmed}"; using black.`);
    }
    return "#000";
  }
  return trimmed;
}

export function mixOklch(a: string, b: string, t: number): string {
  const mixed = clampChroma(
    interpolate([resolveColorString(a), resolveColorString(b)], "oklch")(t),
    "oklch",
    "rgb",
  );
  return toCss(toRgb(mixed));
}

export function toCss(color: Rgb): string {
  return formatRgb(color);
}
