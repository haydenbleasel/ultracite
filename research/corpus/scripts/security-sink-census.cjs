// Syntactic census of security sinks across the corpus, independent of any lint rule, joined to
// what the security rules in Oxlint, ESLint and Biome report on the same lines.
//
// Every file from collect-files.cjs is parsed with typescript-estree (syntax only, nothing is
// executed) and each sink is recorded with its kind, a sub-kind describing its argument, the
// lines it spans and a permalink at the pinned SHA:
//
//   code execution   eval (direct, global-object member, indirect, reference), the Function
//                    constructor (new/call, aliases), setTimeout/setInterval/setImmediate/
//                    execScript with a string/template/concatenation, node:vm
//   HTML             writes to innerHTML/outerHTML/srcdoc, insertAdjacentHTML,
//                    createContextualFragment, setHTMLUnsafe, document.write/writeln,
//                    setAttribute("srcdoc"), dangerouslySetInnerHTML (JSX and object props),
//                    createElement("script")
//   URLs             string/template literals containing javascript:
//   cookies          writes to document.cookie (reads counted separately)
//   randomness       Math.random() (secure crypto calls counted for contrast)
//   links            target="_blank" in JSX (with rel/href details), window.open
//   secrets          string literals under secret-like names, known secret formats, URLs with
//                    credentials, IP-address literals
//
// The join: a sink is "seen" by a linter when a security rule (per inventory.json) reports a
// diagnostic on a line the sink spans. Oxlint rows come from rule-census.cjs (raw and reported
// mode, so suppressions are visible), ESLint and Biome rows from security-linters.cjs --corpus.
//
// Usage (from the repo root):
//   node research/corpus/scripts/security-sink-census.cjs [--topic security-rules]
// Writes results/<topic>/sink-census.json (counts, coverage, every site) and
// out/security-rules/<repo>.sinks.json (sites with code context, for the worksheet).
"use strict";

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const { collect } = require("./collect-files.cjs");
const config = require("./repos.json");
const lib = require("./security-lib.cjs");
const { dirs } = require("./tools.cjs");

const estreePath = require.resolve("@typescript-eslint/typescript-estree", {
  paths: [dirs.tsParser],
});
const { parse } = require(estreePath);
const { visitorKeys } = require(
  require.resolve("@typescript-eslint/visitor-keys", { paths: [dirs.tsParser] })
);

// ── helpers ────────────────────────────────────────────────────────────
const GLOBAL_OBJECTS = new Set([
  "window",
  "globalThis",
  "self",
  "global",
  "top",
  "parent",
  "frames",
]);
const TIMERS = new Set([
  "setTimeout",
  "setInterval",
  "setImmediate",
  "execScript",
]);
const VM_FUNCTIONS = new Set([
  "runInNewContext",
  "runInThisContext",
  "runInContext",
  "compileFunction",
]);
const HTML_PROPERTIES = new Set(["innerHTML", "outerHTML", "srcdoc"]);
const HTML_METHODS = new Set([
  "insertAdjacentHTML",
  "createContextualFragment",
  "setHTMLUnsafe",
  "parseHTMLUnsafe",
]);
const SECURE_RANDOM = new Set([
  "getRandomValues",
  "randomUUID",
  "randomBytes",
  "randomInt",
  "randomFillSync",
  "randomFill",
]);
const SECRET_NAME =
  /(?:pass(?:word|wd|phrase)|\bpwd\b|secret|token|api_?key|apikey|private_?key|credential|auth_?key|access_?key|signing_?key)/i;
const SECRET_FORMATS = [
  ["aws-access-key-id", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  [
    "github-token",
    /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{50,}/,
  ],
  ["slack-token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["stripe-key", /\b[rs]k_live_[A-Za-z0-9]{20,}/],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  ["npm-token", /\bnpm_[A-Za-z0-9]{36}\b/],
];
const URL_CREDENTIALS = /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@'"`]+:[^/\s@'"`]+@/i;
const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV4_IN =
  /(?:^|[/@[\s])((?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d))(?=$|[:/\]\s])/;
// An IPv6 literal: full form (eight groups) or compressed with "::".
const isIpv6 = (s) => {
  const v = s.replace(/^\[|\]$/g, "");
  if (!/^[0-9a-f:]+$/i.test(v) || !v.includes(":")) {
    return false;
  }
  const groups = v.split(":");
  return v.includes("::")
    ? groups.length <= 8 && v.split("::").length === 2
    : groups.length === 8 && groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g));
};
// Expand an IPv6 literal to eight numeric groups.
const ipv6Groups = (s) => {
  const v = s.replace(/^\[|\]$/g, "");
  const [head, tail = ""] = v.includes("::") ? v.split("::") : [v, null];
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const fill = v.includes("::") ? Array(8 - h.length - t.length).fill("0") : [];
  return [...h, ...fill, ...t].map((g) => Number.parseInt(g || "0", 16));
};

