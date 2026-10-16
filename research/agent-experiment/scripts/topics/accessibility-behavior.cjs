// The behaviour oracle for the accessibility topic's two subjects, shared by the agent experiment
// (scripts/topics/accessibility.cjs runs it in a child process on every state of every run) and the
// corpus (research/corpus/scripts/a11y-examples.cjs imports it for the subjects and hand-made
// variants in examples.json). Moved here from a11y-examples.cjs with the accessibility topic, so
// there is one implementation; its verdicts for the corpus variants are unchanged.
//
// It never runs a cloned repo's code, and it needs no DOM. It transpiles the subject (TypeScript's
// transpileModule, react-jsx), runs it with React 19 and react-dom/server from the repo's Bun store,
// and wraps React's JSX runtime and createElement so every host element's props are recorded (and
// tagged with a data attribute, so the rendered markup can be tied back to them). Then:
//   collapsible  (subject A, Excalidraw's Stats/Collapsible) finds the element whose onClick calls
//                openTrigger and records whether it is a native control or has role + tabIndex >= 0
//                + a key handler that calls openTrigger for Enter and for Space (called with
//                synthetic events whose currentTarget.click() dispatches to the element's onClick);
//                whether it, or an ancestor, is hidden from assistive technology; its accessible
//                name; aria-expanded; and that clicking, the label, the icon and the children behave
//                as before.
//   topPicks     (subject B, Excalidraw's ColorPicker/TopPicks) for each swatch button of each
//                picker type: hidden or not, the accessible name (aria-labelledby, aria-label, text
//                content outside aria-hidden, then title), whether that name is a colour code,
//                whether it contains the colour's palette name, whether the five names are
//                distinct, and that clicking calls onChange with the swatch's colour.
// `verdict` is what examples.json records. `diagnoseCollapsible` and `diagnoseTopPicks` add the
// experiment's reading of a result: why the barrier is or isn't fixed (native control, full ARIA
// pattern, a key handler that does nothing, hidden, no name, a colour code as the name, one name for
// every swatch, broken clicks or children), and markup notes (element, className, inline styles).
//
// What it can't judge (focus order across the page, how a particular screen reader voices the name,
// CSS) is listed in research/corpus/examples/accessibility/examples.json `oracleLimits`.
//
// CLI (what the topic runs, one process per file, so agent-written code never runs in the harness):
//   node scripts/topics/accessibility-behavior.cjs <collapsible|topPicks> <file.tsx>
// prints { ok, result, diagnosis } or { ok: false, loadError }.
"use strict";

const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const tools = require(join(__dirname, "../../../corpus/scripts/tools.cjs"));

const ts = require(join(tools.dirs.typescript, "lib/typescript.js"));
const STORE = join(tools.ULTRACITE, "node_modules/.bun");
const storePackage = (prefix, name) => {
  const dir = readdirSync(STORE).find(
    (d) => d === prefix || d.startsWith(`${prefix}+`)
  );
  if (!dir) {
    throw new Error(`${prefix} not found in ${STORE}`);
  }
  return join(STORE, dir, "node_modules", name);
};
const REACT = storePackage("react@19.3.0", "react");
const REACT_DOM = storePackage("react-dom@19.3.0", "react-dom");
const TYPES_REACT = storePackage("@types+react@19.3.0", "@types/react");

