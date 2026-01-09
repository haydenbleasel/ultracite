import { type Agent, agents } from "./agents";
import { type Editor, editors } from "./editors";
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
    hooks: editor.hooks,
    id: editor.id,
    name: editor.name,
  }));

const getAgentHookIntegrations = (): HookIntegration[] =>
  agents.filter(isAgentWithHooks).map((agent) => ({
    hooks: agent.hooks,
    id: agent.id,
    name: agent.name,
  }));

export const hooks: HookIntegration[] = [
  ...getEditorHookIntegrations(),
  ...getAgentHookIntegrations(),
];
