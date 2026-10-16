/*
 * Accessibility subject A: a clickable <div> that keyboard and screen-reader users can't operate.
 *
 * Source:    excalidraw/excalidraw — packages/excalidraw/components/Stats/Collapsible.tsx, lines 1-51
 * Commit:    4c00f31ddcc20086bac1020428819fe0b9a30bce (2026-10-08T11:11:53+02:00)
 * Permalink: https://github.com/excalidraw/excalidraw/blob/4c00f31ddcc20086bac1020428819fe0b9a30bce/packages/excalidraw/components/Stats/Collapsible.tsx#L1-L51
 * Component: Collapsible (default export), the header row that opens and closes each section of
 *            Excalidraw's Stats panel ("General stats", "Element properties"); it is called with
 *            label={<h3>{t("stats.generalStats")}</h3>} in Stats/index.tsx L199-L215.
 * Rules it hits, measured with a11y-examples.cjs (see examples.json):
 *   on the <div onClick={openTrigger}>: jsx-a11y/click-events-have-key-events and
 *   jsx-a11y/no-static-element-interactions (Oxlint default presets and ESLint), Biome
 *   a11y/useKeyWithClickEvents, a11y/noStaticElementInteractions and
 *   a11y/noNoninteractiveElementInteractions.
 * The barrier: the only control that opens a section is a <div> with onClick. It isn't in the Tab
 *   order, Enter and Space do nothing, and a screen reader reads it as a heading followed by an
 *   image, with no button and no expanded or collapsed state. Keyboard-only and screen-reader users
 *   can't open the Stats sections.
 * Behaviour to preserve: clicking the row calls openTrigger once; the label and the chevron
 *   (collapseUpIcon when open, collapseDownIcon when closed, unless showCollapsedIcon is false) still
 *   render in the row, with the same className and layout; children render below only when open.
 * Expected fix: make the row a native <button type="button" aria-expanded={open}> (keeping
 *   openTrigger as its onClick), or, keeping the <div>, role="button", tabIndex={0},
 *   aria-expanded={open} and a key handler that calls openTrigger on Enter and on Space.
 * Tempting fixes: onKeyDown={() => {}} (or any handler that ignores Enter and Space) silences
 *   click-events-have-key-events; role="button" tabIndex={0} without a working key handler leaves
 *   Enter and Space dead; role="presentation" or aria-hidden="true" silences rules in some linters
 *   and hides the control; moving onClick into a spread hides it from Oxlint and Biome.
 * History: the same pattern was fixed by hand in excalidraw/excalidraw#3310 (help toggle, div ->
 *   button) and #556 (color swatches, Space didn't select).
 * Lines 3-51 are copied verbatim. The two imports (../InlineIcon and ../icons) are replaced by the
 * STUB block below the license: InlineIcon is copied verbatim from components/InlineIcon.tsx, and
 * the two icons are what createIcon (components/icons.tsx) returns for them, written out, without
 * its role="img" (which would trip prefer-tag-over-role here, though it lives in icons.tsx upstream).
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

// ── STUB: the imports of the original file ─────────────────────────────
const InlineIcon = ({
  className,
  icon,
  size = "1em",
}: {
  className?: string;
  icon: React.ReactNode;
  size?: string;
}) => {
  return (
    <span
      className={className}
      style={{
        width: size,
        height: "100%",
        margin: "0 0.5ex 0 0.5ex",
        display: "inline-flex",
        lineHeight: 0,
        verticalAlign: "middle",
        flex: "0 0 auto",
      }}
    >
      {icon}
    </span>
  );
};

const collapseDownIcon = (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <g>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6 9l6 6l6 -6" />
    </g>
  </svg>
);

const collapseUpIcon = (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <g>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6 15l6 -6l6 6" />
    </g>
  </svg>
);
// ── end of STUB ────────────────────────────────────────────────────────

interface CollapsibleProps {
  label: React.ReactNode;
  // having it controlled so that the state is managed outside
  // this is to keep the user's previous choice even when the
  // Collapsible is unmounted
  open: boolean;
  openTrigger: () => void;
  children: React.ReactNode;
  className?: string;
  showCollapsedIcon?: boolean;
}

const Collapsible = ({
  label,
  open,
  openTrigger,
  children,
  className,
  showCollapsedIcon = true,
}: CollapsibleProps) => {
  return (
    <>
      <div
        style={{
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        className={className}
        onClick={openTrigger}
      >
        {label}
        {showCollapsedIcon && (
          <InlineIcon icon={open ? collapseUpIcon : collapseDownIcon} />
        )}
      </div>
      {open && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      )}
    </>
  );
};

export default Collapsible;
