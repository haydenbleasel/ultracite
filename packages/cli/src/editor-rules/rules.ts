export const core = [
  // Accessibility (a11y)

  "Enforce that the `accessKey` attribute is not used on any HTML element.",
  'Enforce that `aria-hidden="true"` is not set on focusable elements.',
  "Enforce that elements that do not support ARIA roles, states, and properties do not have those attributes.",
  "Enforces that no distracting elements are used.",
  "The scope prop should be used only on `<th>` elements.",
  "Enforce that non-interactive ARIA roles are not assigned to interactive HTML elements.",
  "Enforce that a label element or component has a text label and an associated input.",
  "Disallow use event handlers on non-interactive elements.",
  "Enforce that interactive ARIA roles are not assigned to non-interactive HTML elements.",
  "Enforce that `tabIndex` is not assigned to non-interactive HTML elements.",
  "Prevent the usage of positive integers on `tabIndex` property.",
  "Enforce img alt prop does not contain the word `image`, `picture`, or `photo`.",
  "Enforce explicit role property is not the same as implicit/default role property on an element.",
  "Enforce that static, visible elements (such as `<div>`) that have click handlers use the valid role attribute.",
  "Enforces the usage of the title element for the `svg` element.",
  "Enforce that all elements that require alternative text have meaningful information to relay back to the end user.",
  "Enforce that anchors have content and that the content is accessible to screen readers.",
  "Enforce that `tabIndex` is assigned to non-interactive HTML elements with aria-activedescendant.",
  "Enforce that elements with ARIA roles must have all required ARIA attributes for that role.",
  "Enforce that ARIA properties are valid for the roles that are supported by the element.",
  "Enforces the usage of the attribute `type` for the element button.",
  "Elements with an interactive role and interaction handlers must be focusable.",
  "Enforce that heading elements (`h1`, `h2`, etc.) have content and that the content is accessible to screen readers.",
  "Enforce that `html` element has `lang` attribute.",
  "Enforces the usage of the attribute title for the element iframe.",
  "Enforce `onClick` is accompanied by at least one of the following: `onKeyUp`, `onKeyDown`, `onKeyPress`.",
  "Enforce `onMouseOver` / `onMouseOut` are accompanied by `onFocus` / `onBlur`.",
  "Enforces that audio and video elements must have a track for captions.",
  "It detects the use of role attributes in JSX elements and suggests using semantic elements instead.",
  "Enforce that all anchors are valid, and they are navigable elements.",
  "Ensures that ARIA properties `aria-*` are all valid.",
  "Elements with ARIA roles must use a valid, non-abstract ARIA role.",
  "Enforce that ARIA state and property values are valid.",
  "Use valid values for the autocomplete attribute on input elements.",
  "Ensure that the attribute passed to the `lang` attribute is a correct ISO language and/or country.",
  "Disallow a missing generic family keyword within font families (CSS).",

  // Complexity

  "Disallow unclear usage of consecutive space characters in regular expression literals.",
  "Disallow the use of arguments.",
  "Disallow primitive type aliases and misleading types.",
  "Disallow comma operator.",
  "Disallow empty type parameters in type aliases and interfaces.",
  "Disallow functions that exceed a given Cognitive Complexity score.",
  "This rule enforces a maximum depth to nested `describe()` in test files.",
  "Disallow unnecessary boolean casts.",
  "Disallow to use unnecessary callback on flatMap.",
  "Prefer `for...of` statement instead of `Array.forEach`.",
  "This rule reports when a class has no non-static members.",
  "Disallow `this` and `super` in static contexts.",
  "Disallow unnecessary catch clauses.",
  "Disallow unnecessary constructors.",
  "Avoid using unnecessary continue.",
  "Disallow empty exports that don't change anything in a module file.",
  "Disallow unnecessary escape sequence in regular expression literals.",
  "Disallow unnecessary fragments.",
  "Disallow unnecessary labels.",
  "Disallow unnecessary nested block statements.",
  "Disallow renaming import, export, and destructured assignments to the same name.",
  "Disallow unnecessary concatenation of string or template literals.",
  "Disallow unnecessary `String.raw` function in template string literals without any escape sequence.",
  "Disallow useless case in switch statements.",
  "Disallow ternary operators when simpler alternatives exist.",
  "Disallow useless `this` aliasing.",
  "Disallow using `any` or `unknown` as type constraint.",
  "Disallow initializing variables to `undefined`.",
  "Disallow the use of `void` operators, which is not a familiar operator.",
  "Use arrow functions over function expressions.",
  "Use `Date.now()` to get the number of milliseconds since the Unix Epoch.",
  "Promotes the use of `.flatMap()` when `map().flat()` are used together.",
  "Prefer `Array#{indexOf,lastIndexOf}()` over `Array#{findIndex,findLastIndex}()` when looking for the index of an item.",
  "Enforce the usage of a literal access to properties over computed property access.",
  "Disallow `parseInt()` and `Number.parseInt()` in favor of binary, octal, and hexadecimal literals.",
  "Enforce using concise optional chain instead of chained logical expressions.",
  "Enforce the use of the regular expression literals instead of the `RegExp` constructor if possible.",
  "Disallow number literal object member names which are not base 10 or use underscore as separator.",
  "Discard redundant terms from logical expressions.",
  "Enforce the use of while loops instead of for loops when the initializer and update expressions are not needed.",

  // Correctness

  "Prevents from having const variables being re-assigned.",
  "Disallow constant expressions in conditions.",
  "Disallow the use of `Math.min` and `Math.max` to clamp a value where the result itself is constant.",
  "Disallow returning a value from a constructor.",
  "Disallow empty character classes in regular expression literals.",
  "Disallows empty destructuring patterns.",
  "Disallow the use of `__dirname` and `__filename` in the global scope.",
  "Disallow calling global object properties as functions.",
  "Disallow function and `var` declarations that are accessible outside their block.",
  "Ensure that builtins are correctly instantiated.",
  "Prevents the incorrect use of `super()` inside classes.",
  "Disallow non-standard direction values for linear gradient functions (CSS).",
  "Disallows invalid named grid areas in CSS Grid Layouts (CSS).",
  "Disallow the use of `@import` at-rules in invalid positions (CSS).",
  "Disallow the use of variables and function parameters before their declaration.",
  "Disallow missing `var` function for css variables (CSS).",
  "Disallow `\\8` and `\\9` escape sequences in string literals.",
  "Disallow literal numbers that lose precision.",
  "Disallow the use of configured elements.",
  "Disallow assignments where both sides are exactly the same.",
  "Disallow returning a value from a setter.",
  "Disallow comparison of expressions modifying the string case with non-compliant value.",
  "Disallow lexical declarations in switch clauses.",
  "Prevents the usage of variables that haven't been declared inside the document.",
  "Disallow unknown CSS value functions (CSS).",
  "Disallow unknown media feature names (CSS).",
  "Disallow unknown properties (CSS).",
  "Disallow unknown pseudo-class selectors (CSS).",
  "Disallow unknown pseudo-element selectors (CSS).",
  "Disallow unknown type selectors (CSS).",
  "Disallow unknown CSS units (CSS).",
  "Disallow unmatchable An+B selectors (CSS).",
  "Disallow unreachable code.",
  "Ensures the `super()` constructor is called exactly once on every code path in a class constructor before this is accessed.",
  "Disallow control flow statements in finally blocks.",
  "Disallow the use of optional chaining in contexts where the undefined value is not allowed.",
  "Disallow unused function parameters.",
  "Disallow unused imports.",
  "Disallow unused labels.",
  "Disallow unused private class members.",
  "Disallow unused variables.",
  "Disallow returning a value from a function with the return type `void`.",
  "Enforce all dependencies are correctly specified in a React hook.",
  "Enforce specifying the name of GraphQL operations.",
  "Enforce that all React hooks are being called from the Top Level component functions.",
  "Require calls to `isNaN()` when checking for NaN.",
  'Enforces the use of with `{ type: "json" }` for JSON module imports.',
  "Enforce the consistent use of the radix argument when using `parseInt()`.",
  "Enforce JSDoc comment lines to start with a single asterisk, except for the first one.",
  "Enforce `for` loop update clause moving the counter in the right direction.",
  "This rule checks that the result of a `typeof` expression is compared to a valid value.",
  "Require generator functions to contain `yield`.",

  // Nursery

  "Restrict imports of deprecated exports.",
  "Prevent the listing of duplicate dependencies.",
  "Disallow Promises to be used in places where they are almost certainly a mistake.",
  "Disallow non-null assertions after optional chaining expressions.",
  "Disallow variable declarations from shadowing variables declared in the outer scope.",
  "Disallow expression statements that are neither a function call nor an assignment.",
  "Disallow the use of useless `undefined`.",
  "Enforces href attribute for `<a>` elements.",
  "Enforce consistent arrow function bodies.",
  "Enforce type definitions to consistently use either interface or type.",
  "Require the `@deprecated` directive to specify a deletion date.",
  "Require switch-case statements to be exhaustive.",
  "Enforces that `<img>` elements have both width and height attributes.",
  "Enforce a maximum number of parameters in function definitions.",
  "Enforce the sorting of CSS utility classes.",

  // Performance

  "Disallow the use of spread (`...`) syntax on accumulators.",
  "Disallow the use of barrel file.",
  "Disallow the use of the `delete` operator.",
  "Disallow accessing namespace imports dynamically.",
  "Disallow the use of namespace imports.",
  "Prevent duplicate polyfills from Polyfill.io.",
  "Ensure the `preconnect` attribute is used when using Google Fonts.",
  "Require regex literals to be declared at the top level.",

  // Security

  'Disallow `target="_blank"` attribute without `rel="noopener"`.',
  "Prevent the usage of dangerous JSX props.",
  "Report when a DOM element or a component uses both children and `dangerouslySetInnerHTML` prop.",
  "Disallow the use of global `eval()`.",

  // Style

  "Disallow using a callback in asynchronous tests and hooks.",
  "Disallow TypeScript enum.",
  "Disallow exporting an imported variable.",
  "Disallow type annotations for variables, parameters, and class properties initialized with a literal expression.",
  'Reports usage of "magic numbers" — numbers used directly instead of being assigned to named constants.',
  "Disallow the use of TypeScript's namespaces.",
  "Disallow negation in the condition of an if statement if it has an else clause.",
  "Disallow nested ternary expressions.",
  "Disallow non-null assertions using the `!` postfix operator.",
  "Disallow reassigning function parameters.",
  "Disallow the use of parameter properties in class constructors.",
  "This rule allows you to specify global variable names that you don't want to use in your application.",
  "Disallow specified modules when loaded by import or require.",
  "Disallow user defined types.",
  "Disallow the use of constants which its value is the upper-case version of its name.",
  "Enforce the use of `String.slice()` over `String.substr()` and `String.substring()`.",
  "Disallow template literals if interpolation and special-character handling are not needed.",
  "Disallow else block when the if block breaks early.",
  "Disallow the use of yoda expressions.",
  "Disallow `Array` constructors.",
  "Enforce the use of as const over literal type and type annotation.",
  "Use `at()` instead of integer index access.",
  "Requires following curly brace conventions.",
  "Enforce using `else if` instead of nested `if` in `else` clauses.",
  "Enforce using single `if` instead of nested `if` clauses.",
  "Require consistently using either `T[]` or `Array<T>`.",
  "Enforce the use of new for all builtins, except `String`, `Number` and `Boolean`.",
  "Require consistent accessibility modifiers on class properties and methods.",
  "Require the consistent declaration of object literals.",
  "Require const declarations for variables that are only assigned once.",
  "Enforce default function parameters and optional function parameters to be last.",
  "Require the `default` clause in switch statements.",
  "Require specifying the reason argument when using `@deprecated` directive.",
  "Require that each enum member value be explicitly initialized.",
  "Disallow the use of `Math.pow` in favor of the `**` operator.",
  "Promotes the use of export type for types.",
  "Enforce naming conventions for JavaScript and TypeScript filenames (kebab-case, ASCII).",
  "This rule recommends a for-of loop when in a for loop, the index used to extract an item from the iterated array.",
  "This rule enforces the use of `<>...</>` over `<Fragment>...</Fragment>`.",
  "Validates that all enum values are capitalized.",
  "Enforce that getters and setters for the same property are adjacent in class and object definitions.",
  "Promotes the use of `import type` for types.",
  "Require all enum members to be literal values.",
  "Promotes the usage of `node:assert/strict` over `node:assert`.",
  "Enforces using the `node:` protocol for Node.js builtin modules.",
  "Use the `Number` properties instead of global ones.",
  "Enforce the use of numeric separators in numeric literals.",
  "Prefer object spread over `Object.assign()` when constructing new objects.",
  "Enforce marking members as readonly if they are never modified outside the constructor.",
  "Prevent extra closing tags for components without children.",
  "Require assignment operator shorthand where possible.",
  "Enforce using function types instead of object type with call signatures.",
  "Require a description parameter for the `Symbol()`.",
  "Prefer template literals over string concatenation.",
  "Require new when throwing an error.",
  "Disallow throwing non-`Error` values.",
  "Enforce the use of `String.trimStart()` and `String.trimEnd()` over `String.trimLeft()` and `String.trimRight()`.",
  "Disallow overload signatures that can be unified into a single signature.",
  "Disallow a lower specificity selector from coming after a higher specificity selector (CSS).",
  "Disallow use of `@value` rule in css modules (CSS).",

  // Suspicious

  "Disallow the use of `alert`, `confirm`, and `prompt`.",
  "Use standard constants instead of approximated literals.",
  "Disallow assignments in expressions.",
  "Disallows using an async function as a Promise executor.",
  "Prevents the use of the `!` pattern in the first position of `files.includes` in the configuration file.",
  "Disallow bitwise operators.",
  "Disallow reassigning exceptions in catch clauses.",
  "Disallow reassigning class members.",
  "Prevent comments from being inserted as text nodes.",
  "Disallow comparing against `-0`.",
  "Disallow labeled statements that are not loops.",
  "Disallow void type outside of generic or return types.",
  "Disallow the use of `console`.",
  "Disallow TypeScript const enum.",
  "Disallow expressions where the operation doesn't affect the value.",
  "Prevents from having control characters and some escape sequences that match control characters in regular expression literals.",
  "Disallow the use of debugger.",
  "Disallow direct assignments to document.cookie.",
  "Require the use of `===` and `!==`.",
  "Disallow duplicate `@import` rules (CSS).",
  "Disallow duplicate case labels.",
  "Disallow duplicate class members.",
  "Disallow duplicate custom properties within declaration blocks (CSS).",
  "Disallow duplicate conditions in if-else-if chains.",
  "Disallow duplicated fields in GraphQL operations.",
  "Disallow duplicate names within font families (CSS).",
  "Disallow two keys with the same name inside objects.",
  "Disallow duplicate function parameter name.",
  "Disallow duplicate properties within declaration blocks (CSS).",
  "Disallow duplicate selectors within keyframe blocks (CSS).",
  "A describe block should not contain duplicate hooks.",
  "Disallow CSS empty blocks (CSS).",
  "Disallow empty block statements and static blocks.",
  "Disallow the declaration of empty interfaces.",
  "Disallow variables from evolving into any type through reassignments.",
  "Disallow the any type usage.",
  "Disallow using export or module.exports in files containing tests.",
  "Prevents the wrong usage of the non-null assertion operator `!` in TypeScript files.",
  "Disallow fallthrough of switch clauses.",
  "Disallow focused tests.",
  "Disallow reassigning function declarations.",
  "Disallow assignments to native objects and read-only global variables.",
  "Use `Number.isFinite` instead of global `isFinite`.",
  "Use `Number.isNaN` instead of global `isNaN`.",
  "Disallow use of implicit any type on variable declarations.",
  "Disallow assigning to imported bindings.",
  "Disallow invalid `!important` within keyframe declarations (CSS).",
  "Disallows the use of irregular whitespace characters.",
  "Disallow labels that share a name with a variable.",
  "Disallow characters made with multiple code points in character class syntax.",
  "Enforce proper usage of `new` and `constructor`.",
  "Checks that the assertion function, for example expect, is placed inside an `it()` function call.",
  "Disallow shorthand assign when variable appears on both sides.",
  "Disallow octal escape sequences in string literals.",
  "Disallow direct use of `Object.prototype` builtins.",
  "Disallow the use if `quickfix.biome` inside editor settings file.",
  "Disallow variable, function, class, and type redeclarations in the same scope.",
  "Prevents from having redundant `use strict`.",
  "Disallow comparisons where both sides are exactly the same.",
  "Disallow identifiers from shadowing restricted names.",
  "Disallow shorthand properties that override related longhand properties (CSS).",
  "Disallow disabled tests.",
  "Prevents the use of sparse arrays (arrays with holes).",
  "Disallow template literal placeholder syntax in regular strings.",
  "Disallow then property.",
  "Prevents the use of the TypeScript directive `@ts-ignore`.",
  "Disallow let or var variables that are read but never assigned.",
  "Disallow unknown at-rules (CSS).",
  "Disallow unsafe declaration merging between interfaces and classes.",
  "Disallow using unsafe negation (`!`).",
  "Disallow unnecessary escapes in string literals.",
  "Disallow useless backreferences in regular expression literals that always match an empty string.",
  "Disallow the use of `var`.",
  "Disallow `with` statements in non-strict contexts.",
  "Disallow the use of overload signatures that are not next to each other.",
  "Ensure async functions utilize `await`.",
  "Promotes the correct usage for ignoring folders in the configuration file.",
  "Enforce default clauses in switch statements to be last.",
  "Enforce passing a message value when creating a built-in error.",
  "Enforce get methods to always return a value.",
  "Enforces the use of a recommended display strategy with Google Fonts.",
  "Require for-in loops to include an `if` statement.",
  "Use `Array.isArray()` instead of `instanceof Array`.",
  "Enforce consistent return values in iterable callbacks.",
  "Require using the namespace keyword over the `module` keyword to declare TypeScript namespaces.",
  "Enforce using the digits argument with `Number#toFixed()`.",
  "Use static `Response` methods instead of `new Response()` constructor when possible.",
  "Enforce the use of the directive `use strict` in script files.",
];

