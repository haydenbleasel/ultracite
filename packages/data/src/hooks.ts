import { editors, type Editor, type EditorHooksConfig } from "./editors";

export interface HookIntegration {
  id: string;
  name: string;
  hooks: EditorHooksConfig;
}

const isEditorWithHooks = (
  editor: Editor
): editor is Editor & { hooks: EditorHooksConfig } => Boolean(editor.hooks);

const editorHookIntegrations: HookIntegration[] = editors
  .filter(isEditorWithHooks)
  .map((editor) => ({
    id: editor.id,
    name: editor.name,
    hooks: editor.hooks,
  }));

const claudeCodeHooksIntegration: HookIntegration = {
  id: "claude",
  name: "Claude Code",
  hooks: {
    path: ".claude/settings.json",
    getContent: (command) => ({
      hooks: {
        PostToolUse: [
          {
            matcher: "Write|Edit",
            hooks: [
              {
                type: "command",
                command,
              },
            ],
          },
        ],
      },
    }),
  },
};

export const hooks: HookIntegration[] = [
  ...editorHookIntegrations,
  claudeCodeHooksIntegration,
];
