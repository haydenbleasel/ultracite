export const core = [
  // Accessibility (a11y)

  "Avoid `accessKey` attr.",
  'No `aria-hidden="true"` on focusable els.',
  "No ARIA roles, states, props on unsupported els.",
  "Avoid distracting els.",
  "Use `scope` prop only on `<th>` els.",
  "No non-interactive ARIA roles on interactive els.",
  "Label els need text and associated input.",
  "No event handlers on non-interactive els.",
  "No interactive ARIA roles on non-interactive els.",
  "No `tabIndex` on non-interactive els.",
  "No positive integers on `tabIndex` prop.",
  "No `image`, `picture`, or `photo` in img alt props.",
  "No explicit role matching implicit role.",
  "Valid role attrs on static, visible els with click handlers.",
  "Use `title` el for `svg` els.",
  "Provide meaningful alt text for all els requiring it.",
  "Anchors need accessible content.",
  "Assign `tabIndex` to non-interactive els with `aria-activedescendant`.",
  "Include all required ARIA attrs for els with ARIA roles.",
  "Use valid ARIA props for the el's role.",
  "Use `type` attr on `button` els.",
  "Make els with interactive roles and handlers focusable.",
  "Heading els need accessible content.",
  "Add `lang` attr to `html` el.",
  "Use `title` attr on `iframe` els.",
  "Pair `onClick` with `onKeyUp`, `onKeyDown`, or `onKeyPress`.",
  "Pair `onMouseOver`/`onMouseOut` with `onFocus`/`onBlur`.",
  "Add caption tracks to audio and video els.",
  "Use semantic els over role attrs.",
  "All anchors must be valid and navigable.",
  "Use valid ARIA props.",
  "Use valid, non-abstract ARIA roles.",
  "Use valid ARIA state and prop values.",
  "Use valid values for `autocomplete` attr.",
  "Use correct ISO language codes in `lang` attr.",
  "Include generic font family in font families.",

  // Complexity

  "No consecutive spaces in regex literals.",
  "Avoid `arguments`.",
  "No primitive type aliases or misleading types.",
  "Avoid comma operator.",
  "No empty type params in type aliases and interfaces.",
  "Keep fns under Cognitive Complexity limit.",
  "Limit nesting depth of `describe()` in tests.",
  "No unnecessary boolean casts.",
  "No unnecessary callbacks on `flatMap`.",
  "Use `for...of` over `Array.forEach`.",
  "No classes with only static members.",
  "No `this` and `super` in static contexts.",
  "No unnecessary catch clauses.",
  "No unnecessary constructors.",
  "No unnecessary `continue`.",
  "No empty exports.",
  "No unnecessary escape sequences in regex literals.",
  "No unnecessary fragments.",
  "No unnecessary labels.",
  "No unnecessary nested blocks.",
  "No renaming imports, exports, or destructured assignments to same name.",
  "No unnecessary string or template literal concatenation.",
  "No `String.raw` without escape sequences.",
  "No useless cases in switch statements.",
  "Use simpler alternatives to ternary operators when possible.",
  "No useless `this` aliasing.",
  "No `any` or `unknown` as type constraints.",
  "No initializing vars to `undefined`.",
  "Avoid `void` operator.",
  "Use arrow fns over function expressions.",
  "Use `Date.now()` for milliseconds since Unix Epoch.",
  "Use `.flatMap()` over `map().flat()`.",
  "Use `indexOf`/`lastIndexOf` over `findIndex`/`findLastIndex` for simple lookups.",
  "Use literal property access over computed property access.",
  "Use binary, octal, or hex literals over `parseInt()`.",
  "Use concise optional chains over chained logical expressions.",
  "Use regex literals over `RegExp` constructor.",
  "Use base 10 or underscore separators for number literal object member names.",
  "Remove redundant terms from logical expressions.",
  "Use `while` loops over `for` loops when initializer and update aren't needed.",

  // Correctness

  "No reassigning `const` vars.",
  "No constant expressions in conditions.",
  "No `Math.min`/`Math.max` to clamp values where result is constant.",
  "No return values from constructors.",
  "No empty character classes in regex literals.",
  "No empty destructuring patterns.",
  "No `__dirname` and `__filename` in global scope.",
  "No calling global object props as fns.",
  "No declaring fns and `var` accessible outside their block.",
  "Instantiate builtins correctly.",
  "Use `super()` correctly in classes.",
  "Use standard direction values for linear gradient fns.",
  "Use valid named grid areas in CSS Grid Layouts.",
  "Use `@import` at-rules in valid positions.",
  "No vars and params before their declaration.",
  "Include `var` fn for CSS vars.",
  "No `\\8` and `\\9` escape sequences in strings.",
  "No literal numbers that lose precision.",
  "No configured els.",
  "No assigning where both sides are same.",
  "No return values from setters.",
  "Compare string case modifications with compliant values.",
  "No lexical declarations in switch clauses.",
  "No undeclared vars.",
  "No unknown CSS value fns.",
  "No unknown media feature names.",
  "No unknown props.",
  "No unknown pseudo-class selectors.",
  "No unknown pseudo-element selectors.",
  "No unknown type selectors.",
  "No unknown CSS units.",
  "No unmatchable An+B selectors.",
  "No unreachable code.",
  "Call `super()` exactly once before accessing `this` in constructors.",
  "No control flow statements in `finally` blocks.",
  "No optional chaining where `undefined` is not allowed.",
  "No unused fn params.",
  "No unused imports.",
  "No unused labels.",
  "No unused private class members.",
  "No unused vars.",
  "No return values from fns with return type `void`.",
  "Specify all dependencies correctly in React hooks.",
  "Specify names for GraphQL operations.",
  "Call React hooks from top level of component fns.",
  "Use `isNaN()` when checking for NaN.",
  'Use `{ type: "json" }` for JSON module imports.',
  "Use radix arg with `parseInt()`.",
  "Start JSDoc comment lines with single asterisk.",
  "Move `for` loop counters in right direction.",
  "Compare `typeof` expressions to valid values.",
  "Include `yield` in generator fns.",

  // Nursery

  "No importing deprecated exports.",
  "No duplicate dependencies.",
  "No Promises where they're likely a mistake.",
  "No non-null assertions after optional chaining.",
  "No shadowing vars from outer scope.",
  "No expression statements that aren't fn calls or assignments.",
  "No useless `undefined`.",
  "Add `href` attr to `<a>` els.",
  "Use consistent arrow fn bodies.",
  "Use either `interface` or `type` consistently.",
  "Specify deletion date with `@deprecated` directive.",
  "Make switch-case statements exhaustive.",
  "Add `width` and `height` attrs to `<img>` els.",
  "Limit number of fn params.",
  "Sort CSS utility classes.",

  // Performance

  "No spread syntax on accumulators.",
  "No barrel files.",
  "No `delete` operator.",
  "No dynamic namespace import access.",
  "No namespace imports.",
  "No duplicate polyfills from Polyfill.io.",
  "Use `preconnect` attr with Google Fonts.",
  "Declare regex literals at top level.",

  // Security

  'Add `rel="noopener"` when using `target="_blank"`.',
  "No dangerous JSX props.",
  "No both `children` and `dangerouslySetInnerHTML` props.",
  "No global `eval()`.",

  // Style

  "No callbacks in async tests and hooks.",
  "No TS enums.",
  "No exporting imported vars.",
  "No type annotations for vars initialized with literals.",
  "No magic numbers without named constants.",
  "No TS namespaces.",
  "No negating `if` conditions when there's an `else` clause.",
  "No nested ternary expressions.",
  "No non-null assertions (`!`).",
  "No reassigning fn params.",
  "No parameter props in class constructors.",
  "No specified global var names.",
  "No importing specified modules.",
  "No specified user-defined types.",
  "No constants where value is upper-case version of name.",
  "Use `String.slice()` over `String.substr()` and `String.substring()`.",
  "No template literals without interpolation or special chars.",
  "No `else` blocks when `if` block breaks early.",
  "No yoda expressions.",
  "No `Array` constructors.",
  "Use `as const` over literal type annotations.",
  "Use `at()` over integer index access.",
  "Follow curly brace conventions.",
  "Use `else if` over nested `if` in `else` clauses.",
  "Use single `if` over nested `if` clauses.",
  "Use either `T[]` or `Array<T>` consistently.",
  "Use `new` for all builtins except `String`, `Number`, and `Boolean`.",
  "Use consistent accessibility modifiers on class props and methods.",
  "Declare object literals consistently.",
  "Use `const` for vars only assigned once.",
  "Put default and optional fn params last.",
  "Include `default` clause in switch statements.",
  "Specify reason arg with `@deprecated` directive.",
  "Explicitly initialize each enum member value.",
  "Use `**` operator over `Math.pow`.",
  "Use `export type` for types.",
  "Use kebab-case, ASCII filenames.",
  "Use `for...of` over `for` loops with array index access.",
  "Use `<>...</>` over `<Fragment>...</Fragment>`.",
  "Capitalize all enum values.",
  "Place getters and setters for same prop adjacent to each other.",
  "Use `import type` for types.",
  "Use literal values for all enum members.",
  "Use `node:assert/strict` over `node:assert`.",
  "Use `node:` protocol for Node.js builtin modules.",
  "Use `Number` props over global ones.",
  "Use numeric separators in numeric literals.",
  "Use object spread over `Object.assign()` for new objects.",
  "Mark members `readonly` if never modified outside constructor.",
  "No extra closing tags for components without children.",
  "Use assignment operator shorthand.",
  "Use fn types over object types with call signatures.",
  "Add description param to `Symbol()`.",
  "Use template literals over string concatenation.",
  "Use `new` when throwing an error.",
  "No throwing non-`Error` values.",
  "Use `String.trimStart()`/`String.trimEnd()` over `String.trimLeft()`/`String.trimRight()`.",
  "No overload signatures that can be unified.",
  "No lower specificity selectors after higher specificity selectors.",
  "No `@value` rule in CSS modules.",

  // Suspicious

  "No `alert`, `confirm`, and `prompt`.",
  "Use standard constants over approximated literals.",
  "No assigning in expressions.",
  "No async fns as Promise executors.",
  "No `!` pattern in first position of `files.includes`.",
  "No bitwise operators.",
  "No reassigning exceptions in catch clauses.",
  "No reassigning class members.",
  "No inserting comments as text nodes.",
  "No comparing against `-0`.",
  "No labeled statements that aren't loops.",
  "No `void` type outside generic or return types.",
  "No `console`.",
  "No TS const enums.",
  "No expressions where operation doesn't affect value.",
  "No control chars in regex literals.",
  "No `debugger`.",
  "No assigning directly to `document.cookie`.",
  "Use `===` and `!==`.",
  "No duplicate `@import` rules.",
  "No duplicate case labels.",
  "No duplicate class members.",
  "No duplicate custom props within declaration blocks.",
  "No duplicate conditions in if-else-if chains.",
  "No duplicate fields in GraphQL operations.",
  "No duplicate names within font families.",
  "No two keys with same name in objects.",
  "No duplicate fn param names.",
  "No duplicate props within declaration blocks.",
  "No duplicate selectors within keyframe blocks.",
  "No duplicate hooks in describe blocks.",
  "No empty CSS blocks.",
  "No empty block statements and static blocks.",
  "No empty interfaces.",
  "No letting vars evolve into `any` type through reassignments.",
  "No `any` type.",
  "No `export` or `module.exports` in test files.",
  "No misusing non-null assertion operator (`!`).",
  "No fallthrough in switch clauses.",
  "No focused tests.",
  "No reassigning fn declarations.",
  "No assigning to native objects and read-only global vars.",
  "Use `Number.isFinite` over global `isFinite`.",
  "Use `Number.isNaN` over global `isNaN`.",
  "No implicit `any` type on var declarations.",
  "No assigning to imported bindings.",
  "No `!important` within keyframe declarations.",
  "No irregular whitespace chars.",
  "No labels that share name with var.",
  "No chars made with multiple code points in char classes.",
  "Use `new` and `constructor` properly.",
  "Place assertion fns inside `it()` fn calls.",
  "No shorthand assign when var appears on both sides.",
  "No octal escape sequences in strings.",
  "No `Object.prototype` builtins directly.",
  "No `quickfix.biome` in editor settings.",
  "No redeclaring vars, fns, classes, and types in same scope.",
  "No redundant `use strict`.",
  "No comparing where both sides are same.",
  "No shadowing restricted names.",
  "No shorthand props that override related longhand props.",
  "No disabled tests.",
  "No sparse arrays.",
  "No template literal placeholder syntax in regular strings.",
  "No `then` prop.",
  "No `@ts-ignore` directive.",
  "No `let` or `var` vars that are read but never assigned.",
  "No unknown at-rules.",
  "No merging interface and class declarations unsafely.",
  "No unsafe negation (`!`).",
  "No unnecessary escapes in strings.",
  "No useless backreferences in regex literals.",
  "No `var`.",
  "No `with` statements.",
  "No separating overload signatures.",
  "Use `await` in async fns.",
  "Use correct syntax for ignoring folders in config.",
  "Put default clauses in switch statements last.",
  "Pass message value when creating built-in errors.",
  "Return value from get methods.",
  "Use recommended display strategy with Google Fonts.",
  "Include `if` statement in for-in loops.",
  "Use `Array.isArray()` over `instanceof Array`.",
  "Return consistent values in iterable callbacks.",
  "Use `namespace` keyword over `module` keyword.",
  "Use digits arg with `Number#toFixed()`.",
  "Use static `Response` methods over `new Response()`.",
  "Use `use strict` directive in script files.",
];

