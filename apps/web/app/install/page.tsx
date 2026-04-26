import { agents } from "@repo/data/agents";
import { editors } from "@repo/data/editors";
import { hooks } from "@repo/data/hooks";
import { providers } from "@repo/data/providers";

import { JsonLd } from "@/components/seo/json-ld";
import {
  createBreadcrumbStructuredData,
  createPageMetadata,
} from "@/lib/site-metadata";

import { Configurator } from "./components/configurator";
import type {
  AgentTarget,
  EditorTarget,
  FrameworkOption,
  HookOption,
  IntegrationOption,
  LinterOption,
} from "./components/configurator";
import { InstallHero } from "./components/hero";

const linterOptions: LinterOption[] = providers.map((provider) => ({
  description: provider.subtitle,
  id: provider.id,
  logo: provider.logo,
  name: provider.name,
}));

const frameworkOptions: FrameworkOption[] = [
  { id: "react", name: "React" },
  { id: "next", name: "Next.js" },
  { id: "solid", name: "Solid" },
  { id: "vue", name: "Vue" },
  { id: "svelte", name: "Svelte" },
  { id: "qwik", name: "Qwik" },
  { id: "angular", name: "Angular" },
  { id: "remix", name: "Remix / TanStack / React Router" },
  { id: "astro", name: "Astro" },
  { id: "nestjs", name: "NestJS" },
  { id: "jest", name: "Jest" },
  { id: "vitest", name: "Vitest / Bun" },
];

const universalEditorPreviewIds = ["vscode", "cursor", "windsurf"] as const;

const getUniversalEditorLogos = (groupEditors: typeof editors) =>
  universalEditorPreviewIds.flatMap((id) => {
    const logo = groupEditors.find((editor) => editor.id === id)?.logo;
    return logo ? [logo] : [];
  });

const buildEditorTargets = (): EditorTarget[] => {
  const grouped = new Map<string, typeof editors>();

  for (const editor of editors) {
    const list = grouped.get(editor.config.path) ?? [];
    list.push(editor);
    grouped.set(editor.config.path, list);
  }

  const targets: EditorTarget[] = [...grouped.entries()].map(
    ([path, groupEditors]) => {
      const [first] = groupEditors;
      const isUniversal = groupEditors.length > 1;
      const displayName = isUniversal ? `Universal (${path})` : first.name;

      return {
        configPath: path,
        editorNames: groupEditors.map((editor) => editor.name),
        id: isUniversal ? "universal" : first.id,
        logo: isUniversal ? null : first.logo,
        logos: isUniversal ? getUniversalEditorLogos(groupEditors) : undefined,
        name: displayName,
      };
    }
  );

  return targets.toSorted((left, right) => {
    if (left.id === "universal") {
      return -1;
    }
    if (right.id === "universal") {
      return 1;
    }
    return left.name.localeCompare(right.name);
  });
};

const editorTargets = buildEditorTargets();

const normalizeAgentName = (name: string) =>
  name.replace(/ Code$/, "").replace(/ Agent$/, "");

const universalAgentPreviewIds = ["codex", "copilot", "cursor-cli"] as const;

const getUniversalAgentLogos = (groupAgents: typeof agents) =>
  universalAgentPreviewIds.flatMap((id) => {
    const logo = groupAgents.find((agent) => agent.id === id)?.logo;
    return logo ? [logo] : [];
  });

const buildAgentTargets = (): AgentTarget[] => {
  const grouped = new Map<string, typeof agents>();

  for (const agent of agents) {
    const list = grouped.get(agent.config.path) ?? [];
    list.push(agent);
    grouped.set(agent.config.path, list);
  }

  const targets: AgentTarget[] = [...grouped.entries()].map(
    ([path, groupAgents]) => {
      const [first] = groupAgents;
      const isUniversal = path === "AGENTS.md" && groupAgents.length > 1;
      const displayName = isUniversal
        ? "Universal (AGENTS.md)"
        : normalizeAgentName(first.name);

      return {
        agentNames: groupAgents.map((agent) => normalizeAgentName(agent.name)),
        configPath: path,
        id: isUniversal ? "universal" : first.id,
        logo: isUniversal ? null : first.logo,
        logos: isUniversal ? getUniversalAgentLogos(groupAgents) : undefined,
        name: displayName,
      };
    }
  );

  return targets.toSorted((left, right) => {
    if (left.id === "universal") {
      return -1;
    }
    if (right.id === "universal") {
      return 1;
    }
    return left.name.localeCompare(right.name);
  });
};

const agentTargets = buildAgentTargets();

const hookOptions: HookOption[] = hooks.map((hook) => ({
  id: hook.id,
  name: hook.name,
}));

const integrationOptions: IntegrationOption[] = [
  { id: "husky", name: "Husky" },
  { id: "lefthook", name: "Lefthook" },
  { id: "lint-staged", name: "lint-staged" },
  { id: "pre-commit", name: "pre-commit (Python)" },
];

const title = "Create your custom install command";
const description =
  "Pick your linter, frameworks, editors, and agents — we'll generate the install command tailored to your stack.";

export const metadata = createPageMetadata({
  description,
  path: "/install",
  title,
});

const InstallPage = () => (
  <>
    <JsonLd
      data={createBreadcrumbStructuredData([
        { name: "Home", path: "/" },
        { name: "Install", path: "/install" },
      ])}
    />
    <div className="grid gap-8 sm:gap-12">
      <InstallHero description={description} title={title} />
      <Configurator
        agentTargets={agentTargets}
        editorTargets={editorTargets}
        frameworks={frameworkOptions}
        hooks={hookOptions}
        integrations={integrationOptions}
        linters={linterOptions}
      />
    </div>
  </>
);

export default InstallPage;
