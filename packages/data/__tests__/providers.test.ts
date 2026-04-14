import { describe, expect, test } from "bun:test";

import { providers } from "../src/providers";

describe("providers content", () => {
  test("supplementary logos include accessible alt text", () => {
    for (const provider of providers) {
      for (const logo of provider.additionalLogos ?? []) {
        expect(logo.alt.length).toBeGreaterThan(0);
        expect(logo.src).toBeDefined();
      }
    }
  });

  test("config file code generators produce valid output for each provider", () => {
    const samplePresets = ["core", "react"];

    for (const provider of providers) {
      for (const configFile of provider.configFiles) {
        const output = configFile.code(samplePresets);
        expect(output).toBeString();
        expect(output.length).toBeGreaterThan(0);
      }
    }
  });

  test("biome config file generates correct JSON structure", () => {
    const biome = providers.find((p) => p.id === "biome");
    expect(biome).toBeDefined();

    const [config] = biome?.configFiles ?? [];
    const output = config.code(["core"]);
    expect(output).toContain('"ultracite/biome/core"');
    expect(output).toContain('"$schema"');
  });

  test("eslint config file generates correct import structure", () => {
    const eslint = providers.find((p) => p.id === "eslint");
    expect(eslint).toBeDefined();

    const [config] = eslint?.configFiles ?? [];
    const output = config.code(["core", "react"]);
    expect(output).toContain('import core from "ultracite/eslint/core"');
    expect(output).toContain('import react from "ultracite/eslint/react"');
    expect(output).toContain("defineConfig");
  });

  test("oxlint config file generates correct import structure", () => {
    const oxlint = providers.find((p) => p.id === "oxlint");
    expect(oxlint).toBeDefined();

    const [config] = oxlint?.configFiles ?? [];
    const output = config.code(["core", "react"]);
    expect(output).toContain('import core from "ultracite/oxlint/core"');
    expect(output).toContain('import react from "ultracite/oxlint/react"');
    expect(output).toContain("defineConfig");
  });
});