export const react = [
  // Correctness

  "No passing children as props. Nest children between opening and closing tags.",
  "No defining components inside other components.",
  "No reassigning props in React components.",
  "No using return value from `ReactDOM.render()`.",
  "No adding children to void els like `<img>` and `<br>`.",
  "Specify all dependencies correctly in React hooks.",
  "Call React hooks from top level of component fns only.",
  "Add `key` prop to els in iterables.",

  // Nursery

  "No legacy `React.forwardRef`. Use ref as prop instead (React 19+).",
  "Use fn components over class components.",

  // Suspicious

  "No array indices as keys.",
  "No duplicate props in JSX.",
  "No semicolons that change JSX el semantics.",
];

export const next = [
  // Nursery

  "No async client components. Use server components for async operations.",

  // Performance

  "Use Next.js `<Image>` component over `<img>` el.",

  // Style

  "Use Next.js `next/head` or App Router metadata API over `<head>` el.",

  // Suspicious

  "No importing `next/document` in page files.",
  "No importing `next/head` in `_document.tsx`. Use `<Head>` from `next/document` instead.",
];

export const qwik = [
  // Nursery

  "No `useVisibleTask$`. Use `useTask$` or `useResource$` instead.",
  "Use `class` object syntax over string concatenation for dynamic classes.",
  "Explicitly capture vars from outer scopes in Qwik's `$` fns.",
  "Use Qwik-specific methods and APIs correctly.",

  // Suspicious

  "No React-specific props like `className` and `htmlFor`. Use `class` and `for` instead.",
];

export const solid = [
  // Correctness

  "No destructuring props in Solid components. Access props directly.",

  // Performance

  "Use `<For>` component for iterating over arrays.",

  // Suspicious

  "No React-specific props like `className` and `htmlFor`. Use `class` and `for` instead.",
];

export const svelte = [
  // Suspicious

  "No React-specific props like `className` and `htmlFor`. Use `class` and `for` instead.",
];

export const vue = [
  // Nursery

  "No object declarations for `data` option. Use fn that returns object.",
  "No duplicate keys in Vue component options.",
  "No Vue reserved keys like `$data`, `$props`, and `$el` in component options.",
  "No Vue reserved props like `key`, `ref`, and `is` as custom component props.",
  "Use multi-word component names to avoid conflicts with HTML els.",

  // Suspicious

  "No React-specific props like `className` and `htmlFor`. Use `class` and `for` instead.",
];

export const angular: string[] = [];
export const remix: string[] = [];
