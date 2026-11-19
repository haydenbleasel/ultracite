/**
 * The property order of stylelint-config-idiomatic-order 10.0.0
 * (https://github.com/ream88/stylelint-config-idiomatic-order), which follows
 * Idiomatic CSS (https://github.com/necolas/idiomatic-css#declaration-order):
 * CSS Modules' `composes`, the `all` reset, positioning, then display and the
 * box model. Every other property follows in alphabetical order.
 *
 * The list is that package's resolved `order/properties-order` option, copied
 * as it is, including the four `border-*-radius` names that are not CSS
 * properties. The package's last release depends on a `stylelint-order` that
 * can no longer fix on Stylelint 18, so the preset holds the order itself and
 * loads `stylelint-order` directly. A test locks the list, so the order
 * `ultracite fix` produces can't change by accident.
 *
 * stylelint-config-idiomatic-order is MIT licensed:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2023 Mario Uher
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
export const propertyOrder = [
  // ── CSS Modules ───────────────────────────────────────────────────
  "composes",

  // ── Reset ─────────────────────────────────────────────────────────
  "all",

  // ── Positioning ───────────────────────────────────────────────────
  "position",
  "z-index",
  "top",
  "right",
  "bottom",
  "left",

  // ── Display and box model ─────────────────────────────────────────
  "display",
  "overflow",
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
  "box-sizing",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "align-content",
  "align-items",
  "align-self",
  "justify-content",
  "order",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border",
  "border-width",
  "border-style",
  "border-color",
  "border-radius",
  "border-top",
  "border-top-width",
  "border-top-style",
  "border-top-color",
  "border-top-radius",
  "border-right",
  "border-right-width",
  "border-right-style",
  "border-right-color",
  "border-right-radius",
  "border-bottom",
  "border-bottom-width",
  "border-bottom-style",
  "border-bottom-color",
  "border-bottom-radius",
  "border-left",
  "border-left-width",
  "border-left-style",
  "border-left-color",
  "border-left-radius",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
];
