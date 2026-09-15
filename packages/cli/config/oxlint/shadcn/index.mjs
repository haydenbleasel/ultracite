import { defineConfig } from "oxlint";

// @shadcn/lint (https://github.com/shadcn-ui/lint) is an agent-first linter
// for Tailwind v4 design systems: it reads your components, variants, and
// theme, then explains what is wrong and what to use instead when a class
// breaks the design system. shadcn/ui is not required — it works with any
// Tailwind v4 component directory and theme.
//
// This preset is opt-in: extend it alongside core (and any framework preset)
// only when you want design-system enforcement and accept the extra
// dependency plus the slower JS-plugin lint pass. Install the plugin in your
// project, then extend the preset:
//
//   npm install -D @shadcn/lint
//
//   import { defineConfig } from "oxlint";
//   import core from "ultracite/oxlint/core";
//   import shadcn from "ultracite/oxlint/shadcn";
//
//   export default defineConfig({
//     extends: [core, shadcn],
//     ignorePatterns: core.ignorePatterns,
//     jsPlugins: shadcn.jsPlugins,
//   });
//
// `jsPlugins: shadcn.jsPlugins` re-declares the plugin package on the root
// config: oxlint loads it from the extended preset either way, but dependency
// analyzers such as Knip only read `jsPlugins` off the root and would
// otherwise flag the package as unused (#784).
//
// Components and the theme are discovered from `components.json`, or from
// `components/ui` / `src/components/ui` next to the nearest package.json.
// For another location, set `settings.shadcn.ui` (e.g. "@/ds") on the root
// config — oxlint does not merge `settings` from extended configs.
//
// Every rule is enabled at "error", following the upstream "all rules"
// configuration. `allow: ["layout"]` lets pages place components (margin,
// width, flex, position) while keeping their appearance (padding, colors,
// typography, shape) in the component's variants. Narrow or widen the
// policy per component with `contracts` in your own config.
export default defineConfig({
  jsPlugins: [{ name: "shadcn", specifier: "@shadcn/lint" }],
  rules: {
    "shadcn/no-arbitrary-values": ["error", { allow: ["layout"] }],
    "shadcn/no-inline-styles": "error",
    "shadcn/no-raw-colors": "error",
    "shadcn/no-restyle": ["error", { allow: ["layout"] }],
    "shadcn/no-unknown-classes": "error",
    "shadcn/require-static-classes": "error",
  },
  overrides: [
    {
      // Components own their appearance: the UI directory may restyle sibling
      // components, needs structural arbitrary values such as `ring-[3px]`,
      // and passes its own variant functions (`buttonVariants()`) as class
      // values, which require-static-classes cannot resolve. no-raw-colors,
      // no-inline-styles, and no-unknown-classes stay on inside it. Add your
      // own override with the same shape for a UI directory elsewhere (e.g.
      // "packages/ui/src/components/**").
      files: ["**/components/ui/**"],
      rules: {
        "shadcn/no-arbitrary-values": "off",
        "shadcn/no-restyle": "off",
        "shadcn/require-static-classes": "off",
      },
    },
  ],
});