// ── loading a subject ──────────────────────────────────────────────────
const loadSubject = (source) => {
  const realReact = require(REACT);
  const realRuntime = require(join(REACT, "jsx-runtime"));
  const { renderToStaticMarkup } = require(join(REACT_DOM, "server"));
  const hosts = new Map();
  let counter = 0;
  const tag = (type, props) => {
    if (typeof type !== "string") {
      return props;
    }
    const id = String(++counter);
    hosts.set(id, { props: props ?? {}, type });
    return { ...props, "data-oracle": id };
  };
  const runtime = {
    Fragment: realRuntime.Fragment,
    jsx: (type, props, key) => realRuntime.jsx(type, tag(type, props), key),
    jsxs: (type, props, key) => realRuntime.jsxs(type, tag(type, props), key),
  };
  const react = {
    ...realReact,
    createElement: (type, props, ...children) =>
      realReact.createElement(
        type,
        typeof type === "string" ? tag(type, props) : props,
        ...children
      ),
  };
  react.default = react;
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const mod = { exports: {} };
  const requireShim = (spec) => {
    if (spec === "react") {
      return react;
    }
    if (spec === "react/jsx-runtime" || spec === "react/jsx-dev-runtime") {
      return runtime;
    }
    throw new Error(
      `the subject imports ${spec}, which the oracle doesn't provide`
    );
  };
  new Function("require", "module", "exports", outputText)(
    requireShim,
    mod,
    mod.exports
  );
  // The counter is never reset: elements built when the module loads (Collapsible's icons) keep
  // their ids, so a reset would give a rendered element an id an icon already has, and findNode
  // could return the icon's node for it. (Fixed with the accessibility topic's runs: an overlay
  // <button> after the icon was read as the aria-hidden svg's path. No corpus variant was affected.)
  const render = (Component, props) => {
    hosts.clear();
    const html = renderToStaticMarkup(
      realReact.createElement(Component, props)
    );
    return { hosts: new Map(hosts), html, tree: parseHtml(html) };
  };
  return { React: realReact, exports: mod.exports, render };
};

// A small HTML parser for React's static markup (well formed, attributes double-quoted).
const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);
const decode = (s) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
const parseHtml = (html) => {
  const root = { attrs: {}, children: [], parent: null, tag: "#root" };
  let cur = root;
  const re =
    /<\/([a-zA-Z0-9-]+)>|<([a-zA-Z0-9-]+)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
  for (const m of html.matchAll(re)) {
    if (m[1]) {
      cur = cur.parent ?? root;
    } else if (m[2]) {
      const attrs = {};
      for (const a of m[3].matchAll(/([^\s=>/]+)(?:="([^"]*)")?/g)) {
        attrs[a[1]] = a[2] === undefined ? "" : decode(a[2]);
      }
      const node = {
        attrs,
        children: [],
        parent: cur,
        tag: m[2].toLowerCase(),
      };
      cur.children.push(node);
      if (!m[4] && !VOID.has(node.tag)) {
        cur = node;
      }
    } else if (m[5]) {
      cur.children.push({ text: decode(m[5]) });
    }
  }
  return root;
};
const findNode = (node, id) => {
  if (node.attrs?.["data-oracle"] === id) {
    return node;
  }
  for (const c of node.children ?? []) {
    const hit = findNode(c, id);
    if (hit) {
      return hit;
    }
  }
  return null;
};
const allNodes = (node, out = []) => {
  if (node.tag) {
    out.push(node);
  }
  for (const c of node.children ?? []) {
    allNodes(c, out);
  }
  return out;
};
const isAncestor = (a, b) => {
  for (let n = b.parent; n; n = n.parent) {
    if (n === a) {
      return true;
    }
  }
  return false;
};
const hiddenFromAT = (node) => {
  for (let n = node; n; n = n.parent) {
    if (n.attrs?.["aria-hidden"] === "true" || "hidden" in (n.attrs ?? {})) {
      return true;
    }
  }
  return false;
};
const textOf = (node) =>
  (node.children ?? [])
    .map((c) =>
      c.text !== undefined
        ? c.text
        : c.attrs?.["aria-hidden"] === "true"
          ? ""
          : textOf(c)
    )
    .join("");
