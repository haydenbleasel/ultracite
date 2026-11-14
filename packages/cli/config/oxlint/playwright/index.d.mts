declare const config: {
  overrides: {
    files: string[];
    rules: {
      "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }];
    };
  }[];
  rules: Record<string, never>;
};

export default config;
