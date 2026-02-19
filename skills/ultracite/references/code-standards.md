# Ultracite Code Standards

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

## Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers — extract constants with descriptive names

## Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

## Async & Promises

- Always `await` promises in async functions — don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

## React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

## Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully — don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

## Code Organization

- Keep functions focused and under reasonable cognitive complexity limits (max 20)
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

## Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

## Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

## Formatting

- 2-space indentation
- LF line endings
- 80-character line width
- Semicolons always
- Double quotes (single quotes in JSX)
- ES5 trailing commas
- Arrow parentheses always
- Bracket spacing enabled

## Style Rules

- No enums — use objects with `as const`
- No nested ternary operators
- No non-null assertions (`!`)
- Kebab-case filenames enforced
- `useImportType` for type-only imports
- Readonly class properties by default
- Sorted imports, JSX attributes, interface members, and object properties

## Framework-Specific

**Next.js:** Use `<Image>` component for images. Use App Router metadata API for head elements. Use Server Components for async data fetching.

**React 19+:** Use ref as a prop instead of `React.forwardRef`.

**Solid/Svelte/Vue/Qwik:** Use `class` and `for` attributes (not `className` or `htmlFor`).

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests — use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat — avoid excessive `describe` nesting

## Overrides

Ultracite relaxes rules in specific contexts:
- **Config files** (`*.config.{js,ts,...}`): Relaxed export and complexity rules
- **Test files** (`*.test.*`, `__tests__/**`): No cognitive complexity limit, `console` and `any` allowed
- **Scripts/bin files**: `console` and `process.env` allowed
- **Storybook files**: Unused variable/import rules relaxed
- **Build output** (`dist/`, `.next/`, `node_modules/`): Formatter and linter disabled entirely