const unwrap = (node) => {
  let n = node;
  while (
    n &&
    [
      "ChainExpression",
      "TSAsExpression",
      "TSNonNullExpression",
      "TSSatisfiesExpression",
      "TSTypeAssertion",
    ].includes(n.type)
  ) {
    n = n.expression;
  }
  return n;
};
const staticName = (member) => {
  if (!member || member.type !== "MemberExpression") {
    return null;
  }
  if (!member.computed && member.property.type === "Identifier") {
    return member.property.name;
  }
  if (
    member.computed &&
    member.property.type === "Literal" &&
    typeof member.property.value === "string"
  ) {
    return member.property.value;
  }
  if (
    member.computed &&
    member.property.type === "TemplateLiteral" &&
    member.property.expressions.length === 0
  ) {
    return member.property.quasis[0].value.cooked;
  }
  return null;
};
const isGlobalObject = (node) => {
  const n = unwrap(node);
  return n?.type === "Identifier" && GLOBAL_OBJECTS.has(n.name);
};
const isDocument = (node) => {
  const n = unwrap(node);
  if (n?.type === "Identifier") {
    return n.name === "document";
  }
  return n?.type === "MemberExpression" && staticName(n) === "document";
};
const stringValue = (node) => {
  const n = unwrap(node);
  if (n?.type === "Literal" && typeof n.value === "string") {
    return n.value;
  }
  if (n?.type === "TemplateLiteral" && n.expressions.length === 0) {
    return n.quasis[0].value.cooked;
  }
  return null;
};
// What kind of value an argument is, without types.
const argKind = (node) => {
  const n = unwrap(node);
  if (!n) {
    return "none";
  }
  if (n.type === "Literal") {
    return typeof n.value === "string"
      ? "string-literal"
      : `${typeof n.value}-literal`;
  }
  if (n.type === "TemplateLiteral") {
    return n.expressions.length === 0 ? "string-literal" : "template";
  }
  if (n.type === "BinaryExpression" && n.operator === "+") {
    return "concatenation";
  }
  if (["ArrowFunctionExpression", "FunctionExpression"].includes(n.type)) {
    return "function";
  }
  if (n.type === "CallExpression") {
    return "call";
  }
  if (n.type === "Identifier" || n.type === "MemberExpression") {
    return "identifier";
  }
  if (n.type === "ObjectExpression") {
    return "object";
  }
  return n.type;
};
const entropy = (s) => {
  const counts = {};
  for (const ch of s) {
    counts[ch] = (counts[ch] ?? 0) + 1;
  }
  return Object.values(counts).reduce((e, c) => {
    const p = c / s.length;
    return e - p * Math.log2(p);
  }, 0);
};
const ipClass = (ip) => {
  if (ip.includes(":")) {
    const g = ipv6Groups(ip);
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return "loopback";
    if (g.every((x) => x === 0)) return "unspecified";
    if (g[0] >= 0xfe_80 && g[0] <= 0xfe_bf) return "link-local";
    if (g[0] >= 0xfc_00 && g[0] <= 0xfd_ff) return "private";
    if (g[0] === 0x20_01 && g[1] === 0x0d_b8) return "documentation";
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xff_ff)
      return "ipv4-mapped";
    return "public";
  }
  const [a, b, c] = ip.split(".").map(Number);
  if (a === 127) return "loopback";
  if (a === 0) return "unspecified";
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168))
    return "private";
  if (a === 169 && b === 254) return "link-local";
  if (
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  )
    return "documentation";
  if (a >= 224) return "multicast-or-reserved";
  return "public";
};
const nameOf = (node) => {
  if (!node) {
    return null;
  }
  if (node.type === "Identifier") {
    return node.name;
  }
  if (node.type === "PrivateIdentifier") {
    return node.name;
  }
  if (node.type === "Literal") {
    return String(node.value);
  }
  if (node.type === "MemberExpression") {
    return staticName(node);
  }
  return null;
};

