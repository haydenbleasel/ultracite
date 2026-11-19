/* eslint-disable n/no-unpublished-import, n/no-extraneous-import, import-x/no-extraneous-dependencies, id-length */

import { plugin as nestjsTyped } from "@darraghor/eslint-plugin-nestjs-typed";

import nestjsRules from "./rules/nestjs.mjs";

const nestjs = [
  {
    files: ["**/*.ts"],
    plugins: {
      "@darraghor/nestjs-typed": nestjsTyped,
    },
    rules: {
      ...nestjsRules,
      // The autofix turns the import of an injected class into `import type`.
      // Constructor injection needs the class at runtime, so the fix compiles
      // and then fails to resolve the dependency. typescript-eslint only
      // holds back in a file with decorators when it can see
      // `experimentalDecorators` and `emitDecoratorMetadata`, from
      // `parserOptions` or from the tsconfig it reads with type information,
      // and core gives it neither.
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];

export default nestjs;