export const react = [
  // Correctness

  "Prevent passing children as props. Children should be nested between the opening and closing tags.",
  "Prevent component definitions inside other components. This causes unnecessary re-renders.",
  "Prevent reassigning props in React components. Props should be treated as immutable.",
  "Prevent usage of the return value from `ReactDOM.render()`.",
  "Prevent void elements (like `<img>`, `<br>`) from having children.",
  "Enforce all dependencies are correctly specified in React hooks (useEffect, useCallback, useMemo).",
  "Enforce that all React hooks are called from the top level of component functions, not inside loops, conditions, or nested functions.",
  "Enforce that elements in iterables have a `key` prop for React's reconciliation.",

  // Nursery

  "Prevent usage of legacy `React.forwardRef`. Use ref as a prop instead (React 19+).",
  "Enforce using function components over class components in React.",

  // Suspicious

  "Prevent using array indices as keys. Array indices are not stable identifiers and can cause issues with component state.",
  "Prevent duplicate properties in JSX.",
  "Prevent semicolons that change the semantic of JSX elements.",
];

export const next = [
  // Nursery

  "Prevent async client components in Next.js. Client components should be synchronous; use server components for async operations.",

  // Performance

  "Disallow use of `<img>` HTML element. Use Next.js `<Image>` component instead for automatic image optimization.",

  // Style

  "Disallow use of `<head>` HTML element. Use Next.js `next/head` or App Router metadata API instead.",

  // Suspicious

  "Prevent importing `next/document` in page files. `_document.tsx` should only exist in `pages/_document.tsx`.",
  "Prevent importing `next/head` in `_document.tsx`. Use `<Head>` from `next/document` instead.",
];

