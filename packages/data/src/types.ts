/* e.g. .cursor/hooks.json, .claude/settings.json, or .codebuddy/settings.json */
export interface HooksConfig {
  getContent: (command: string) => Record<string, unknown>;
  path: string;
}
