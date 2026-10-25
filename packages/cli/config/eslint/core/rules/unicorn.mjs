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
  // v79 stopped reporting unknown calls during module evaluation unless
  // checkUnknownCalls is set; this keeps the check v77 ran. Known pure
  // helpers such as defineConfig() and React's memo() stay allowed.
  "unicorn/no-top-level-side-effects": ["error", { checkUnknownCalls: true }],
  // Upstream already skips call arguments in TypeScript files, since a
  // required `T | undefined` parameter needs an explicit `undefined` (#851).
  // Matches oxlint, which skips them everywhere.
  "unicorn/no-useless-undefined": ["error", { checkArguments: false }],
  // Also combine guards whose bodies repeat the same statements before the
  // same exit. oxlint has no prefer-combined-guards, so this is ESLint-only.
  "unicorn/prefer-combined-guards": [
    "error",
    { checkMultiStatementBodies: true },
  ],
  "unicorn/prefer-global-this": "off",
  // Also merge branches that differ only in the callee or a computed member,
  // as in (test ? a : b)(value). Both options are off by default upstream,
  // and prefer-ternary takes the same two.
  "unicorn/prefer-minimal-ternary": [
    "error",
    { checkComputedMemberAccess: true, checkVaryingBase: true },
  ],
  "unicorn/prefer-string-raw": "off",
  // Enforces Temporal over Date, but Temporal still lacks broad runtime
  // support; unicorn ships it off by default. Premature to enforce.
  "unicorn/prefer-temporal": "off",
  "unicorn/prefer-ternary": [
    "error",
    "always",
    { checkComputedMemberAccess: true, checkVaryingBase: true },
  ],
  "unicorn/prefer-top-level-await": "off",
  "unicorn/text-encoding-identifier-case": ["error", { withDash: true }],
};

const config = Object.assign(baseRules, overrideRules);

// prefer-await runs without type information, but then it matches
// `.then()`, `.catch()` and `.finally()` by name and reports non-promise APIs
// such as Zod's `.catch()` fallback (#854). With a TypeScript program it
// skips receivers that aren't promises, so it runs only there.
export const typeAwareOnlyRules = new Set(["unicorn/prefer-await"]);

// The rules unicorn marks `meta.docs.requiresTypeChecking` register nothing
// without a TypeScript program, so they run only with the type-aware preset.
const needsTypes = (key) => {
  const { docs } = rules[key.slice("unicorn/".length)]?.meta ?? {};

  return docs?.requiresTypeChecking === true || typeAwareOnlyRules.has(key);
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