// ── the walk ───────────────────────────────────────────────────────────
// Names bound to eval or Function (`const F = Function`), and the names that are called, so an
// aliased constructor is recorded at its call (`new F(...)`) rather than at the alias.
const findAliases = (ast) => {
  const aliases = new Map();
  const called = new Set();
  const walk = (node) => {
    if (!node || typeof node.type !== "string") {
      return;
    }
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier") {
      const init = unwrap(node.init);
      if (
        init?.type === "Identifier" &&
        (init.name === "Function" || init.name === "eval")
      ) {
        aliases.set(node.id.name, init.name);
      }
    }
    if (
      (node.type === "CallExpression" || node.type === "NewExpression") &&
      unwrap(node.callee).type === "Identifier"
    ) {
      called.add(unwrap(node.callee).name);
    }
    for (const k of visitorKeys[node.type] ?? []) {
      const child = node[k];
      for (const c of Array.isArray(child) ? child : [child]) {
        walk(c);
      }
    }
  };
  walk(ast);
  return { aliases, called };
};

const findSinks = (ast) => {
  const sites = [];
  const { aliases, called } = findAliases(ast);
  const add = (kind, sub, node, extra = {}) =>
    sites.push({
      endLine: node.loc.end.line,
      kind,
      line: node.loc.start.line,
      sub,
      ...extra,
    });

  const visit = (node, parent, key) => {
    if (!node || typeof node.type !== "string") {
      return;
    }
    switch (node.type) {
      case "CallExpression":
      case "NewExpression": {
        const callee = unwrap(node.callee);
        const isNew = node.type === "NewExpression";
        // eval
        if (callee.type === "Identifier" && callee.name === "eval") {
          add("eval", "direct", node, { arg: argKind(node.arguments[0]) });
        } else if (
          callee.type === "MemberExpression" &&
          staticName(callee) === "eval" &&
          isGlobalObject(callee.object)
        ) {
          add("eval", `${unwrap(callee.object).name}.eval`, node, {
            arg: argKind(node.arguments[0]),
          });
        } else if (callee.type === "SequenceExpression") {
          const last = unwrap(callee.expressions.at(-1));
          if (
            (last.type === "Identifier" && last.name === "eval") ||
            (last.type === "MemberExpression" && staticName(last) === "eval")
          ) {
            add("eval", "indirect", node, { arg: argKind(node.arguments[0]) });
          }
        }
        // eval or Function through a local alias
        if (callee.type === "Identifier" && aliases.has(callee.name)) {
          const target = aliases.get(callee.name);
          add(
            target === "eval" ? "eval" : "function-constructor",
            `aliased (const ${callee.name} = ${target})`,
            node,
            { arg: argKind(node.arguments.at(-1)) }
          );
        }
        // Function constructor
        if (callee.type === "Identifier" && callee.name === "Function") {
          add(
            "function-constructor",
            isNew ? "new Function" : "Function()",
            node,
            { arg: argKind(node.arguments.at(-1)) }
          );
        } else if (
          callee.type === "MemberExpression" &&
          staticName(callee) === "Function" &&
          isGlobalObject(callee.object)
        ) {
          add("function-constructor", "global.Function", node, {
            arg: argKind(node.arguments.at(-1)),
          });
        } else if (
          callee.type === "MemberExpression" &&
          staticName(callee) === "constructor"
        ) {
          const obj = unwrap(callee.object);
          if (
            ["ArrowFunctionExpression", "FunctionExpression"].includes(
              obj.type
            ) ||
            (obj.type === "MemberExpression" &&
              staticName(obj) === "prototype" &&
              unwrap(obj.object).type === "Identifier" &&
              unwrap(obj.object).name === "Function") ||
            (obj.type === "CallExpression" &&
              staticName(unwrap(obj.callee)) === "getPrototypeOf")
          ) {
            add("function-constructor", "constructor of a function", node, {
              arg: argKind(node.arguments.at(-1)),
            });
          }
        }
        // timers with strings
        const timerName =
          callee.type === "Identifier"
            ? callee.name
            : callee.type === "MemberExpression" &&
                isGlobalObject(callee.object)
              ? staticName(callee)
              : null;
        if (timerName && TIMERS.has(timerName) && node.arguments.length > 0) {
          const kind = argKind(node.arguments[0]);
          if (["string-literal", "template", "concatenation"].includes(kind)) {
            add("timer-string", `${timerName}(${kind})`, node, { arg: kind });
          }
        }
        // node:vm
        const calleeName =
          callee.type === "Identifier" ? callee.name : staticName(callee);
        if (calleeName && VM_FUNCTIONS.has(calleeName)) {
          add("vm", calleeName, node, { arg: argKind(node.arguments[0]) });
        }
        if (
          isNew &&
          calleeName === "Script" &&
          (callee.type === "Identifier" ||
            (callee.type === "MemberExpression" &&
              nameOf(unwrap(callee.object)) === "vm"))
        ) {
          add("vm", "new Script", node, { arg: argKind(node.arguments[0]) });
        }
        // HTML methods
        if (callee.type === "MemberExpression") {
          const name = staticName(callee);
          if (HTML_METHODS.has(name)) {
            add("html-method", name, node, {
              arg: argKind(
                name === "insertAdjacentHTML"
                  ? node.arguments[1]
                  : node.arguments[0]
              ),
            });
          }
          if (
            (name === "write" || name === "writeln") &&
            isDocument(callee.object)
          ) {
            add("document-write", `document.${name}`, node, {
              arg: argKind(node.arguments[0]),
            });
          }
          if (name === "setAttribute") {
            const attr = stringValue(node.arguments[0])?.toLowerCase();
            if (attr === "srcdoc") {
              add("html-property", "setAttribute(srcdoc)", node, {
                arg: argKind(node.arguments[1]),
              });
            } else if (
              attr === "target" &&
              stringValue(node.arguments[1])?.toLowerCase() === "_blank"
            ) {
              add("target-blank", "setAttribute(target, _blank)", node, {});
            }
          }
          if (
            name === "createElement" &&
            stringValue(node.arguments[0])?.toLowerCase() === "script"
          ) {
            add("script-element", "createElement(script)", node, {});
          }
          if (
            name === "random" &&
            unwrap(callee.object).type === "Identifier" &&
            unwrap(callee.object).name === "Math"
          ) {
            add("math-random", "Math.random()", node, {});
          }
          if (SECURE_RANDOM.has(name)) {
            add("secure-random", name, node, {});
          }
          if (name === "open" && isGlobalObject(callee.object)) {
            const target = stringValue(node.arguments[1]);
            const features = stringValue(node.arguments[2]);
            add(
              "window-open",
              `window.open(${node.arguments.length} args)`,
              node,
              {
                features: features ?? (node.arguments[2] ? "dynamic" : null),
                noopener: /noopener|noreferrer/i.test(features ?? ""),
                target: target ?? (node.arguments[1] ? "dynamic" : null),
              }
            );
          }
        }
        break;
      }
      case "Identifier": {
        // eval and Function referenced as values (aliases, Reflect.apply(eval), const F = Function)
        if ((node.name === "eval" || node.name === "Function") && parent) {
          const isCallee =
            (parent.type === "CallExpression" ||
              parent.type === "NewExpression") &&
            key === "callee";
          const isProperty =
            (parent.type === "MemberExpression" &&
              key === "property" &&
              !parent.computed) ||
            (parent.type === "Property" && key === "key" && !parent.computed) ||
            parent.type === "MethodDefinition" ||
            parent.type === "PropertyDefinition" ||
            parent.type === "TSPropertySignature";
          const isDeclaration =
            [
              "FunctionDeclaration",
              "VariableDeclarator",
              "ImportSpecifier",
              "TSTypeReference",
              "TSQualifiedName",
              "TSInterfaceHeritage",
              "TSTypeQuery",
              "ClassDeclaration",
            ].includes(parent.type) && key !== "init";
          const isTypeOnly =
            parent.type === "TSTypeReference" ||
            (parent.type.startsWith("TS") &&
              parent.type !== "TSAsExpression" &&
              parent.type !== "TSNonNullExpression");
          const isInstanceof =
            parent.type === "BinaryExpression" &&
            parent.operator === "instanceof";
          const isSequenceCallee = parent.type === "SequenceExpression";
          const isGlobalMember =
            parent.type === "MemberExpression" && key === "object";
          // `const F = Function` where F is called later: recorded at the call instead.
          const isCalledAlias =
            parent.type === "VariableDeclarator" &&
            key === "init" &&
            parent.id.type === "Identifier" &&
            called.has(parent.id.name);
          if (
            !isCallee &&
            !isProperty &&
            !isDeclaration &&
            !isTypeOnly &&
            !isInstanceof &&
            !isSequenceCallee &&
            !isGlobalMember &&
            !isCalledAlias
          ) {
            add(
              node.name === "eval" ? "eval" : "function-constructor",
              `${node.name} as a value`,
              node,
              { context: parent.type }
            );
          }
        }
        break;
      }
      case "AssignmentExpression": {
        const left = unwrap(node.left);
        if (left.type === "MemberExpression") {
          const name = staticName(left);
          if (HTML_PROPERTIES.has(name)) {
            add("html-property", `${name} ${node.operator}`, node, {
              arg: argKind(node.right),
            });
          }
          if (name === "cookie" && isDocument(left.object)) {
            add("cookie-write", `document.cookie ${node.operator}`, node, {
              arg: argKind(node.right),
            });
          }
          if (
            name === "target" &&
            stringValue(node.right)?.toLowerCase() === "_blank"
          ) {
            add("target-blank", ".target = _blank", node, {});
          }
        }
        checkSecretAssignment(left, node.right, node);
        break;
      }
      case "MemberExpression": {
        const name = staticName(node);
        const isWrite =
          parent?.type === "AssignmentExpression" && key === "left";
        if (!isWrite && name === "cookie" && isDocument(node.object)) {
          add("cookie-read", "document.cookie read", node, {});
        }
        if (!isWrite && name === "innerHTML") {
          add("html-read", "innerHTML read", node, {});
        }
        break;
      }
      case "VariableDeclarator":
        checkSecretAssignment(node.id, node.init, node);
        break;
      case "Property":
        if (parent?.type === "ObjectExpression") {
          const name = nameOf(node.key);
          if (name === "dangerouslySetInnerHTML") {
            add("dangerously-set-inner-html", "object property", node, {
              arg: argKind(node.value),
            });
          }
          checkSecretAssignment(node.key, node.value, node);
        }
        break;
      case "PropertyDefinition":
        checkSecretAssignment(node.key, node.value, node);
        break;
      case "JSXAttribute": {
        const name = node.name.type === "JSXIdentifier" ? node.name.name : null;
        if (name === "dangerouslySetInnerHTML") {
          add("dangerously-set-inner-html", "JSX prop", node, {
            arg: argKind(node.value?.expression),
          });
        }
        if (name === "srcDoc" || name === "srcdoc") {
          add("html-property", "JSX srcDoc", node, {
            arg: argKind(node.value?.expression ?? node.value),
          });
        }
        if (name === "target") {
          const v = node.value;
          const literal = v?.type === "Literal" ? v.value : null;
          const containsBlank = literal
            ? /^_blank$/i.test(literal)
            : v?.type === "JSXExpressionContainer" &&
              JSON.stringify(v.expression, (k, val) =>
                k === "parent" ? undefined : val
              ).includes('"_blank"');
          if (containsBlank) {
            const opening = parent;
            const attrs = opening.attributes;
            const attr = (n) =>
              attrs.find((a) => a.type === "JSXAttribute" && a.name.name === n);
            const rel = attr("rel");
            const href = attr("href") ?? attr("action");
            const relValue =
              rel?.value?.type === "Literal"
                ? rel.value.value
                : rel
                  ? "dynamic"
                  : null;
            const hrefValue =
              href?.value?.type === "Literal"
                ? href.value.value
                : href
                  ? "dynamic"
                  : null;
            add(
              "target-blank",
              literal ? "JSX target=_blank" : "JSX target={…_blank…}",
              opening,
              {
                element:
                  opening.name.type === "JSXIdentifier"
                    ? opening.name.name
                    : "member",
                href:
                  hrefValue === null
                    ? "none"
                    : hrefValue === "dynamic"
                      ? "dynamic"
                      : /^(?:https?:)?\/\//i.test(hrefValue)
                        ? "external"
                        : "internal",
                noreferrer: /noreferrer/i.test(relValue ?? ""),
                rel: relValue,
                spread: attrs.some((a) => a.type === "JSXSpreadAttribute"),
              }
            );
          }
        }
        break;
      }
      case "Literal": {
        if (typeof node.value === "string") {
          checkStringForSinks(node.value, node, parent);
        } else if (node.regex && /javascript:/i.test(node.regex.pattern)) {
          add("javascript-url", "regex mentioning javascript:", node, {});
        }
        break;
      }
      case "TemplateElement":
        checkStringForSinks(node.value.cooked ?? node.value.raw, node, parent);
        break;
      default:
        break;
    }
    for (const k of visitorKeys[node.type] ?? []) {
      const child = node[k];
      if (Array.isArray(child)) {
        for (const c of child) {
          visit(c, node, k);
        }
      } else if (child) {
        visit(child, node, k);
      }
    }
  };

  function checkStringForSinks(value, node, parent) {
    if (/javascript:/i.test(value)) {
      add(
        "javascript-url",
        /^\s*javascript:/i.test(value)
          ? "starts with javascript:"
          : "mentions javascript:",
        node,
        { context: parent?.type }
      );
    }
    for (const [format, re] of SECRET_FORMATS) {
      if (re.test(value)) {
        add("secret", `format:${format}`, node, { length: value.length });
      }
    }
    if (URL_CREDENTIALS.test(value)) {
      add("secret", "url-credentials", node, {});
    }
    const trimmed = value.trim();
    if (IPV4.test(trimmed) || isIpv6(trimmed)) {
      add("ip-literal", ipClass(trimmed), node, { value: trimmed });
    } else {
      const m = IPV4_IN.exec(value);
      if (m && value.length < 200) {
        add("ip-literal", `${ipClass(m[1])} (in a longer string)`, node, {
          value: m[1],
        });
      }
    }
  }

  function checkSecretAssignment(target, value, node) {
    const name = nameOf(target);
    if (!name || !SECRET_NAME.test(name)) {
      return;
    }
    const v =
      stringValue(value) ??
      (unwrap(value)?.type === "LogicalExpression"
        ? stringValue(unwrap(value).right)
        : null);
    if (v === null || v.length < 6 || /\s/.test(v)) {
      return;
    }
    add("secret", "secret-like name = string literal", node, {
      entropy: Math.round(entropy(v) * 100) / 100,
      length: v.length,
      name,
      value: v.length > 60 ? `${v.slice(0, 60)}…` : v,
    });
  }

  visit(ast, null, null);
  return sites;
};

