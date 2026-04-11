import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { configs, core, next, react } from "../src/oxlint";

const readOxlintConfig = async (name: string) => {
  const configPath = join(
    import.meta.dirname,
    `../config/oxlint/${name}/oxlint.config.ts`
  );
  const mod = await import(configPath);

  return mod.default;
};

describe("oxlint TypeScript exports", () => {
  test.each(Object.entries(configs))(
    "%s matches the published TS preset",
    async (name, config) => {
      expect(config).toEqual(await readOxlintConfig(name));
    }
  );

  test("core, react, and next compose in extends arrays", () => {
    expect([core, react, next]).toHaveLength(3);
  });
});
