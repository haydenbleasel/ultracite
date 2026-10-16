// topPicks: not agent output: the palette name and shade in a visually hidden span
// expect: fixed=yes, reason=palette name
/*
 * Source:    excalidraw/excalidraw — packages/excalidraw/components/ColorPicker/TopPicks.tsx, lines 26-132
 * Commit:    4c00f31ddcc20086bac1020428819fe0b9a30bce (2026-10-08T11:11:53+02:00)
 * Permalink: https://github.com/excalidraw/excalidraw/blob/4c00f31ddcc20086bac1020428819fe0b9a30bce/packages/excalidraw/components/ColorPicker/TopPicks.tsx#L26-L132
 * Component: TopPicks (exported), the strip of five "top pick" colour swatches at the top of
 *            Excalidraw's stroke, background and canvas colour pickers.
 * Lines 26-132 are copied, with their formatting and the order of keys and attributes changed. The
 * imports of the original file (clsx, @excalidraw/common, ../../i18n, the top-picks drag-and-drop
 * helpers and colorPickerUtils) are replaced by the STUB block below the license. COLOR_PALETTE,
 * the default picks, COLOR_OUTLINE_CONTRAST_THRESHOLD, THEME, getColorNameAndShadeFromColor and the
 * English colour strings are copied from packages/common/src/colors.ts,
 * packages/common/src/constants.ts, packages/excalidraw/components/ColorPicker/colorPickerUtils.ts
 * and packages/excalidraw/locales/en.json; the rest are marked STUB.
 *
 * License of the source repository (excalidraw/excalidraw/LICENSE), reproduced in full:
 *
 * MIT License
 *
 * Copyright (c) 2020 Excalidraw
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import type { PointerEvent, ReactElement } from "react";

// ── STUB: the imports of the original file ─────────────────────────────
// STUB: clsx (class-name joiner), reduced to the string and object forms used here.
const clsx = (
  ...args: (string | Record<string, boolean> | undefined)[]
): string =>
  args
    .flatMap((arg) => {
      if (typeof arg === "string") {
        return [arg];
      }
      return arg
        ? Object.entries(arg)
            .filter(([, on]) => on)
            .map(([name]) => name)
        : [];
    })
    .join(" ");

// From packages/common/src/constants.ts.
export const THEME = {
  DARK: "dark",
  LIGHT: "light",
} as const;
type Theme = (typeof THEME)[keyof typeof THEME];

// From packages/common/src/colors.ts.
const DEFAULT_ELEMENT_STROKE_COLOR_INDEX = 4;
const DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX = 1;

export const COLOR_PALETTE = {
  black: "#1e1e1e",
  blue: ["#e7f5ff", "#a5d8ff", "#4dabf7", "#228be6", "#1971c2"],
  // radix bronze shades [3,5,7,9,11]
  bronze: ["#f8f1ee", "#eaddd7", "#d2bab0", "#a18072", "#846358"],
  cyan: ["#e3fafc", "#99e9f2", "#3bc9db", "#15aabf", "#0c8599"],
  grape: ["#f8f0fc", "#eebefa", "#da77f2", "#be4bdb", "#9c36b5"],
  // open-color from https://github.com/yeun/open-color/blob/master/open-color.js
  // corresponds to indexes [0,2,4,6,8] (weights: 50, 200, 400, 600, 800)
  gray: ["#f8f9fa", "#e9ecef", "#ced4da", "#868e96", "#343a40"],
  green: ["#ebfbee", "#b2f2bb", "#69db7c", "#40c057", "#2f9e44"],
  orange: ["#fff4e6", "#ffd8a8", "#ffa94d", "#fd7e14", "#e8590c"],
  pink: ["#fff0f6", "#fcc2d7", "#f783ac", "#e64980", "#c2255c"],
  red: ["#fff5f5", "#ffc9c9", "#ff8787", "#fa5252", "#e03131"],
  teal: ["#e6fcf5", "#96f2d7", "#38d9a9", "#12b886", "#099268"],
  transparent: "transparent",
  violet: ["#f3f0ff", "#d0bfff", "#9775fa", "#7950f2", "#6741d9"],
  white: "#ffffff",
  yellow: ["#fff9db", "#ffec99", "#ffd43b", "#fab005", "#f08c00"],
} as const;

type ColorPickerColor = keyof typeof COLOR_PALETTE;
type ColorTuple = readonly [string, string, string, string, string];
type ColorPaletteCustom = Record<string, ColorTuple | string>;

// ORDER matters for positioning in quick picker
const DEFAULT_ELEMENT_STROKE_PICKS = [
  COLOR_PALETTE.black,
  COLOR_PALETTE.red[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
  COLOR_PALETTE.green[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
  COLOR_PALETTE.blue[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
  COLOR_PALETTE.yellow[DEFAULT_ELEMENT_STROKE_COLOR_INDEX],
] as ColorTuple;

// ORDER matters for positioning in quick picker
const DEFAULT_ELEMENT_BACKGROUND_PICKS = [
  COLOR_PALETTE.transparent,
  COLOR_PALETTE.red[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
  COLOR_PALETTE.green[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
  COLOR_PALETTE.blue[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
  COLOR_PALETTE.yellow[DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX],
] as ColorTuple;

// ORDER matters for positioning in quick picker
const DEFAULT_CANVAS_BACKGROUND_PICKS = [
  COLOR_PALETTE.white,
  // radix slate2
  "#f8f9fa",
  // radix blue2
  "#f5faff",
  // radix yellow2
  "#fffce8",
  // radix bronze2
  "#fdf8f6",
] as ColorTuple;

const COLOR_OUTLINE_CONTRAST_THRESHOLD = 240;

// STUB: applyDarkModeFilter inverts and hue-rotates a colour with tinycolor for the dark theme;
// here it only inverts a hex colour.
const applyDarkModeFilter = (color: string, enable = true): string => {
  if (!(enable && color.startsWith("#"))) {
    return color;
  }
  const channels = [1, 3, 5].map(
    (start) => 255 - Number.parseInt(color.slice(start, start + 2), 16)
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

// STUB: isColorDark, the same YIQ formula as the original, for hex colours only (no tinycolor).
const isColorDark = (color: string, threshold = 160): boolean => {
  if (!color) {
    return true;
  }
  if (color === "transparent") {
    return false;
  }
  const hex = color.replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < threshold;
};

// From packages/excalidraw/components/ColorPicker/colorPickerUtils.ts.
export const getColorNameAndShadeFromColor = ({
  palette,
  color,
}: {
  palette: ColorPaletteCustom;
  color: string | null;
}): {
  colorName: ColorPickerColor;
  shade: number | null;
} | null => {
  if (!color) {
    return null;
  }
  for (const [colorName, colorVal] of Object.entries(palette)) {
    if (Array.isArray(colorVal)) {
      const shade = colorVal.indexOf(color);
      if (shade !== -1) {
        return { colorName: colorName as ColorPickerColor, shade };
      }
    } else if (colorVal === color) {
      return { colorName: colorName as ColorPickerColor, shade: null };
    }
  }
  return null;
};

type ColorPickerType =
  | "canvasBackground"
  | "elementBackground"
  | "elementStroke";

// STUB: t() from ../../i18n, with the English strings of locales/en.json it can look up here
// ("colors" and "colorPicker", verbatim).
const EN: Record<string, string> = {
  "colorPicker.color": "Color",
  "colorPicker.colors": "Colors",
  "colorPicker.resetTopPicks": "Reset to default top picks",
  "colorPicker.shades": "Shades",
  "colors.black": "Black",
  "colors.blue": "Blue",
  "colors.bronze": "Bronze",
  "colors.cyan": "Cyan",
  "colors.grape": "Grape",
  "colors.gray": "Gray",
  "colors.green": "Green",
  "colors.orange": "Orange",
  "colors.pink": "Pink",
  "colors.red": "Red",
  "colors.teal": "Teal",
  "colors.transparent": "Transparent",
  "colors.violet": "Violet",
  "colors.white": "White",
  "colors.yellow": "Yellow",
};
export const t = (
  path: string,
  replacement?: Record<string, string | number> | null,
  fallback?: string
): string => {
  const translation = EN[path] ?? fallback;
  if (translation === undefined) {
    throw new Error(`Can't find translation for ${path}`);
  }
  let out = translation;
  for (const [key, value] of Object.entries(replacement ?? {})) {
    out = out.replaceAll(`{{${key}}}`, String(value));
  }
  return out;
};

// STUB: the drag-and-drop helpers (../TopPicksDnD/*, ./colorTopPicksDnD). Outside a drag they
// return no state, which is what this component renders with.
interface TopPickDragState {
  duplicateIndex: number | null;
  origin: { kind: "pick" | "source"; index: number };
  overIndex: number | null;
}
const useColorPickerDnD = (): {
  dragState: TopPickDragState | null;
  setStripEl: (element: HTMLDivElement | null) => void;
  startPickDrag: (event: PointerEvent, index: number, color: string) => void;
} | null => null;
const getTopPickReorderOffset = (
  _dragState: TopPickDragState | null,
  _index: number
): number => 0;
const TopPicksDnDOutline = () => null;

// STUB: TopPicksContextMenu wraps the strip in a Radix context menu when onReset is given.
const TopPicksContextMenu = ({
  children,
}: {
  children: ReactElement;
  onReset?: () => void;
  isCustomized: boolean;
  resetLabel: string;
}) => children;

// STUB: Excalidraw declares its CSS custom properties for React's style prop.
declare module "react" {
  interface CSSProperties {
    "--swatch-color"?: string;
  }
}
// ── end of STUB ────────────────────────────────────────────────────────

interface TopPicksProps {
  activeColor: string | null;
  /** whether custom picks are currently applied (enables the reset item) */
  isCustomized?: boolean;
  onChange: (color: string) => void;
  /** present when the strip is user-customizable — enables the right-click
   * context menu resetting the strip to its default picks */
  onReset?: () => void;
  theme: Theme;
  topPicks?: readonly string[];
  type: ColorPickerType;
}

