// A tiny local ESLint plugin whose single rule, `census/functions`, never reports anything.
// It records every function-like node into an in-process collector so we have a denominator.
//
// Unit of analysis: ESLint's `:function` selector = FunctionDeclaration | FunctionExpression |
// ArrowFunctionExpression. This is exactly the selector eslint-plugin-sonarjs's
// cognitive-complexity rule hooks (':function' / ':function:exit'), and exactly the set of nodes
// for which ESLint's code-path analysis starts a "function" code path (used by core `complexity`).
// Methods, getters, setters, constructors and object-literal methods are FunctionExpressions
// under a MethodDefinition/Property, so they are covered. TypeScript bodiless signatures
// (TSDeclareFunction, TSEmptyBodyFunctionExpression: overloads, abstract methods, `declare`)
// are NOT functions under this selector, for either rule, and are not counted.
//
// For each function we precompute the two report locations used by the real rules, so their
// messages can be joined back to the node:
//   - sonarjs: helpers/location.js getMainFunctionTokenLocation(node, node.parent, context)
//   - core complexity: ast-utils getFunctionHeadLoc(node, sourceCode)
"use strict";

const { join } = require("node:path");
const { load, dirs } = require("./tools.cjs");

const { astUtils, sonarLocation } = load();
const { getJsxShortCircuitNodes } = require(
  join(dirs.sonarjs, "cjs/helpers/jsx.js")
);

// Node types that open a nesting level for Cognitive Complexity (between a function and its
// nearest enclosing function). Used only to describe nested functions for the Biome comparison.
const NESTING_TYPES = new Set([
  "IfStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "SwitchStatement",
  "CatchClause",
  "ConditionalExpression",
]);

function controlFlowAncestors(node) {
  let count = 0;
  for (let p = node.parent; p && !astUtils.isFunction(p); p = p.parent) {
    if (!NESTING_TYPES.has(p.type)) continue;
    // `else if` does not nest; the test of an if/loop/ternary is not "inside" it.
    if (
      p.type === "IfStatement" &&
      p.parent?.type === "IfStatement" &&
      p.parent.alternate === p
    )
      continue;
    count++;
  }
  return count;
}

const posOf = (loc) => ({ line: loc.line, column: loc.column + 1 });

/** For an `else if`, climb to the first `if` of the chain. */
function chainHead(ifNode) {
  let head = ifNode;
  while (head.parent?.type === "IfStatement" && head.parent.alternate === head)
    head = head.parent;
  return head;
}

/** filename -> { functions: [], classFieldInitializers: number, staticBlocks: number } */
const collector = new Map();

const keyOf = (loc) =>
  loc
    ? `${loc.start.line}:${loc.start.column + 1}:${loc.end.line}:${loc.end.column + 1}`
    : null;

function enclosingClassName(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === "ClassBody") {
      const cls = p.parent;
      if (cls.id) return cls.id.name;
      if (
        cls.parent?.type === "VariableDeclarator" &&
        cls.parent.id.type === "Identifier"
      ) {
        return cls.parent.id.name;
      }
      return "<anonymous class>";
    }
  }
  return null;
}

function keyName(key, computed, sourceCode) {
  if (!key) return null;
  if (!computed && key.type === "Identifier") return key.name;
  if (key.type === "PrivateIdentifier") return `#${key.name}`;
  if (key.type === "Literal") return String(key.value);
  return `[${sourceCode.getText(key).slice(0, 40)}]`;
}

/** A short human name: `Class.method`, `name`, `<callback to foo>`, `<anonymous>`. */
function displayName(node, sourceCode) {
  const parent = node.parent;
  if (node.id?.name) {
    const cls =
      parent?.type === "MethodDefinition" ? enclosingClassName(node) : null;
    return cls ? `${cls}.${node.id.name}` : node.id.name;
  }
  if (
    parent?.type === "MethodDefinition" ||
    parent?.type === "TSAbstractMethodDefinition"
  ) {
    const cls = enclosingClassName(node);
    const k = keyName(parent.key, parent.computed, sourceCode);
    const prefix =
      parent.kind === "get" ? "get " : parent.kind === "set" ? "set " : "";
    return `${prefix}${cls ? `${cls}.` : ""}${parent.kind === "constructor" ? "constructor" : k}`;
  }
  if (
    parent?.type === "PropertyDefinition" ||
    parent?.type === "AccessorProperty"
  ) {
    const cls = enclosingClassName(node);
    return `${cls ? `${cls}.` : ""}${keyName(parent.key, parent.computed, sourceCode)}`;
  }
  if (parent?.type === "Property" && parent.value === node) {
    return keyName(parent.key, parent.computed, sourceCode);
  }
  if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier")
    return parent.id.name;
  if (parent?.type === "AssignmentExpression")
    return sourceCode.getText(parent.left).slice(0, 60);
  if (parent?.type === "ExportDefaultDeclaration") return "<default export>";
  if (parent?.type === "CallExpression" || parent?.type === "NewExpression") {
    if (parent.callee === node) return "<IIFE>";
    const callee = sourceCode.getText(parent.callee).replace(/\s+/g, "");
    return `<callback to ${callee.slice(0, 60)}>`;
  }
  if (parent?.type === "JSXExpressionContainer") {
    const attr =
      parent.parent?.type === "JSXAttribute" ? parent.parent.name?.name : null;
    return attr ? `<JSX ${attr} handler>` : "<JSX child function>";
  }
  return "<anonymous>";
}

