/** A JSON-serializable value, as written to generated config files. */
export type JsonValue =
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }
  | null;

/** A JSON object, e.g. the root of a settings/hooks document. */
export type JsonObject = Record<string, JsonValue>;

/* e.g. .cursor/hooks.json, .claude/settings.json, or .codebuddy/settings.json */
export interface HooksConfig {
  getContent: (command: string) => JsonObject;
  path: string;
}
