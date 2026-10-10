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
  /**
   * The shape earlier versions wrote, when it differs from getContent: a
   * re-run removes generated hooks in that shape so they don't run twice.
   */
  getLegacyContent?: (command: string) => JsonObject;
  /**
   * Where earlier versions wrote this hook, when the host has since moved its
   * hooks file. Ultracite's hook comes out of it; the user's own hooks are
   * copied to `path` first, since a host that reads `path` stops reading the
   * old file.
   */
  legacyPath?: string;
  path: string;
}
