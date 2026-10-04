import { readFile, rm } from "node:fs/promises";

import { log } from "@clack/prompts";
import { z } from "zod";

import type { JsonObject } from "../data/types";
import { parseJsoncStrict } from "../schemas";
import { exists, resolveEsmConfigPath, writeProjectFile } from "../utils";
import {
  parseConfigModule,
  renderEntries,
  renderImport,
  renderJsonProperty,
  renderJsonValue,
} from "./config-module";
import type { ConfigModule, RenderedEntry } from "./config-module";

// Written as .ts in an ES module package and .mts otherwise; an existing
// config keeps its name (see resolveEsmConfigPath).
const oxfmtTsConfigPath = "./oxfmt.config.ts";
const oxfmtMtsConfigPath = "./oxfmt.config.mts";

const resolveOxfmtConfigPath = () =>
  resolveEsmConfigPath(oxfmtTsConfigPath, oxfmtMtsConfigPath);

const fileName = (filePath: string): string => filePath.slice(2);

// oxfmt refuses to run when one of these sits next to oxfmt.config.ts, so
// init migrates them into the TS config and removes them.
const oxfmtRcPaths = ["./.oxfmtrc.json", "./.oxfmtrc.jsonc"];

const ULTRACITE_OXFMT = "ultracite/oxfmt";

// Everything in an existing config that isn't Ultracite's: carried over into
// the regenerated file as written.
interface OxfmtExtras {
  danglingComments: string[];
  imports: string[];
  oxfmtSpecifiers: string[];
  properties: RenderedEntry[];
  statements: string[];
  ultraciteLocal: string;
}

const emptyExtras = (): OxfmtExtras => ({
  danglingComments: [],
  imports: [],
  oxfmtSpecifiers: [],
  properties: [],
  statements: [],
  ultraciteLocal: "ultracite",
});

const generateConfigContent = (extras: OxfmtExtras = emptyExtras()) => {
  const imports = [
    renderImport("oxfmt", ["defineConfig", ...extras.oxfmtSpecifiers]),
    `import ${extras.ultraciteLocal} from "${ULTRACITE_OXFMT}";`,
    ...extras.imports,
  ].join("\n");
  const statements = extras.statements.join("\n\n");
  const entries = renderEntries(
    [
      { comment: null, text: `...${extras.ultraciteLocal}` },
      ...extras.properties,
    ],
    extras.danglingComments
  );

  return `${imports}
${statements ? `\n${statements}\n` : ""}
export default defineConfig({
${entries}
});
`;
};

const readExistingConfig = (config: ConfigModule): OxfmtExtras | null => {
  if (config.container !== "object") {
    return null;
  }

  const extras = emptyExtras();

  for (const moduleImport of config.imports) {
    if (moduleImport.typeOnly) {
      extras.imports.push(moduleImport.text);
    } else if (moduleImport.source === "oxfmt") {
      extras.oxfmtSpecifiers.push(
        ...moduleImport.namedSpecifiers
          .filter((specifier) => specifier.local !== "defineConfig")
          .map((specifier) => specifier.text)
      );
    } else if (
      moduleImport.source === ULTRACITE_OXFMT &&
      moduleImport.defaultLocal
    ) {
      extras.ultraciteLocal = moduleImport.defaultLocal;
    } else {
      extras.imports.push(moduleImport.text);
    }
  }

  extras.statements.push(
    ...config.statements.map((statement) => statement.text)
  );

  for (const entry of config.entries) {
    if (entry.spreadOf !== extras.ultraciteLocal) {
      extras.properties.push({ comment: entry.comment, text: entry.text });
    }
  }

  extras.danglingComments.push(...config.danglingComments);

  return extras;
};

const rcSchema = z.record(z.string(), z.json());

const ARRAY_ITEM_INDENT = "    ";

/**
 * Carry an .oxfmtrc.json's options over into the regenerated config. Its
 * ignorePatterns are added to Ultracite's rather than replacing them, and an
 * option the TS config already sets keeps the TS config's value.
 */