export const qwik = [
  // Nursery

  "Prevent usage of `useVisibleTask$`. This hook runs code eagerly on the client, defeating Qwik's resumability. Use `useTask$` or `useResource$` instead when possible.",
  "Enforce using `class` object syntax instead of string concatenation for dynamic classes in Qwik.",
  "Enforce valid lexical scope in Qwik's `$` functions. Variables from outer scopes must be explicitly captured.",
  "Enforce correct usage of Qwik-specific methods and APIs.",

  // Suspicious

  "Disallow React-specific props like `className` and `htmlFor` in Qwik. Use `class` and `for` instead.",
];

export const solid = [
  // Correctness

  "Prevent destructuring props in Solid components. Destructuring breaks Solid's reactivity system. Access props directly instead.",

  // Performance

  "Enforce using `<For>` component for iterating over arrays in Solid. The `<For>` component is optimized for Solid's reactivity.",

  // Suspicious

  "Disallow React-specific props like `className` and `htmlFor` in Solid. Use `class` and `for` instead.",
];

export const svelte = [
  // Suspicious

  "Disallow React-specific props like `className` and `htmlFor` in Svelte. Use `class` and `for` instead.",
];

export const vue = [
  // Nursery

  "Prevent using object declaration for the `data` option in Vue components. The `data` option must be a function that returns an object.",
  "Prevent duplicate keys in Vue component options. Keys in `data`, `computed`, `methods`, etc. must be unique.",
  "Disallow Vue reserved keys like `$data`, `$props`, `$el`, etc. in component options.",
  "Disallow Vue reserved props like `key`, `ref`, and `is` as custom component props.",
  "Enforce multi-word component names to avoid conflicts with HTML elements. Single-word names like `Button` or `Card` should be avoided.",

  // Suspicious

  "Disallow React-specific props like `className` and `htmlFor` in Vue. Use `class` and `for` instead.",
];

export const angular: string[] = [];
export const remix: string[] = [];

export const rules = [
  ...core,
  ...react,
  ...next,
  ...qwik,
  ...solid,
  ...svelte,
  ...vue,
  ...angular,
  ...remix,
];
