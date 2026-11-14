declare const config: {
  jsPlugins: { name: string; specifier: string }[];
  rules: {
    "anti-slop/no-array-filter-map": "error";
    "anti-slop/no-chained-type-assertions": "error";
    "anti-slop/no-conditional-empty-object-spread": "error";
    "anti-slop/no-known-value-widening": "error";
    "anti-slop/no-module-mocking": "error";
    "anti-slop/no-object-parameters": "error";
    "anti-slop/no-reduce-accumulator-copy": "error";
    "anti-slop/no-reflect-apply": "error";
    "anti-slop/no-reflect-get": "error";
    "anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: boolean }];
    "anti-slop/no-shape-in-symbol-names": "error";
    "anti-slop/no-unknown-parameters": "error";
    "anti-slop/no-unknown-returns": "error";
    "anti-slop/no-unknown-type-aliases": "error";
    "anti-slop/no-unsafe-dictionary-type": "error";
    "anti-slop/no-widen-then-assert": "error";
    "anti-slop/require-readable-spacing": "error";
    "anti-slop/require-safety-comment-for-type-assertion": "error";
    "typescript/consistent-indexed-object-style": "off";
    "unicorn/no-immediate-mutation": "off";
    "unicorn/prefer-reflect-apply": "off";
  };
};

export default config;
