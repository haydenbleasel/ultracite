import plugin from "eslint-plugin-unicorn";

const { rules } = plugin;

const availableKeys = Object.keys(rules).filter(
  (key) => !rules[key].meta.deprecated
);

const baseRules = Object.fromEntries(
  availableKeys.map((key) => [`unicorn/${key}`, "error"])
);

const overrideRules = {
  "unicorn/no-array-callback-reference": "off",
  "unicorn/no-keyword-prefix": "off",
  "unicorn/no-null": "off",
  "unicorn/prefer-dom-node-dataset": "off",
  "unicorn/prevent-abbreviations": [
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
};

const config = Object.assign(baseRules, overrideRules);

export default config;
