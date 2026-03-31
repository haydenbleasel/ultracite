import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parse } from "jsonc-parser";

import { configs, core, next, react } from "../src/oxlint";

const readOxlintConfig = async (name: string) => {
  const configPath = join(
    import.meta.dirname,
    `../config/oxlint/${name}/.oxlintrc.json`
  );
  const content = await Bun.file(configPath).text();
  const config = parse(content) as Record<string, unknown>;

  delete config.$schema;

  return config;
};

describe("oxlint TypeScript exports", () => {
  for (const [name, config] of Object.entries(configs)) {
    test(`${name} matches the published JSON preset`, async () => {
      expect(config).toEqual(await readOxlintConfig(name));
    });
  }

  test("core, react, and next compose in extends arrays", () => {
    expect([core, react, next]).toHaveLength(3);
  });
});
