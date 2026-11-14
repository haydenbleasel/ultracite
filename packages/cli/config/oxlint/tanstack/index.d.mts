declare const config: {
  overrides: (
    | { files: string[]; rules: { "unicorn/filename-case": "off" } }
    | {
        files: string[];
        rules: {
          "unicorn/filename-case": "off";
          "unicorn/no-abusive-eslint-disable": "off";
        };
      }
  )[];
};

export default config;