function kindOf(node) {
  const parent = node.parent;
  if (node.type === "FunctionDeclaration") return "declaration";
  if (parent?.type === "MethodDefinition") {
    return parent.kind === "method" ? "method" : parent.kind; // get / set / constructor
  }
  if (
    parent?.type === "Property" &&
    (parent.method || parent.kind !== "init")
  ) {
    return parent.kind === "init" ? "object-method" : `object-${parent.kind}`;
  }
  if (parent?.type === "PropertyDefinition")
    return `class-field-${node.type === "ArrowFunctionExpression" ? "arrow" : "function"}`;
  const base =
    node.type === "ArrowFunctionExpression" ? "arrow" : "function-expression";
  if (
    (parent?.type === "CallExpression" || parent?.type === "NewExpression") &&
    parent.callee !== node
  ) {
    return `${base}-callback`;
  }
  return base;
}

const rule = {
  meta: {
    type: "suggestion",
    schema: [],
    docs: { description: "function census (never reports)" },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const entry = { functions: [], classFieldInitializers: 0, staticBlocks: 0 };
    collector.set(context.filename, entry);
    const stack = [];
    return {
      ":function"(node) {
        const sonarLoc = sonarLocation.getMainFunctionTokenLocation(
          node,
          node.parent,
          context
        );
        const headLoc = astUtils.getFunctionHeadLoc(node, sourceCode);
        const parentIndex = stack.length ? stack.at(-1) : null;
        const index = entry.functions.length;
        // Head span: from the owning MethodDefinition/Property/PropertyDefinition (if any) to the
        // start of the body. Biome's diagnostic start position falls inside it.
        const owner =
          [
            "MethodDefinition",
            "Property",
            "PropertyDefinition",
            "TSAbstractMethodDefinition",
          ].includes(node.parent?.type) && node.parent.value === node
            ? node.parent
            : node;
        let headStartNode = owner;
        // `const f = () => {}`: also accept the variable name as the head.
        if (
          node.parent?.type === "VariableDeclarator" &&
          node.parent.init === node
        )
          headStartNode = node.parent;
        entry.functions.push({
          index,
          name: displayName(node, sourceCode),
          eslintName: astUtils.getFunctionNameWithKind(node),
          nodeType: node.type,
          kind: kindOf(node),
          async: Boolean(node.async),
          generator: Boolean(node.generator),
          depth: stack.length, // number of enclosing functions
          parentIndex,
          startLine: node.loc.start.line,
          endLine: node.loc.end.line,
          lines: node.loc.end.line - node.loc.start.line + 1,
          range: node.range,
          sonarKey: keyOf(sonarLoc),
          eslintKey: keyOf(headLoc),
          headStart: posOf(headStartNode.loc.start),
          bodyStart: posOf(node.body.loc.start),
          controlFlowAncestors: controlFlowAncestors(node),
          own: {
            and: 0,
            or: 0,
            nullish: 0,
            jsxShortCircuit: 0,
            logicalAssign: 0,
            nestedElse: 0, // plain `else` on an if chain that is itself nested (nesting >= 1)
            nestedElseIf: 0, // `else if` in a chain that is nested (nesting >= 1)
            finally: 0, // try … finally (Biome counts +1; whitepaper and sonarjs do not)
            // A function that is directly the consequent/alternate of a ternary. sonarjs 4.2.2
            // leaks +1 nesting into the rest of the enclosing function for each one (see REPORT).
            ternaryFunctionBranch: 0,
          },
        });
        stack.push(index);
      },
      ":function:exit"() {
        stack.pop();
      },
      LogicalExpression(node) {
        if (!stack.length) return;
        const own = entry.functions[stack.at(-1)].own;
        if (getJsxShortCircuitNodes(node) != null) own.jsxShortCircuit++;
        if (node.operator === "&&") own.and++;
        else if (node.operator === "||") own.or++;
        else if (node.operator === "??") own.nullish++;
      },
      IfStatement(node) {
        if (!stack.length) return;
        const own = entry.functions[stack.at(-1)].own;
        const nested = controlFlowAncestors(chainHead(node)) >= 1;
        if (!nested) return;
        if (
          node.parent?.type === "IfStatement" &&
          node.parent.alternate === node
        )
          own.nestedElseIf++;
        if (node.alternate && node.alternate.type !== "IfStatement")
          own.nestedElse++;
      },
      TryStatement(node) {
        if (stack.length && node.finalizer)
          entry.functions[stack.at(-1)].own.finally++;
      },
      ConditionalExpression(node) {
        if (!stack.length) return;
        for (const branch of [node.consequent, node.alternate]) {
          if (astUtils.isFunction(branch))
            entry.functions[stack.at(-1)].own.ternaryFunctionBranch++;
        }
      },
      AssignmentExpression(node) {
        if (stack.length && ["||=", "&&=", "??="].includes(node.operator)) {
          entry.functions[stack.at(-1)].own.logicalAssign++;
        }
      },
      // Counted only to explain extra `complexity` reports that are not functions.
      PropertyDefinition(node) {
        if (node.value) entry.classFieldInitializers++;
      },
      StaticBlock() {
        entry.staticBlocks++;
      },
    };
  },
};

module.exports = {
  plugin: { meta: { name: "census" }, rules: { functions: rule } },
  collector,
};