export const TopPicks = ({
  theme,
  onChange,
  type,
  activeColor,
  topPicks,
  onReset,
  isCustomized,
}: TopPicksProps) => {
  const dnd = useColorPickerDnD();
  const dragState = dnd?.dragState ?? null;

  let colors;
  if (type === "elementStroke") {
    colors = DEFAULT_ELEMENT_STROKE_PICKS;
  }

  if (type === "elementBackground") {
    colors = DEFAULT_ELEMENT_BACKGROUND_PICKS;
  }

  if (type === "canvasBackground") {
    colors = DEFAULT_CANVAS_BACKGROUND_PICKS;
  }

  // this one can overwrite defaults
  if (topPicks) {
    colors = topPicks;
  }

  if (!colors) {
    console.error("Invalid type for TopPicks");
    return null;
  }

  return (
    <TopPicksContextMenu
      isCustomized={!!isCustomized}
      onReset={onReset}
      resetLabel={t("colorPicker.resetTopPicks")}
    >
      <div
        className={clsx("color-picker__top-picks top-picks-dnd", {
          "is-dnd-active": !!dragState,
        })}
        ref={dnd?.setStripEl}
      >
        {dragState && <TopPicksDnDOutline />}
        {colors.map((color: string, index: number) => {
          const reorderOffset = getTopPickReorderOffset(dragState, index);
          const displayColor = applyDarkModeFilter(color, theme === THEME.DARK);
          const named = getColorNameAndShadeFromColor({
            color,
            palette: COLOR_PALETTE,
          });
          const label = named
            ? `${t(`colors.${named.colorName}`)}${named.shade === null ? "" : ` ${named.shade + 1}`}`
            : color;
          return (
            <button
              className={clsx("color-picker__button top-picks-dnd__pick", {
                active: color === activeColor,
                "has-outline": !isColorDark(
                  color,
                  COLOR_OUTLINE_CONTRAST_THRESHOLD
                ),
                "is-dnd-duplicate": dragState?.duplicateIndex === index,
                "is-dnd-source":
                  dragState?.origin.kind === "pick" &&
                  dragState.origin.index === index,
                "is-dnd-target":
                  dragState?.origin.kind === "source" &&
                  dragState.overIndex === index,
                "is-transparent": color === "transparent" || !color,
              })}
              data-testid={`color-top-pick-${color}`}
              data-top-pick-index={index}
              key={color}
              onClick={() => onChange(color)}
              onPointerDown={
                dnd
                  ? (event) => dnd.startPickDrag(event, index, color)
                  : undefined
              }
              style={{
                "--swatch-color": displayColor,
                transform: reorderOffset
                  ? `translateX(${reorderOffset}px)`
                  : undefined,
              }}
              title={color}
              type="button"
            >
              <div className="color-picker__button-outline" />
              <span className="sr-only">{label}</span>
            </button>
          );
        })}
      </div>
    </TopPicksContextMenu>
  );
};