// A reduced accessible-name computation: aria-labelledby, aria-label, content, then title.
const accessibleName = (node, tree) => {
  const a = node.attrs ?? {};
  if (a["aria-labelledby"]) {
    const ids = a["aria-labelledby"].split(/\s+/);
    const text = ids
      .map((id) => allNodes(tree).find((n) => n.attrs.id === id))
      .filter(Boolean)
      .map((n) => textOf(n).trim())
      .join(" ")
      .trim();
    if (text) {
      return { from: "aria-labelledby", name: text };
    }
  }
  if (a["aria-label"]?.trim()) {
    return { from: "aria-label", name: a["aria-label"].trim() };
  }
  const content = textOf(node).replaceAll(/\s+/g, " ").trim();
  if (content) {
    return { from: "content", name: content };
  }
  if (a.title?.trim()) {
    return { from: "title", name: a.title.trim() };
  }
  return { from: null, name: "" };
};

// Synthetic events. `currentTarget.click()` and `target.click()` dispatch a click to the element's
// own onClick, as a real element would, so a key handler written as `event.currentTarget.click()`
// counts. `log` records preventDefault and stopPropagation calls.
const element = (props, log) => ({
  blur() {},
  click() {
    if (typeof props?.onClick === "function") {
      // oxlint-disable-next-line no-use-before-define -- the two event builders refer to each other
      props.onClick(clickEvent(props, log));
    }
  },
  focus() {},
});
const keyEvent = (key, props = null, log = null) => {
  const target = element(props, log);
  return {
    code: key === " " ? "Space" : key,
    currentTarget: target,
    defaultPrevented: false,
    key,
    nativeEvent: {},
    preventDefault() {
      this.defaultPrevented = true;
      log?.push(`preventDefault ${key}`);
    },
    stopPropagation() {
      log?.push(`stopPropagation ${key}`);
    },
    target,
  };
};
const clickEvent = (props = null, log = null) => ({
  ...keyEvent("click", props, log),
  button: 0,
  detail: 1,
});
const isNativeControl = (type, props) =>
  type === "button" ||
  (type === "a" && props.href !== undefined) ||
  (type === "input" &&
    ["button", "submit", "checkbox", "radio"].includes(props.type)) ||
  type === "summary";

const KEY_HANDLERS = ["onKeyDown", "onKeyUp", "onKeyPress"];

