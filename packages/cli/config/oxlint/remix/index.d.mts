declare const config: {
  overrides: {
    files: string[];
    rules: {
      "unicorn/filename-case": "off";
      "unicorn/no-abusive-eslint-disable": "off";
    };
  }[];
  rules: Record<string, never>;
};

export default config;
