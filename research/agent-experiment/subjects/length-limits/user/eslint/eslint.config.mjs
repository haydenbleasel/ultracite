import core from "ultracite/eslint/core";

export default [
  ...core,
  {
    rules: {
      "max-lines-per-function": "error",
    },
  },
];
