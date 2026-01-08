/* e.g. .cursor/hooks.json or .claude/settings.json */
export interface HooksConfig {
  path: string;
  getContent: (command: string) => Record<string, unknown>;
}
