import plugin from "eslint-plugin-unicorn";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) =>
    !rules[key].meta.deprecated &&
    // CSS-only rules (meta.languages without "js/js", e.g.
    // prefer-explicit-viewport-units) fail config validation when
    // configured for JS files under ESLint 10.
    (rules[key].meta.languages?.includes("js/js") ?? true)
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`unicorn/${key}`, "error"])
);

// Overrides mirror the oxlint core config (config/oxlint/core/index.mjs),
// which is the benchmark for rule decisions across linters.
const overrideRules = {
  // Renamed from unicorn/prefer-dom-node-dataset in v65.
  "unicorn/dom-node-dataset": "off",
  "unicorn/explicit-length-check": "off",
  "unicorn/max-nested-calls": "off",
  // Renamed from unicorn/prevent-abbreviations in v68; same allowList option.
  "unicorn/name-replacements": [
    "error",
    {
      allowList: {
        generateStaticParams: true,
        getInitialProps: true,
        getServerSideProps: true,
        getStaticPaths: true,
        getStaticProps: true,
      },
    },
  ],
  "unicorn/no-array-callback-reference": "off",
  // Strips the leading `*` from JSDoc lines, fighting the conventional
  // documentation-comment style that the formatter preserves.
  "unicorn/no-asterisk-prefix-in-documentation-comments": "off",
  "unicorn/no-keyword-prefix": "off",
  // Its fixer wraps the inner ternary in parentheses that Prettier strips,
  // so every `fix` run ping-pongs. eslint-config-prettier turns it off for
  // the same reason; the core `no-nested-ternary` still reports.
  "unicorn/no-nested-ternary": "off",
  "unicorn/no-null": "off",
  "unicorn/no-process-exit": "off",
  // Also combine guards whose bodies repeat the same statements before the
  // same exit. oxlint has no prefer-combined-guards, so this is ESLint-only.
  "unicorn/prefer-combined-guards": [
    "error",
    { checkMultiStatementBodies: true },
  ],
  "unicorn/prefer-global-this": "off",
  "unicorn/prefer-string-raw": "off",
  // Enforces Temporal over Date, but Temporal still lacks broad runtime
  // support; unicorn ships it off by default. Premature to enforce.
  "unicorn/prefer-temporal": "off",
  "unicorn/prefer-top-level-await": "off",
  "unicorn/text-encoding-identifier-case": ["error", { withDash: true }],
};

const config = Object.assign(baseRules, overrideRules);

// The rules unicorn marks `meta.docs.requiresTypeChecking` register nothing
// without a TypeScript program, so they run only with the type-aware preset.
const needsTypes = (key) => {
  const { docs } = rules[key.slice("unicorn/".length)]?.meta ?? {};

  return docs?.requiresTypeChecking === true;
};

const pickRules = (typeChecked) =>
  Object.fromEntries(
    Object.entries(config).filter(([key]) => needsTypes(key) === typeChecked)
  );

/** The rules core runs, which work without type information. */
export const syntacticRules = pickRules(false);

/** The rules the type-aware preset adds, which need a TypeScript program. */
export const typeCheckedRules = pickRules(true);

export default config;
