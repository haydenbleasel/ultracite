declare const config: {
  jsPlugins: { name: string; specifier: string }[];
  rules: {
    "gdp-ts/no-define-proof": "error";
    "gdp-ts/no-proof-assertion": "error";
    "gdp-ts/no-type-assertion": "error";
  };
  overrides: (
    | {
        files: string[];
        rules: {
          "gdp-ts/no-define-proof": "off";
          "gdp-ts/no-exported-prover": "error";
          "gdp-ts/no-proof-assertion": "off";
          "gdp-ts/no-type-assertion": "off";
          "typescript/no-empty-interface": [
            "error",
            { allowSingleExtends: true },
          ];
          "typescript/no-empty-object-type": [
            "error",
            { allowInterfaces: "with-single-extends" },
          ];
        };
      }
    | { files: string[]; rules: { "gdp-ts/no-type-assertion": "off" } }
  )[];
};

export default config;
