import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import path from "node:path";

import { z } from "zod";

import { propertyOrder } from "../config/stylelint/property-order.mjs";

const presetSchema = z.looseObject({
  extends: z.array(z.string()),
  overrides: z.array(
    z.looseObject({ rules: z.record(z.string(), z.unknown()) })
  ),
  plugins: z.array(z.string()),
  rules: z.record(z.string(), z.unknown()),
});

const loadPreset = async () => {
  const module: unknown = await import(
    path.join(import.meta.dirname, "../config/stylelint/stylelint.config.mjs")
  );

  return z.looseObject({ default: presetSchema }).parse(module).default;
};

// SHA-256 of the list joined with newlines, taken from the
// `order/properties-order` option stylelint-config-idiomatic-order 10.0.0
// resolved to while the package was still installed. The preset's list was
// checked to deep-equal that option before the package was dropped. A change
// here reorders the declarations in every project `ultracite fix` runs on, so
// it needs a changeset that says so.
const PROPERTY_ORDER_SHA256 =
  "9e8e2531f83281ad8e1505a17c2fb9cb895ffcdec235ebabba5e269ca0590393";

describe("stylelint property order", () => {
  test("is the order stylelint-config-idiomatic-order 10.0.0 set", () => {
    const hash = createHash("sha256")
      .update(propertyOrder.join("\n"))
      .digest("hex");

    expect(propertyOrder).toHaveLength(64);
    expect(new Set(propertyOrder).size).toBe(propertyOrder.length);
    expect(hash).toBe(PROPERTY_ORDER_SHA256);
  });

  test("starts with CSS Modules, the reset and positioning, and ends with margins", () => {
    expect(propertyOrder.slice(0, 9)).toEqual([
      "composes",
      "all",
      "position",
      "z-index",
      "top",
      "right",
      "bottom",
      "left",
      "display",
    ]);
    expect(propertyOrder.slice(-5)).toEqual([
      "margin",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
    ]);
  });
});

describe("stylelint preset", () => {
  test("sorts with stylelint-order and the options the idiomatic config set", async () => {
    const preset = await loadPreset();

    expect(preset.extends).toEqual(["stylelint-config-standard"]);
    expect(preset.plugins).toEqual(["stylelint-order"]);
    expect(preset.rules["order/properties-order"]).toEqual([
      propertyOrder,
      { unspecified: "bottomAlphabetical" },
    ]);

    const orderRules = Object.keys(preset.rules).filter((name) =>
      name.startsWith("order/")
    );

    expect(orderRules).toEqual(["order/properties-order"]);
  });

  test("keeps the property order for SCSS and Less", async () => {
    const preset = await loadPreset();

    expect(preset.overrides).toHaveLength(2);

    for (const override of preset.overrides) {
      expect(Object.keys(override.rules)).not.toContain(
        "order/properties-order"
      );
      // CSS value parsing doesn't apply to Sass or Less values.
      expect(override.rules["value-no-invalid"]).toBeNull();
    }
  });
});
