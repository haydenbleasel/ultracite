import { agents, type Agent } from "./agents";
import { editors, type Editor } from "./editors";
import type { HooksConfig } from "./types";

export type { HooksConfig } from "./types";

export interface HookIntegration {
  id: string;
  name: string;
  hooks: HooksConfig;
}

const isEditorWithHooks = (
  editor: Editor
): editor is Editor & { hooks: HooksConfig } => Boolean(editor.hooks);

const isAgentWithHooks = (
  agent: Agent
): agent is Agent & { hooks: HooksConfig } => Boolean(agent.hooks);

const getEditorHookIntegrations = (): HookIntegration[] =>
  editors.filter(isEditorWithHooks).map((editor) => ({
    id: editor.id,
    name: editor.name,
    hooks: editor.hooks,
  }));

const getAgentHookIntegrations = (): HookIntegration[] =>
  agents.filter(isAgentWithHooks).map((agent) => ({
    id: agent.id,
    name: agent.name,
    hooks: agent.hooks,
  }));

export const hooks: HookIntegration[] = [
  ...getEditorHookIntegrations(),
  ...getAgentHookIntegrations(),
];
