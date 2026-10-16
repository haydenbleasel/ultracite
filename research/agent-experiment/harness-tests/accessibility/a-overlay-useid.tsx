// collapsible: not agent output: the overlay <button> named by aria-labelledby, with the id from useId imported from react
// expect: fixed=yes, reason=native control
/*
 * Source:    excalidraw/excalidraw — packages/excalidraw/components/Stats/Collapsible.tsx, lines 1-51
 * Commit:    4c00f31ddcc20086bac1020428819fe0b9a30bce (2026-10-08T11:11:53+02:00)
 * Permalink: https://github.com/excalidraw/excalidraw/blob/4c00f31ddcc20086bac1020428819fe0b9a30bce/packages/excalidraw/components/Stats/Collapsible.tsx#L1-L51
 * Component: Collapsible (default export), the header row that opens and closes each section of
 *            Excalidraw's Stats panel ("General stats", "Element properties"); it is called with
 *            label={<h3>{t("stats.generalStats")}</h3>} in Stats/index.tsx L199-L215.
 * Lines 3-51 are copied, with their formatting and the order of keys and attributes changed. The
 * two imports (../InlineIcon and ../icons) are replaced by the STUB block below the license:
 * InlineIcon is copied from components/InlineIcon.tsx, and the two icons are written out from
 * createIcon (components/icons.tsx).
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

import { useId } from "react";

// ── STUB: the imports of the original file ─────────────────────────────
const InlineIcon = ({
  className,
  icon,
  size = "1em",
}: {
  className?: string;
  icon: React.ReactNode;
  size?: string;
}) => (
  <span
    className={className}
    style={{
      display: "inline-flex",
      flex: "0 0 auto",
      height: "100%",
      lineHeight: 0,
      margin: "0 0.5ex 0 0.5ex",
      verticalAlign: "middle",
      width: size,
    }}
  >
    {icon}
  </span>
);

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
      <path d="M0 0h24v24H0z" fill="none" stroke="none" />
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
      <path d="M0 0h24v24H0z" fill="none" stroke="none" />
      <path d="M6 15l6 -6l6 6" />
    </g>
  </svg>
);
// ── end of STUB ────────────────────────────────────────────────────────

interface CollapsibleProps {
  children: React.ReactNode;
  className?: string;
  label: React.ReactNode;
  // having it controlled so that the state is managed outside
  // this is to keep the user's previous choice even when the
  // Collapsible is unmounted
  open: boolean;
  openTrigger: () => void;
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
  const labelId = useId();
  return (
  <>
    <div
      className={className}
      id={labelId}
      style={{
        position: "relative",
        alignItems: "center",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      {label}
      {showCollapsedIcon && (
        <InlineIcon icon={open ? collapseUpIcon : collapseDownIcon} />
      )}
      <button
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={openTrigger}
        style={{ inset: 0, position: "absolute" }}
        type="button"
      />
    </div>
    {open && (
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    )}
  </>
  );
};

export default Collapsible;
