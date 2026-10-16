/**
 * Returns the config with Bun's gaps removed from what it extends: rules
 * from oxlint's built-in plugins that `bun lint` doesn't implement (such as
 * `jsdoc/*` and `vue/*`) are dropped from every extended preset. Use it in
 * place of the `defineConfig` from `oxlint` or `oxfmt`, which Bun doesn't
 * need installed.
 */
export declare const defineConfig: <const Config extends object>(
  config: Config
) => Config;