// ── which rules are expected to see which kind ─────────────────────────
const EXPECTED = {
  "cookie-write": ["unicorn/no-document-cookie", "suspicious/noDocumentCookie"],
  "dangerously-set-inner-html": [
    "react/no-danger",
    "security/noDangerouslySetInnerHtml",
  ],
  "document-write": [
    "unicorn/no-unsafe-dom-html",
    "react-doctor/no-document-write",
  ],
  eval: [
    "no-eval",
    "react-doctor/no-eval",
    "sonarjs/code-eval",
    "security/noGlobalEval",
  ],
  "function-constructor": [
    "no-new-func",
    "sonarjs/code-eval",
    "react-doctor/no-eval",
    "typescript/no-implied-eval",
    "@typescript-eslint/no-implied-eval",
    "nursery/noImpliedEval",
  ],
  "html-method": ["unicorn/no-unsafe-dom-html"],
  "html-property": ["github/no-inner-html", "unicorn/no-unsafe-dom-html"],
  "html-read": ["github/no-inner-html"],
  "ip-literal": ["sonarjs/no-hardcoded-ip"],
  "javascript-url": [
    "no-script-url",
    "react/jsx-no-script-url",
    "security/noScriptUrl",
    "sonarjs/code-eval",
  ],
  "math-random": ["sonarjs/pseudo-random"],
  "script-element": ["github/no-dynamic-script-tag"],
  secret: [
    "sonarjs/no-hardcoded-passwords",
    "sonarjs/no-hardcoded-secrets",
    "sonarjs/hardcoded-secret-signatures",
    "react-doctor/no-secrets-in-client-code",
    "security/noSecrets",
  ],
  "target-blank": [
    "react/jsx-no-target-blank",
    "security/noBlankTarget",
    "sonarjs/link-with-target-blank",
  ],
  "timer-string": [
    "no-implied-eval",
    "typescript/no-implied-eval",
    "react-doctor/no-eval",
    "@typescript-eslint/no-implied-eval",
    "nursery/noImpliedEval",
  ],
  vm: ["sonarjs/code-eval"],
  "window-open": ["sonarjs/link-with-target-blank"],
};
// Kinds that are sinks (classified by hand); the rest are counted for context.
const SINK_KINDS = [
  "eval",
  "function-constructor",
  "timer-string",
  "vm",
  "html-property",
  "html-method",
  "document-write",
  "dangerously-set-inner-html",
  "script-element",
  "javascript-url",
  "cookie-write",
  "math-random",
  "target-blank",
  "window-open",
  "secret",
  "ip-literal",
];
const CONTEXT_KINDS = ["html-read", "cookie-read", "secure-random"];