const mergeRcConfig = (rc: JsonObject, extras: OxfmtExtras): void => {
  const presentKeys = new Set(
    extras.properties.map((property) => property.text.split(":")[0]?.trim())
  );

  for (const [key, value] of Object.entries(rc)) {
    if (key === "$schema" || presentKeys.has(key)) {
      continue;
    }

    if (key === "ignorePatterns" && Array.isArray(value)) {
      if (value.length > 0) {
        const items = [
          `...${extras.ultraciteLocal}.ignorePatterns`,
          ...value.map((item) => renderJsonValue(item, ARRAY_ITEM_INDENT)),
        ];
        extras.properties.push({
          comment: null,
          text: `ignorePatterns: [\n${items
            .map((item) => `${ARRAY_ITEM_INDENT}${item},`)
            .join("\n")}\n  ]`,
        });
      }
    } else {
      extras.properties.push(renderJsonProperty(key, value));
    }
  }
};

type ExistingOxfmtConfig =
  | { extras: OxfmtExtras; kind: "config" }
  | { kind: "unparseable" };

const readExistingOxfmtConfig = async (
  configPath: string | null
): Promise<ExistingOxfmtConfig> => {
  if (!configPath) {
    return { extras: emptyExtras(), kind: "config" };
  }

  const parsed = parseConfigModule(await readFile(configPath, "utf-8"));

  if (parsed.kind === "unparseable") {
    return { kind: "unparseable" };
  }

  const extras =
    parsed.kind === "module" ? readExistingConfig(parsed.module) : null;

  if (!extras) {
    log.warn(
      `${fileName(configPath)} doesn't export a config object init can update, so it was replaced with the Ultracite config. Its previous contents were not carried over; recover anything you need from version control.`
    );
  }

  return { extras: extras ?? emptyExtras(), kind: "config" };
};

export const oxfmt = {
  create: async () =>
    await writeProjectFile(
      resolveOxfmtConfigPath().target,
      generateConfigContent()
    ),
  exists: () =>
    exists(oxfmtTsConfigPath) ||
    exists(oxfmtMtsConfigPath) ||
    oxfmtRcPaths.some(exists),
  update: async () => {
    const paths = resolveOxfmtConfigPath();
    const configFile = fileName(paths.target);

    if (paths.conflict) {
      log.warn(
        `Both ${fileName(oxfmtTsConfigPath)} and ${fileName(oxfmtMtsConfigPath)} exist, and oxfmt won't load either, so they were left unchanged. Delete one and re-run \`ultracite init\`.`
      );
      return;
    }

    const rcPaths = oxfmtRcPaths.filter(exists);
    const rcContents = await Promise.all(
      rcPaths.map((rcPath) => readFile(rcPath, "utf-8"))
    );
    const rcConfigs: JsonObject[] = [];

    for (const [index, contents] of rcContents.entries()) {
      const config = parseJsoncStrict(contents, rcSchema);
      const rcFile = rcPaths[index]?.slice(2);

      // Writing the TS config next to an rc file that can't be migrated
      // would leave oxfmt unable to load either.
      if (!config) {
        log.warn(
          `Could not parse ${rcFile}, so the oxfmt config was left unchanged. oxfmt won't run with both ${rcFile} and ${configFile}; fix its syntax and re-run \`ultracite init\` to migrate it.`
        );
        return;
      }

      rcConfigs.push(config);
    }

    const current = await readExistingOxfmtConfig(paths.existing);

    if (current.kind === "unparseable") {
      log.warn(
        `Could not parse ${fileName(paths.existing ?? paths.target)}, so it was left unchanged. Fix its syntax and re-run \`ultracite init\`.`
      );
      return;
    }

    for (const config of rcConfigs) {
      mergeRcConfig(config, current.extras);
    }

    await writeProjectFile(paths.target, generateConfigContent(current.extras));

    // A .ts config in a "commonjs" package can't load, so it moved to .mts.
    const renamed =
      paths.existing && paths.existing !== paths.target ? paths.existing : null;
    await Promise.all(
      [...rcPaths, ...(renamed ? [renamed] : [])].map((stalePath) =>
        rm(stalePath, { force: true })
      )
    );

    if (renamed) {
      log.info(
        `Renamed ${fileName(renamed)} to ${configFile}: package.json sets "type": "commonjs", so Node can't load the ES module syntax of a .ts config.`
      );
    }

    for (const rcPath of rcPaths) {
      log.info(
        `Moved the options from ${fileName(rcPath)} into ${configFile} and removed ${fileName(rcPath)}.`
      );
    }
  },
};