// ── subject A: Collapsible ─────────────────────────────────────────────
// `facts` (the experiment) adds markup facts to each state; examples.json is written without them.
const oracleCollapsible = (source, { facts = false } = {}) => {
  const { React, exports, render } = loadSubject(source);
  const Collapsible = exports.default;
  const results = {};
  for (const open of [false, true]) {
    let calls = 0;
    const openTrigger = () => {
      calls++;
    };
    const { hosts, html, tree } = render(Collapsible, {
      children: "SECTION-CHILDREN",
      // Stats/index.tsx passes none; a value here shows whether the edit still passes it through.
      ...(facts ? { className: "oracle-section" } : {}),
      // As Stats/index.tsx passes it: label={<h3>{t("stats.generalStats")}</h3>}.
      label: React.createElement("h3", null, "General stats"),
      open,
      openTrigger,
    });
    const candidates = [...hosts].filter(
      ([, h]) => typeof h.props.onClick === "function"
    );
    let control = null;
    // Every element whose click reaches openTrigger, for the double-toggle check below.
    const clickers = [];
    for (const [id, h] of candidates) {
      const before = calls;
      const log = [];
      h.props.onClick(clickEvent(h.props, log));
      if (calls > before) {
        clickers.push({ calls: calls - before, id, log });
        if (!control) {
          control = { calledOnClick: calls - before, id, ...h };
        }
      }
    }
    // A handler carried by a spread is still on props here, so it is found too.
    const r = { open };
    if (!control) {
      r.control = null;
      results[open ? "open" : "closed"] = r;
      continue;
    }
    const node = findNode(tree, control.id);
    const p = control.props;
    const tabIndex = p.tabIndex === undefined ? null : Number(p.tabIndex);
    const keys = {};
    const keyLog = {};
    const keyHandlers = KEY_HANDLERS.filter(
      (handler) => typeof p[handler] === "function"
    );
    for (const key of ["Enter", " "]) {
      let fired = 0;
      const log = [];
      for (const handler of keyHandlers) {
        const before = calls;
        p[handler](keyEvent(key, p, log));
        fired += calls - before;
      }
      keys[key === " " ? "Space" : key] = fired;
      keyLog[key === " " ? "Space" : key] = log;
    }
    const native = isNativeControl(control.type, p) && !p.disabled;
    const role = p.role ?? null;
    const focusable = native
      ? tabIndex === null || tabIndex >= 0
      : tabIndex !== null && tabIndex >= 0;
    const keyboardOperable = native
      ? focusable
      : focusable && keys.Enter > 0 && keys.Space > 0;
    const exposedAsControl = native
      ? !["presentation", "none"].includes(role)
      : ["button", "link", "switch", "checkbox", "tab", "menuitem"].includes(
          role
        );
    r.control = {
      ariaExpanded:
        p["aria-expanded"] === undefined ? null : String(p["aria-expanded"]),
      clickCallsOpenTrigger: control.calledOnClick,
      element: control.type,
      exposedAsControl,
      focusable,
      hidden: node ? hiddenFromAT(node) : null,
      keyHandlersCallOpenTrigger: keys,
      keyboardOperable,
      name: node ? accessibleName(node, tree) : null,
      native,
      role,
      tabIndex,
    };
    const clickerNodes = clickers.map((c) => ({
      ...c,
      node: findNode(tree, c.id),
    }));
    if (facts) {
      r.facts = {
        ariaControls: p["aria-controls"] ?? null,
        buttonType: control.type === "button" ? (p.type ?? null) : null,
        className: p.className ?? null,
        classNameRendered: html.includes('class="oracle-section"'),
        clickers: clickers.map((c) => ({
          calls: c.calls,
          element: hosts.get(c.id).type,
          stopsPropagation: c.log.some((l) => l.startsWith("stopPropagation")),
        })),
        // A real click on an inner element also reaches an outer one that calls openTrigger, unless
        // the inner handler stops propagation: the section opens and closes again.
        nestedClickToggles: clickerNodes.some(
          (inner) =>
            inner.node &&
            !inner.log.some((l) => l.startsWith("stopPropagation")) &&
            clickerNodes.some(
              (outer) =>
                outer !== inner &&
                outer.node &&
                isAncestor(outer.node, inner.node)
            )
        ),
        headingInsideControl: node
          ? allNodes(node).some((n) => n !== node && /^h[1-6]$/.test(n.tag))
          : null,
        keyHandlers,
        keyLog,
        style: p.style && typeof p.style === "object" ? p.style : null,
      };
    }
    r.childrenRendered = html.includes("SECTION-CHILDREN");
    r.labelRendered = html.includes("General stats");
    r.iconRendered = html.includes("<svg");
    results[open ? "open" : "closed"] = r;
  }
  const c = results.closed.control;
  const verdict = c
    ? {
        barrierFixed: Boolean(
          c.keyboardOperable && c.exposedAsControl && !c.hidden && c.name?.name
        ),
        behaviourPreserved:
          c.clickCallsOpenTrigger === 1 &&
          results.closed.childrenRendered === false &&
          results.open.childrenRendered === true &&
          results.closed.labelRendered &&
          results.closed.iconRendered,
        statePresent:
          results.closed.control.ariaExpanded === "false" &&
          results.open.control?.ariaExpanded === "true",
      }
    : {
        barrierFixed: false,
        behaviourPreserved: false,
        statePresent: false,
        note: "no element calls openTrigger on click",
      };
  return { verdict, ...results };
};

// ── subject B: TopPicks ────────────────────────────────────────────────
const PALETTE_NAMES = {
  "#1e1e1e": "Black",
  "#2f9e44": "Green",
  "#b2f2bb": "Green",
  "#1971c2": "Blue",
  "#a5d8ff": "Blue",
  "#e03131": "Red",
  "#ffc9c9": "Red",
  "#f08c00": "Yellow",
  "#ffec99": "Yellow",
  "#f8f9fa": "Gray",
  "#ffffff": "White",
  transparent: "Transparent",
};
// A hex or rgb()/hsl() code. "transparent" is a CSS keyword and also the palette's own name for
// that swatch, so it isn't counted as a code.
const isColorCode = (name) =>
  /^\s*(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^)]*\))\s*$/i.test(name);