const loadRows = (path) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")).hits : [];

const main = () => {
  const inventory = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "inventory.json"), "utf8")
  );
  const securityRules = new Set([
    ...inventory.rules.flatMap((r) => [r.oxlint.name, r.eslint.name]),
    ...inventory.biome.map((r) => r.rule),
  ]);
  const census = JSON.parse(
    readFileSync(join(lib.RESULTS_DIR, "rule-census.json"), "utf8")
  );
  const allSites = [];
  const perRepo = {};
  const unmatched = [];
  for (const { name, github } of config.repos) {
    const { repo, files } = collect(name);
    const sha = census.repos[name]?.sha ?? lib.gitHead(repo.root);
    const rows = {
      biome: loadRows(join(lib.OUT_DIR, `${name}.biome.json`)),
      "biome-off": loadRows(join(lib.OUT_DIR, `${name}.biome-off.json`)),
      eslint: loadRows(join(lib.OUT_DIR, `${name}.eslint.json`)),
      oxlint: loadRows(
        join(lib.HERE, "out", "rule-census", lib.TOPIC, `${name}.raw.json`)
      ),
      "oxlint-reported": loadRows(
        join(lib.HERE, "out", "rule-census", lib.TOPIC, `${name}.reported.json`)
      ),
    };
    // index rule rows by file → line → [rule]
    const index = {};
    for (const [tool, list] of Object.entries(rows)) {
      for (const d of list) {
        const rule = tool.startsWith("biome") ? d.rule : d.rule;
        if (!securityRules.has(rule)) {
          continue;
        }
        ((index[tool] ??= {})[d.file] ??= {})[d.line] ??= [];
        index[tool][d.file][d.line].push(rule);
      }
    }
    const used = new Set();
    const sites = [];
    let parseErrors = 0;
    for (const rel of files) {
      const text = readFileSync(join(repo.root, rel), "utf8");
      let ast;
      try {
        ast = parse(text, {
          jsx: /\.(?:tsx|jsx|js|mjs|cjs)$/.test(rel),
          loc: true,
          range: true,
        });
      } catch {
        try {
          ast = parse(text, { jsx: false, loc: true, range: true });
        } catch {
          parseErrors++;
          continue;
        }
      }
      const lines = text.split("\n");
      for (const s of findSinks(ast)) {
        const site = { repo: name, file: rel, ...s };
        site.code = lines[s.line - 1].trim().slice(0, 160);
        site.permalink = lib.permalink(github, sha, rel, s.line, s.endLine);
        site.rules = {};
        for (const tool of Object.keys(rows)) {
          const hits = new Set();
          for (let l = s.line; l <= s.endLine; l++) {
            for (const r of index[tool]?.[rel]?.[l] ?? []) {
              hits.add(r);
              used.add(`${tool}|${rel}|${l}|${r}`);
            }
          }
          site.rules[tool] = [...hits].sort();
        }
        const expected = new Set(EXPECTED[s.kind] ?? []);
        site.expectedHit = Object.fromEntries(
          Object.entries(site.rules).map(([tool, list]) => [
            tool,
            list.filter((r) => expected.has(r)),
          ])
        );
        sites.push(site);
      }
    }
    // Security-rule rows that landed on no sink of any kind, for explanation.
    for (const [tool, byFile] of Object.entries(index)) {
      if (tool === "oxlint-reported") {
        continue;
      }
      for (const [file, byLine] of Object.entries(byFile)) {
        for (const [line, list] of Object.entries(byLine)) {
          for (const rule of list) {
            if (!used.has(`${tool}|${file}|${line}|${rule}`)) {
              const text =
                readFileSync(join(repo.root, file), "utf8").split("\n")[
                  Number(line) - 1
                ] ?? "";
              unmatched.push({
                code: text.trim().slice(0, 140),
                file,
                line: Number(line),
                repo: name,
                rule,
                tool,
              });
            }
          }
        }
      }
    }
    sites.forEach((s, i) => {
      s.id = `${name}:${String(i + 1).padStart(3, "0")}`;
    });
    allSites.push(...sites);
    const counts = {};
    for (const s of sites) {
      counts[s.kind] = (counts[s.kind] ?? 0) + 1;
    }
    perRepo[name] = {
      counts,
      dogfood: lib.DOGFOOD.has(name),
      files: files.length,
      lines: census.repos[name]?.lines ?? null,
      parseErrors,
      sha,
    };
    mkdirSync(lib.OUT_DIR, { recursive: true });
    writeFileSync(
      join(lib.OUT_DIR, `${name}.sinks.json`),
      JSON.stringify({ repo: name, sha, sites }, null, 1)
    );
    console.log(
      name,
      JSON.stringify(counts),
      parseErrors ? `parse errors: ${parseErrors}` : ""
    );
  }

  // ── coverage per kind ──────────────────────────────────────────────
  const pooled = allSites.filter((s) => !lib.DOGFOOD.has(s.repo));
  const pooledLines = Object.entries(perRepo)
    .filter(([, r]) => !r.dogfood)
    .reduce((s, [, r]) => s + r.lines, 0);
  const coverage = {};
  for (const kind of [...SINK_KINDS, ...CONTEXT_KINDS]) {
    const list = pooled.filter((s) => s.kind === kind);
    const seen = (tool) =>
      list.filter((s) => s.expectedHit[tool].length > 0).length;
    const subs = {};
    for (const s of list) {
      subs[s.sub] ??= { n: 0, oxlint: 0, eslint: 0, biome: 0 };
      subs[s.sub].n++;
      for (const tool of ["oxlint", "eslint", "biome"]) {
        if (s.expectedHit[tool].length > 0) {
          subs[s.sub][tool]++;
        }
      }
    }
    const byRule = {};
    for (const s of list) {
      for (const tool of ["oxlint", "eslint", "biome", "biome-off"]) {
        for (const r of s.expectedHit[tool]) {
          byRule[`${tool}:${r}`] = (byRule[`${tool}:${r}`] ?? 0) + 1;
        }
      }
    }
    coverage[kind] = {
      byRepo: Object.fromEntries(
        Object.keys(perRepo).map((n) => [
          n,
          allSites.filter((s) => s.repo === n && s.kind === kind).length,
        ])
      ),
      byRule,
      bySub: subs,
      per10k: lib.per10k(list.length, pooledLines),
      seenBy: {
        biome: seen("biome"),
        "biome (off in Ultracite)": seen("biome-off"),
        eslint: seen("eslint"),
        oxlint: seen("oxlint"),
        "oxlint (reported)": seen("oxlint-reported"),
      },
      sink: SINK_KINDS.includes(kind),
      total: list.length,
    };
  }
  // Linters report files in a nondeterministic order; sort so the output is stable.
  unmatched.sort(
    (a, b) =>
      a.repo.localeCompare(b.repo) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.rule.localeCompare(b.rule) ||
      a.tool.localeCompare(b.tool)
  );
  const unmatchedSummary = {};
  for (const u of unmatched.filter((x) => !lib.DOGFOOD.has(x.repo))) {
    const k = `${u.tool}:${u.rule}`;
    unmatchedSummary[k] = (unmatchedSummary[k] ?? 0) + 1;
  }
  const result = {
    coverage,
    expectedRules: EXPECTED,
    generated: new Date().toISOString().slice(0, 10),
    note: "A site is seen by a linter when one of the rules expected for its kind reports on a line the site spans. Oxlint = core + react + js-plugins, raw mode (directives neutralised); 'oxlint (reported)' honours in-file suppressions. ESLint = Ultracite's core + react presets restricted to security rules (react rules only on .jsx/.tsx, as configured). Biome = security rules Ultracite enables; 'off in Ultracite' = noSecrets and nursery rules. Pooled numbers exclude Ultracite's own CLI.",
    pooled: {
      lines: pooledLines,
      repos: Object.keys(perRepo).filter((n) => !perRepo[n].dogfood),
    },
    repos: perRepo,
    sites: allSites.map(({ code, ...s }) => ({ ...s, code })),
    unmatched,
    unmatchedSummary,
  };
  writeFileSync(
    join(lib.RESULTS_DIR, "sink-census.json"),
    `${JSON.stringify(result, null, 1)}\n`
  );
  console.log("pooled sinks by kind:");
  for (const [kind, c] of Object.entries(coverage)) {
    console.log(
      `  ${kind.padEnd(28)} ${String(c.total).padStart(4)}  ox ${c.seenBy.oxlint}  es ${c.seenBy.eslint}  bi ${c.seenBy.biome}  bi-off ${c.seenBy["biome (off in Ultracite)"]}`
    );
  }
  console.log("security-rule hits on no sink:", unmatchedSummary);
};

main();
