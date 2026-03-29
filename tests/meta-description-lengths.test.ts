import { describe, expect, test } from "bun:test";

const decoder = new TextDecoder();

const loadFailingDescriptions = () => {
  const result = Bun.spawnSync({
    cmd: [
      "bun",
      "-e",
      `
        import { readFileSync } from "node:fs";
        import { agents } from "./packages/data/src/agents.ts";
        import { editors, getEditorPageData } from "./packages/data/src/editors.ts";
        import { providers } from "./packages/data/src/providers.ts";
        import { getProviderPageContent } from "./apps/web/lib/provider-content.ts";
        import { siteDescription } from "./apps/web/lib/site-metadata.ts";

        const minLength = 110;
        const maxLength = 160;

        const readDescriptionFromSource = (path) => {
          const source = readFileSync(path, "utf8");
          const frontmatter = source.match(/^description:\\s*(.+)$/m);

          if (frontmatter) {
            return frontmatter[1].trim().replace(/^['"]|['"]$/g, "");
          }

          const inline = source.match(/description:\\s*"([^"]+)"/);
          return inline?.[1] ?? null;
        };

        const descriptions = [
          { description: siteDescription, label: "site" },
          {
            description: readDescriptionFromSource(
              "apps/web/app/(legal)/acceptable-use/page.tsx",
            ),
            label: "acceptable-use",
          },
          {
            description: readDescriptionFromSource(
              "apps/web/app/(legal)/privacy/page.tsx",
            ),
            label: "privacy",
          },
          {
            description: readDescriptionFromSource(
              "apps/web/app/(legal)/terms/page.tsx",
            ),
            label: "terms",
          },
          ...agents.map((agent) => ({
            description: agent.content.metaDescription,
            label: \`agent:\${agent.id}\`,
          })),
          ...editors.map((editor) => ({
            description: getEditorPageData(editor).metaDescription,
            label: \`editor:\${editor.id}\`,
          })),
          ...providers.map((provider) => ({
            description: getProviderPageContent(provider.id).metadataDescription,
            label: \`provider:\${provider.id}\`,
          })),
          ...Array.from(new Bun.Glob("**/*.mdx").scanSync({ cwd: "apps/docs" })).map(
            (path) => ({
              description: readDescriptionFromSource(\`apps/docs/\${path}\`),
              label: \`docs:\${path}\`,
            }),
          ),
        ];

        const failing = descriptions
          .map((item) => ({
            ...item,
            length: item.description?.length ?? null,
          }))
          .filter(
            (item) =>
              item.length === null ||
              item.length < minLength ||
              item.length > maxLength,
          );

        console.log(JSON.stringify(failing));
      `,
    ],
    cwd: process.cwd(),
    stderr: "pipe",
    stdout: "pipe",
  });

  expect(result.exitCode).toBe(0);

  return JSON.parse(decoder.decode(result.stdout)) as {
    description: string | null;
    label: string;
    length: number | null;
  }[];
};

describe("meta description lengths", () => {
  test("all public descriptions stay within the target range", () => {
    expect(loadFailingDescriptions()).toEqual([]);
  });
});
