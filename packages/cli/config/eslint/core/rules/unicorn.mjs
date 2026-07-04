import plugin from "eslint-plugin-unicorn";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`unicorn/${key}`, "error"])
);

const overrideRules = {
  // Renamed from unicorn/prefer-dom-node-dataset in v65.
  "unicorn/dom-node-dataset": "off",
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
  "unicorn/no-null": "off",
  // Enforces Temporal over Date, but Temporal still lacks broad runtime
  // support; unicorn ships it off by default. Premature to enforce.
  "unicorn/prefer-temporal": "off",
  "unicorn/text-encoding-identifier-case": ["error", { withDash: true }],
};

const config = Object.assign(baseRules, overrideRules);

export default config;
