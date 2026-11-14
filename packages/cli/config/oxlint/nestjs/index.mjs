import { defineConfig } from "oxlint";

export default defineConfig({
  rules: {
    // The autofix turns the import of an injected class into `import type`.
    // Constructor injection needs the class at runtime (`emitDecoratorMetadata`
    // records it as the parameter's type), so the fix compiles and then fails
    // to resolve the dependency.
    "typescript/consistent-type-imports": "off",
  },
});