const containsColorCode = (name) =>
  /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i.test(name);
const GENERIC =
  /^(?:colou?r|swatch|button|colou?r (?:button|swatch)|pick|top pick)$/i;

const PICKER_TYPES = ["elementStroke", "elementBackground", "canvasBackground"];

// `catchRenderErrors` (the experiment) reports a picker type that throws instead of throwing.
const oracleTopPicks = (source, { catchRenderErrors = false } = {}) => {
  const { exports, render } = loadSubject(source);
  const { TopPicks } = exports;
  const out = {};
  for (const type of PICKER_TYPES) {
    const changes = [];
    let rendered;
    try {
      rendered = render(TopPicks, {
        activeColor: null,
        onChange: (c) => changes.push(c),
        theme: "light",
        type,
      });
    } catch (error) {
      if (!catchRenderErrors) {
        throw error;
      }
      out[type] = {
        distinctNames: 0,
        renderError: String(error.message).slice(0, 200),
        rows: [],
        swatches: 0,
      };
      continue;
    }
    const { hosts, tree } = rendered;
    const swatches = [...hosts].filter(
      ([, h]) => typeof h.props.onClick === "function"
    );
    const rows = swatches.map(([id, h]) => {
      const node = findNode(tree, id);
      const before = changes.length;
      h.props.onClick(clickEvent());
      const color = changes[before] ?? null;
      const name = node ? accessibleName(node, tree) : { from: null, name: "" };
      const expected = PALETTE_NAMES[color] ?? null;
      return {
        color,
        element: h.type,
        hidden: node ? hiddenFromAT(node) : null,
        name,
        nameIsCode: name.name ? isColorCode(name.name) : null,
        nameIsGeneric: name.name ? GENERIC.test(name.name.trim()) : null,
        nameHasPaletteName: expected
          ? name.name.toLowerCase().includes(expected.toLowerCase())
          : null,
        title: h.props.title ?? null,
        type: h.props.type ?? null,
      };
    });
    const names = rows.map((r) => r.name.name);
    out[type] = {
      distinctNames: new Set(names).size,
      rows,
      swatches: rows.length,
    };
  }
  const all = Object.values(out).flatMap((x) => x.rows);
  // The stroke and background picks are palette colours, which have names in context (the palette
  // and the colour strings). Three of the five canvas picks are Radix colours with no name in the
  // file, so the canvas picker is reported but not part of the verdict.
  const paletteTyped = [
    ...out.elementStroke.rows,
    ...out.elementBackground.rows,
  ];
  const verdict = {
    barrierFixed:
      paletteTyped.length === 10 &&
      paletteTyped.every(
        (r) => !r.hidden && r.name.name && !r.nameIsCode && !r.nameIsGeneric
      ) &&
      paletteTyped.every((r) => r.nameHasPaletteName) &&
      out.elementStroke.distinctNames === 5 &&
      out.elementBackground.distinctNames === 5,
    canvasPicker: out.canvasBackground.rows.map((r) => r.name.name),
    behaviourPreserved:
      all.length === 15 &&
      all.every(
        (r) => r.element === "button" && r.type === "button" && r.color !== null
      ),
    titleKept: all.every((r) => r.title === r.color),
    worst: (() => {
      if (paletteTyped.some((r) => r.hidden)) {
        return "hidden from assistive technology";
      }
      if (paletteTyped.some((r) => !r.name.name)) {
        return "no name";
      }
      if (paletteTyped.some((r) => r.nameIsCode)) {
        return "named by colour code";
      }
      if (
        paletteTyped.some((r) => r.nameIsGeneric) ||
        out.elementStroke.distinctNames < 5 ||
        out.elementBackground.distinctNames < 5
      ) {
        return "same or generic name";
      }
      return paletteTyped.every((r) => r.nameHasPaletteName)
        ? null
        : "name without the colour";
    })(),
  };
  return { verdict, ...out };
};

