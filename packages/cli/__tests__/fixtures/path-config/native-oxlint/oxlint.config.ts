export default {
  rules: { "no-console": "error" },
  ignorePatterns: ["native-generated/**"],
  overrides: [
    {
      files: ["packages/shared/src/**/*.ts"],
      rules: { "no-debugger": "error" },
    },
  ],
};
