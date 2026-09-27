import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const readFrontmatterValue = (frontmatterText: string, key: string): string => {
  const match = frontmatterText.match(
    new RegExp(`^${key}:\\s*(?<value>.+)$`, "mu")
  );
  const value = match?.groups?.value?.trim();

  if (!value) {
    throw new Error(`Missing "${key}" in skill frontmatter`);
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    // SAFETY: The quotes identify a JSON-compatible double-quoted YAML scalar.
    return JSON.parse(value) as string;
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }

  return value;
};

const isLowercaseHex = (value: string): boolean => {
  for (const character of value) {
    if (!"0123456789abcdef".includes(character)) {
      return false;
    }
  }

  return true;
};

const schemaUrl = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";
const skillUrl = "/.well-known/agent-skills/ultracite/SKILL.md";
const docsDirectory = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(docsDirectory, "../..");
const sourceSkillPath = path.resolve(
  repositoryRoot,
  "skills/ultracite/SKILL.md"
);
const outputDirectory = path.resolve(
  docsDirectory,
  "dist/client/.well-known/agent-skills"
);
const outputSkillPath = path.resolve(outputDirectory, "ultracite/SKILL.md");
const outputIndexPath = path.resolve(outputDirectory, "index.json");

const sourceSkill = await readFile(sourceSkillPath);
const frontmatter = sourceSkill
  .toString("utf-8")
  .match(/^---\r?\n(?<fields>[\s\S]*?)\r?\n---(?:\r?\n|$)/u);

if (!frontmatter?.groups?.fields) {
  throw new Error(`Missing YAML frontmatter in ${sourceSkillPath}`);
}

const name = readFrontmatterValue(frontmatter.groups.fields, "name");
const description = readFrontmatterValue(
  frontmatter.groups.fields,
  "description"
);

if (name !== "ultracite") {
  throw new Error(`Expected skill name "ultracite", received "${name}"`);
}

const index = {
  $schema: schemaUrl,
  skills: [
    {
      description,
      digest: `sha256:${createHash("sha256").update(sourceSkill).digest("hex")}`,
      name,
      type: "skill-md",
      url: skillUrl,
    },
  ],
};

const indexJson = `${JSON.stringify(index, null, 2)}\n`;

await mkdir(path.resolve(outputDirectory, "ultracite"), { recursive: true });
await writeFile(outputSkillPath, sourceSkill);
await writeFile(outputIndexPath, indexJson);

const publishedSkill = await readFile(outputSkillPath);
const publishedIndex = await readFile(outputIndexPath, "utf-8");
const expectedDigest = `sha256:${createHash("sha256").update(publishedSkill).digest("hex")}`;

if (!sourceSkill.equals(publishedSkill)) {
  throw new Error("Published skill does not match skills/ultracite/SKILL.md");
}

if (
  index.$schema !== schemaUrl ||
  index.skills.length !== 1 ||
  index.skills[0].name !== name ||
  index.skills[0].type !== "skill-md" ||
  index.skills[0].description !== description ||
  index.skills[0].url !== skillUrl ||
  index.skills[0].digest !== expectedDigest ||
  !expectedDigest.startsWith("sha256:") ||
  expectedDigest.length !== 71 ||
  !isLowercaseHex(expectedDigest.slice(7)) ||
  indexJson !== publishedIndex
) {
  throw new Error("Generated Agent Skills discovery index failed validation");
}
