import { defineConfig } from "oxlint";

export default defineConfig({
  rules: {
    // The autofix turns the import of an injected class into `import type`.
    // Angular's compiler reads a constructor parameter's type to find its
    // injection token and can't use a type-only import, so the build fails
    // with NG2003 (an `@Injectable` without `strictInjectionParameters` fails
    // at runtime instead).
    "typescript/consistent-type-imports": "off",
  },
});
