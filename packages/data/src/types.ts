/* e.g. .cursor/hooks.json or .claude/settings.json */
export interface HooksConfig {
  getContent: (command: string) => Record<string, unknown>;
  path: string;
}