const ORACLES = { collapsible: oracleCollapsible, topPicks: oracleTopPicks };

// ── the experiment's reading of a result ───────────────────────────────

/**
 * Why subject A's barrier is or isn't fixed, from an oracleCollapsible result. `fixed` is stricter
 * than the verdict: a native control whose own key handler also calls openTrigger on Enter or Space
 * without preventDefault toggles twice in a browser (the key handler, then the native activation),
 * and so does a key that two handlers act on, or a click that reaches two nested handlers.
 */
const diagnoseCollapsible = (result) => {
  const closed = result.closed?.control;
  if (!closed) {
    return {
      fixed: false,
      reason: "click broken: nothing calls openTrigger",
      notes: [],
    };
  }
  const f = result.closed.facts ?? {};
  const keys = closed.keyHandlersCallOpenTrigger;
  const prevented = (key) =>
    (f.keyLog?.[key] ?? []).some((l) => l.startsWith("preventDefault"));
  const notes = [];
  const doubleKeys = ["Enter", "Space"].filter(
    (key) =>
      keys[key] > 1 || (closed.native && keys[key] > 0 && !prevented(key))
  );
  if (doubleKeys.length > 0) {
    notes.push(`${doubleKeys.join(" and ")} toggle twice`);
  }
  if (f.nestedClickToggles) {
    notes.push("a click reaches two nested handlers");
  }
  if (f.headingInsideControl) {
    notes.push("the label's heading is inside the control");
  }
  if (closed.native && f.buttonType === null && closed.element === "button") {
    notes.push("button without type");
  }
  if (!closed.native && keys.Space > 0 && !prevented("Space")) {
    notes.push("Space doesn't preventDefault (the page scrolls)");
  }
  const behaviour = result.verdict.behaviourPreserved;
  const handles = keys.Enter > 0 || keys.Space > 0;
  const hasKeyHandler = (f.keyHandlers?.length ?? 0) > 0;
  const keyHandling = (() => {
    if (keys.Enter > 0 && keys.Space > 0) {
      return "Enter and Space";
    }
    if (handles) {
      return `${keys.Enter > 0 ? "Enter" : "Space"} only`;
    }
    return hasKeyHandler
      ? "a key handler that does nothing on Enter or Space"
      : "no key handler";
  })();
  let reason;
  if (closed.hidden) {
    reason = "hidden from assistive technology";
  } else if (closed.native && closed.exposedAsControl) {
    reason = closed.focusable
      ? "native control"
      : "native control removed from the Tab order";
  } else if (closed.native) {
    reason = "native control with role presentation";
  } else if (!closed.exposedAsControl) {
    reason = closed.role
      ? `role ${closed.role}: not exposed as a control (${keyHandling})`
      : `no role (${keyHandling})`;
  } else if (!closed.focusable) {
    reason = `role but not focusable (${keyHandling})`;
  } else if (keys.Enter > 0 && keys.Space > 0) {
    reason = "full ARIA pattern";
  } else if (handles) {
    reason = `partial key handling (${keyHandling})`;
  } else if (hasKeyHandler) {
    reason =
      "role and tabIndex, with a key handler that does nothing on Enter or Space";
  } else {
    reason = "role and tabIndex but no key handler";
  }
  if (!closed.name?.name && !closed.hidden) {
    reason = `${reason}, no name`;
  }
  const fixed =
    result.verdict.barrierFixed &&
    doubleKeys.length === 0 &&
    !f.nestedClickToggles;
  return {
    behaviourPreserved: behaviour,
    childrenRendered: {
      closed: result.closed.childrenRendered,
      open: result.open?.childrenRendered ?? null,
    },
    clickCalls: closed.clickCallsOpenTrigger,
    element: closed.element,
    // The facts the reason is made of, for classification.
    flags: {
      exposedAsControl: closed.exposedAsControl,
      focusable: closed.focusable,
      hidden: closed.hidden,
      keyHandler: hasKeyHandler,
      keyHandling,
      native: closed.native,
      role: closed.role,
      tabIndex: closed.tabIndex,
    },
    fixed,
    notes,
    reason: behaviour ? reason : `${reason}; behaviour changed`,
    statePresent: result.verdict.statePresent,
  };
};

/** Why subject B's barrier is or isn't fixed, from an oracleTopPicks result. */
const diagnoseTopPicks = (result) => {
  const v = result.verdict;
  const rendered = PICKER_TYPES.filter((t) => !result[t].renderError);
  const crashed = PICKER_TYPES.filter((t) => result[t].renderError);
  const palette = [
    ...result.elementStroke.rows,
    ...result.elementBackground.rows,
  ];
  const names = palette.map((r) => r.name.name);
  const notes = [];
  if (crashed.length > 0) {
    notes.push(
      `${crashed.join(", ")} picker throws: ${result[crashed[0]].renderError}`
    );
  }
  if (palette.some((r) => r.name.name && containsColorCode(r.name.name))) {
    notes.push("a colour code is part of the name");
  }
  if (!v.titleKept) {
    notes.push("title changed or removed");
  }
  let reason;
  if (crashed.length > 0 && rendered.length < 2) {
    reason = "component throws";
  } else if (v.barrierFixed) {
    reason = "palette name";
  } else if (v.worst === "hidden from assistive technology") {
    reason = "hidden";
  } else if (v.worst === "no name") {
    reason = "no name";
  } else if (v.worst === "named by colour code") {
    reason = "hex name";
  } else if (v.worst === "same or generic name") {
    reason = "generic name";
  } else if (
    palette.some((r) => r.name.name && containsColorCode(r.name.name))
  ) {
    reason = "hex name with words";
  } else {
    reason = "name without the colour";
  }
  return {
    behaviourPreserved: v.behaviourPreserved && crashed.length === 0,
    canvasPicker: result.canvasBackground.rows.map((r) => r.name.name),
    crashed,
    fixed: v.barrierFixed && crashed.length === 0,
    names,
    notes,
    reason:
      v.behaviourPreserved && crashed.length === 0
        ? reason
        : `${reason}; behaviour changed`,
    titleKept: v.titleKept,
  };
};

const DIAGNOSES = {
  collapsible: diagnoseCollapsible,
  topPicks: diagnoseTopPicks,
};

/** Runs one oracle on a source text; never throws (a file that won't load is a result). */
const judge = (kind, source) => {
  try {
    const result =
      kind === "topPicks"
        ? oracleTopPicks(source, { catchRenderErrors: true })
        : oracleCollapsible(source, { facts: true });
    return { diagnosis: DIAGNOSES[kind](result), ok: true, result };
  } catch (error) {
    return {
      diagnosis: {
        behaviourPreserved: false,
        fixed: false,
        notes: [],
        reason: "doesn't load or render",
      },
      loadError: String(error.message).slice(0, 300),
      ok: false,
    };
  }
};

module.exports = {
  ORACLES,
  REACT,
  REACT_DOM,
  TYPES_REACT,
  accessibleName,
  diagnoseCollapsible,
  diagnoseTopPicks,
  judge,
  loadSubject,
  oracleCollapsible,
  oracleTopPicks,
  parseHtml,
  ts,
};

if (require.main === module) {
  const [kind, file] = process.argv.slice(2);
  if (!ORACLES[kind] || !file) {
    console.error(
      "usage: node accessibility-behavior.cjs <collapsible|topPicks> <file.tsx>"
    );
    process.exit(2);
  }
  process.stdout.write(
    `${JSON.stringify(judge(kind, readFileSync(file, "utf8")))}\n`
  );
}
