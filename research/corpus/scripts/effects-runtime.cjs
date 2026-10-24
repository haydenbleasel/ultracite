// Real React 19 in Node, with effects: react and react-dom/client from the repo's Bun store, on a
// minimal DOM written here (the repo has no DOM library, and nothing is installed). Used by the
// calibration's behaviour cases (effects-calibration.cjs) and the subjects' oracle
// (effects-oracle.cjs). It never loads code from a clone: subjects are transpiled copies.
//
// The DOM is enough for react-dom's client renderer on simple components: elements, text and
// comment nodes, attributes, inline styles, child lists, textContent, event listeners with capture
// and bubble phases (so React's root listener sees dispatched events), focus, and a document and
// window. createRuntime() returns:
//   React, ReactDOM              the real modules (development builds)
//   instrumented                 a React whose effect and memo hooks record every setup and cleanup
//                                with the hook's source line, and whose JSX runtime counts renders of
//                                every function component by name
//   mount/update/unmount/act     render an element into a container inside React.act
//   timers                       fake setTimeout/setInterval/requestAnimationFrame, advanced by hand
//   dom helpers                  text(), html(), query by tag or data-testid, click/dispatch
//   trace                        renders, effect setups and cleanups, calls the caller records,
//                                React's console warnings and errors, uncaught errors
// A render cap (default 500 renders of any one component in one act) turns an infinite update
// loop into a recorded `loop` instead of a hang.
"use strict";

const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const Module = require("node:module");

const STORE = join(__dirname, "../../../node_modules/.bun");
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

// ── a minimal DOM ──────────────────────────────────────────────────────
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;
const DOCUMENT_NODE = 9;
const DOCUMENT_FRAGMENT_NODE = 11;

class Event {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = Boolean(init.cancelable);
    this.composed = Boolean(init.composed);
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this.eventPhase = 0;
    this.timeStamp = Date.now();
    this.isTrusted = false;
    this._stop = false;
    this._stopImmediate = false;
    Object.assign(this, init.detail ? { detail: init.detail } : {});
    for (const k of [
      "key",
      "code",
      "button",
      "buttons",
      "clientX",
      "clientY",
      "relatedTarget",
      "shiftKey",
      "ctrlKey",
      "metaKey",
      "altKey",
    ]) {
      if (k in init) {
        this[k] = init[k];
      }
    }
  }
  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }
  stopPropagation() {
    this._stop = true;
  }
  stopImmediatePropagation() {
    this._stop = true;
    this._stopImmediate = true;
  }
  composedPath() {
    const path = [];
    for (let n = this.target; n; n = n.parentNode) {
      path.push(n);
    }
    return path;
  }
}

class Node {
  constructor(ownerDocument, nodeType, nodeName) {
    this.ownerDocument = ownerDocument;
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.parentNode = null;
    this.childNodes = [];
    this._listeners = new Map();
  }
  get firstChild() {
    return this.childNodes[0] ?? null;
  }
  get lastChild() {
    return this.childNodes.at(-1) ?? null;
  }
  get nextSibling() {
    if (!this.parentNode) {
      return null;
    }
    const s = this.parentNode.childNodes;
    return s[s.indexOf(this) + 1] ?? null;
  }
  get previousSibling() {
    if (!this.parentNode) {
      return null;
    }
    const s = this.parentNode.childNodes;
    const i = s.indexOf(this);
    return i > 0 ? s[i - 1] : null;
  }
  get parentElement() {
    return this.parentNode?.nodeType === ELEMENT_NODE ? this.parentNode : null;
  }
  get isConnected() {
    let n = this;
    while (n.parentNode) {
      n = n.parentNode;
    }
    return n.nodeType === DOCUMENT_NODE;
  }
  _detach(child) {
    if (child.parentNode) {
      const s = child.parentNode.childNodes;
      s.splice(s.indexOf(child), 1);
      child.parentNode = null;
    }
  }
  appendChild(child) {
    if (child.nodeType === DOCUMENT_FRAGMENT_NODE) {
      for (const c of [...child.childNodes]) {
        this.appendChild(c);
      }
      return child;
    }
    this._detach(child);
    this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }
  insertBefore(child, ref) {
    if (!ref) {
      return this.appendChild(child);
    }
    this._detach(child);
    const i = this.childNodes.indexOf(ref);
    if (i === -1) {
      throw new Error("insertBefore: reference node is not a child");
    }
    this.childNodes.splice(i, 0, child);
    child.parentNode = this;
    return child;
  }
  removeChild(child) {
    if (child.parentNode !== this) {
      throw new Error("removeChild: not a child");
    }
    this._detach(child);
    return child;
  }
  replaceChild(next, prev) {
    this.insertBefore(next, prev);
    return this.removeChild(prev);
  }
  remove() {
    this._detach(this);
  }
  contains(other) {
    for (let n = other; n; n = n.parentNode) {
      if (n === this) {
        return true;
      }
    }
    return false;
  }
  hasChildNodes() {
    return this.childNodes.length > 0;
  }
  getRootNode() {
    let n = this;
    while (n.parentNode) {
      n = n.parentNode;
    }
    return n;
  }
  get textContent() {
    if (this.nodeType === TEXT_NODE || this.nodeType === COMMENT_NODE) {
      return this.data;
    }
    return this.childNodes
      .filter((c) => c.nodeType !== COMMENT_NODE)
      .map((c) => c.textContent)
      .join("");
  }
  set textContent(value) {
    if (this.nodeType === TEXT_NODE || this.nodeType === COMMENT_NODE) {
      this.data = String(value);
      return;
    }
    for (const c of [...this.childNodes]) {
      this._detach(c);
    }
    if (value !== "" && value !== null && value !== undefined) {
      this.appendChild(this.ownerDocument.createTextNode(String(value)));
    }
  }
  addEventListener(type, fn, options) {
    if (!fn) {
      return;
    }
    const capture =
      typeof options === "boolean" ? options : Boolean(options?.capture);
    const key = `${type}:${capture}`;
    if (!this._listeners.has(key)) {
      this._listeners.set(key, []);
    }
    const list = this._listeners.get(key);
    if (!list.some((l) => l.fn === fn)) {
      list.push({ fn, once: Boolean(options?.once) });
    }
  }
  removeEventListener(type, fn, options) {
    const capture =
      typeof options === "boolean" ? options : Boolean(options?.capture);
    const list = this._listeners.get(`${type}:${capture}`);
    if (list) {
      const i = list.findIndex((l) => l.fn === fn);
      if (i !== -1) {
        list.splice(i, 1);
      }
    }
  }
  _invoke(event, capture) {
    const list = this._listeners.get(`${event.type}:${capture}`);
    if (!list) {
      return;
    }
    event.currentTarget = this;
    for (const l of [...list]) {
      if (l.once) {
        this.removeEventListener(event.type, l.fn, capture);
      }
      if (typeof l.fn === "function") {
        l.fn.call(this, event);
      } else {
        l.fn.handleEvent(event);
      }
      if (event._stopImmediate) {
        break;
      }
    }
  }
  dispatchEvent(event) {
    event.target = this;
    const path = [];
    for (let n = this; n; n = n.parentNode) {
      path.push(n);
    }
    const win = this.ownerDocument?.defaultView;
    if (win && path.at(-1)?.nodeType === DOCUMENT_NODE) {
      path.push(win);
    }
    const prev = win?.event;
    if (win) {
      win.event = event;
    }
    try {
      event.eventPhase = 1;
      for (let i = path.length - 1; i > 0 && !event._stop; i--) {
        path[i]._invoke?.(event, true);
      }
      event.eventPhase = 2;
      if (!event._stop) {
        this._invoke(event, true);
        this._invoke(event, false);
      }
      event.eventPhase = 3;
      if (event.bubbles) {
        for (let i = 1; i < path.length && !event._stop; i++) {
          path[i]._invoke?.(event, false);
        }
      }
    } finally {
      if (win) {
        win.event = prev;
      }
      event.currentTarget = null;
      event.eventPhase = 0;
    }
    return !event.defaultPrevented;
  }
}

class Text extends Node {
  constructor(doc, data) {
    super(doc, TEXT_NODE, "#text");
    this.data = String(data);
  }
  get nodeValue() {
    return this.data;
  }
  set nodeValue(v) {
    this.data = String(v);
  }
}
class Comment extends Node {
  constructor(doc, data) {
    super(doc, COMMENT_NODE, "#comment");
    this.data = String(data);
  }
  get nodeValue() {
    return this.data;
  }
  set nodeValue(v) {
    this.data = String(v);
  }
}

const styleObject = () => {
  const values = new Map();
  const target = {
    getPropertyValue: (name) => values.get(name) ?? "",
    removeProperty: (name) => {
      const v = values.get(name) ?? "";
      values.delete(name);
      return v;
    },
    setProperty: (name, value) => {
      if (value === null || value === "") {
        values.delete(name);
      } else {
        values.set(name, String(value));
      }
    },
  };
  return new Proxy(target, {
    get(t, key) {
      if (key in t) {
        return t[key];
      }
      if (key === "cssText") {
        return [...values].map(([k, v]) => `${k}: ${v};`).join(" ");
      }
      if (typeof key === "string") {
        return values.get(key) ?? "";
      }
      return undefined;
    },
    set(t, key, value) {
      if (key === "cssText") {
        values.clear();
        return true;
      }
      if (value === null || value === "") {
        values.delete(key);
      } else {
        values.set(key, String(value));
      }
      return true;
    },
  });
};

class Element extends Node {
  constructor(doc, tagName, namespaceURI = "http://www.w3.org/1999/xhtml") {
    super(
      doc,
      ELEMENT_NODE,
      namespaceURI.endsWith("xhtml") ? tagName.toUpperCase() : tagName
    );
    this.tagName = this.nodeName;
    this.localName = tagName.toLowerCase();
    this.namespaceURI = namespaceURI;
    this._attrs = new Map();
    this.style = styleObject();
    this._value = "";
  }
  get attributes() {
    return [...this._attrs].map(([name, value]) => ({ name, value }));
  }
  setAttribute(name, value) {
    this._attrs.set(String(name).toLowerCase(), String(value));
  }
  setAttributeNS(_ns, name, value) {
    this.setAttribute(name, value);
  }
  getAttribute(name) {
    return this._attrs.has(String(name).toLowerCase())
      ? this._attrs.get(String(name).toLowerCase())
      : null;
  }
  hasAttribute(name) {
    return this._attrs.has(String(name).toLowerCase());
  }
  removeAttribute(name) {
    this._attrs.delete(String(name).toLowerCase());
  }
  removeAttributeNS(_ns, name) {
    this.removeAttribute(name);
  }
  get id() {
    return this.getAttribute("id") ?? "";
  }
  set id(v) {
    this.setAttribute("id", v);
  }
  get className() {
    return this.getAttribute("class") ?? "";
  }
  set className(v) {
    this.setAttribute("class", v);
  }
  get children() {
    return this.childNodes.filter((c) => c.nodeType === ELEMENT_NODE);
  }
  get innerHTML() {
    return this.childNodes.map((c) => serialise(c)).join("");
  }
  set innerHTML(v) {
    this.textContent = String(v).replace(/<[^>]*>/g, "");
  }
  focus() {
    const doc = this.ownerDocument;
    if (doc.activeElement === this) {
      return;
    }
    const prev = doc.activeElement;
    doc.activeElement = this;
    if (prev && prev !== doc.body) {
      prev.dispatchEvent(new Event("focusout", { bubbles: true }));
    }
    this.dispatchEvent(new Event("focusin", { bubbles: true }));
  }
  blur() {
    const doc = this.ownerDocument;
    if (doc.activeElement === this) {
      doc.activeElement = doc.body;
      this.dispatchEvent(new Event("focusout", { bubbles: true }));
    }
  }
  click() {
    this.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
  }
  getBoundingClientRect() {
    return {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
    };
  }
  scrollIntoView() {}
  querySelectorAll(selector) {
    const out = [];
    const match = matcher(selector);
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType === ELEMENT_NODE) {
          if (match(c)) {
            out.push(c);
          }
          walk(c);
        }
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  get value() {
    return this._value;
  }
  set value(v) {
    this._value = String(v);
  }
}
// tag, #id, [data-testid="x"], [attr]
const matcher = (selector) => {
  const s = selector.trim();
  let m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(s);
  if (m) {
    return (el) =>
      m[2] === undefined
        ? el.hasAttribute(m[1])
        : el.getAttribute(m[1]) === m[2];
  }
  m = /^#([\w-]+)$/.exec(s);
  if (m) {
    return (el) => el.id === m[1];
  }
  return (el) => el.localName === s.toLowerCase();
};
class HTMLIFrameElement extends Element {}

class Document extends Node {
  constructor() {
    super(null, DOCUMENT_NODE, "#document");
    this.ownerDocument = null;
    this.documentElement = new Element(this, "html");
    this.head = new Element(this, "head");
    this.body = new Element(this, "body");
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
    this.activeElement = this.body;
    this.defaultView = null;
    this.readyState = "complete";
    this.visibilityState = "visible";
  }
  createElement(tag) {
    const t = String(tag).toLowerCase();
    return t === "iframe"
      ? new HTMLIFrameElement(this, t)
      : new Element(this, t);
  }
  createElementNS(ns, tag) {
    return new Element(this, tag, ns);
  }
  createTextNode(data) {
    return new Text(this, data);
  }
  createComment(data) {
    return new Comment(this, data);
  }
  createDocumentFragment() {
    const f = new Node(this, DOCUMENT_FRAGMENT_NODE, "#document-fragment");
    return f;
  }
  getElementById(id) {
    return this.documentElement.querySelector(`#${id}`);
  }
  querySelector(s) {
    return this.documentElement.querySelector(s);
  }
  querySelectorAll(s) {
    return this.documentElement.querySelectorAll(s);
  }
  hasFocus() {
    return true;
  }
}

const serialise = (n) => {
  if (n.nodeType === TEXT_NODE) {
    return n.data.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }
  if (n.nodeType === COMMENT_NODE) {
    return `<!--${n.data}-->`;
  }
  if (n.nodeType !== ELEMENT_NODE) {
    return n.childNodes.map(serialise).join("");
  }
  const attrs = [...n._attrs].map(([k, v]) => ` ${k}="${v}"`).join("");
  const style = n.style.cssText ? ` style="${n.style.cssText}"` : "";
  return `<${n.localName}${attrs}${style}>${n.childNodes.map(serialise).join("")}</${n.localName}>`;
};

// ── fake timers ────────────────────────────────────────────────────────
const fakeTimers = () => {
  let now = 0;
  let nextId = 1;
  const queue = new Map();
  const add = (fn, ms, repeat, args) => {
    const id = nextId++;
    queue.set(id, {
      args,
      at: now + Math.max(0, Number(ms) || 0),
      fn,
      ms: Math.max(1, Number(ms) || 0),
      repeat,
    });
    return id;
  };
  const api = {
    cancelAnimationFrame: (id) => queue.delete(id),
    clearInterval: (id) => queue.delete(id),
    clearTimeout: (id) => queue.delete(id),
    now: () => now,
    pending: () => queue.size,
    requestAnimationFrame: (fn) => add(() => fn(now), 16, false, []),
    setInterval: (fn, ms, ...args) => add(fn, ms, true, args),
    setTimeout: (fn, ms, ...args) => add(fn, ms, false, args),
  };
  // Run every timer due by now + ms, in time order, inside `wrap` (React.act).
  api.advance = (ms, wrap = (f) => f()) => {
    const end = now + ms;
    for (;;) {
      let next = null;
      for (const [id, t] of queue) {
        if (
          t.at <= end &&
          (!next || t.at < next[1].at || (t.at === next[1].at && id < next[0]))
        ) {
          next = [id, t];
        }
      }
      if (!next) {
        break;
      }
      const [id, t] = next;
      now = t.at;
      if (t.repeat) {
        t.at = now + t.ms;
      } else {
        queue.delete(id);
      }
      wrap(() => t.fn(...t.args));
    }
    now = end;
  };
  return api;
};

// ── the runtime ────────────────────────────────────────────────────────
// Each runtime gets fresh copies of react and react-dom (the require cache is cleared for them),
// so state such as the act queue never leaks between cases run in one process.
const clearReactCache = () => {
  for (const k of Object.keys(require.cache)) {
    if (
      k.startsWith(REACT) ||
      k.startsWith(REACT_DOM) ||
      k.includes("/scheduler@")
    ) {
      delete require.cache[k];
    }
  }
};

const createRuntime = ({ renderCap = 500, strict = false } = {}) => {
  const document = new Document();
  // The window is an event target too (listeners added in effects: resize, keydown, …).
  const target = new Node(document, 0, "#window");
  const window = {
    _invoke: (e, capture) => target._invoke(e, capture),
    addEventListener: (t, fn, o) => target.addEventListener(t, fn, o),
    dispatchEvent: (e) => {
      e.target = window;
      target._invoke(e, true);
      target._invoke(e, false);
      return !e.defaultPrevented;
    },
    document,
    event: undefined,
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    getSelection: () => null,
    HTMLElement: Element,
    HTMLIFrameElement,
    innerHeight: 768,
    innerWidth: 1024,
    location: {
      hash: "",
      href: "http://localhost/",
      pathname: "/",
      search: "",
    },
    matchMedia: (q) => ({
      addEventListener() {},
      addListener() {},
      matches: false,
      media: q,
      removeEventListener() {},
      removeListener() {},
    }),
    navigator: { userAgent: "node" },
    removeEventListener: (t, fn, o) => target.removeEventListener(t, fn, o),
  };
  window.window = window;
  window.self = window;
  document.defaultView = window;
  const timers = fakeTimers();
  // React DOM reads these globals when it loads and when it runs.
  const saved = {};
  const globals = {
    document,
    Event,
    HTMLElement: Element,
    HTMLIFrameElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    navigator: window.navigator,
    Node,
    window,
  };
  for (const [k, v] of Object.entries(globals)) {
    saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
    Object.defineProperty(globalThis, k, {
      configurable: true,
      value: v,
      writable: true,
    });
  }
  clearReactCache();
  const React = require(REACT);
  const ReactDOM = require(join(REACT_DOM, "client"));
  const jsxRuntime = require(join(REACT, "jsx-runtime"));
  const trace = {
    calls: [],
    cleanups: [],
    errors: [],
    events: [],
    renders: {},
    setups: [],
    warnings: [],
  };
  let actRenders = new Map();
  let actSetups = 0;
  let loop = null;
  // console.error / warn from React
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args) => {
    trace.warnings.push(
      args
        .map((a) => (a instanceof Error ? a.message : String(a)))
        .join(" ")
        .slice(0, 400)
    );
  };
  console.warn = console.error;
  const restore = () => {
    console.error = origError;
    console.warn = origWarn;
    for (const [k, d] of Object.entries(saved)) {
      if (d) {
        Object.defineProperty(globalThis, k, d);
      } else {
        delete globalThis[k];
      }
    }
  };

  // Components are wrapped (once each) so every render is counted by name.
  const wrapped = new WeakMap();
  const wrapType = (type) => {
    if (typeof type !== "function" || type.prototype?.isReactComponent) {
      return type;
    }
    if (!wrapped.has(type)) {
      const name = type.displayName || type.name || "Anonymous";
      const w = function (...a) {
        trace.renders[name] = (trace.renders[name] ?? 0) + 1;
        const n = (actRenders.get(name) ?? 0) + 1;
        actRenders.set(name, n);
        trace.events.push({ name, type: "render" });
        if (n > renderCap) {
          loop ??= { component: name, renders: n };
          throw new Error(`render cap: ${name} rendered ${n} times in one act`);
        }
        return type(...a);
      };
      Object.defineProperty(w, "name", { value: name });
      w.displayName = name;
      wrapped.set(type, w);
    }
    return wrapped.get(type);
  };
  const instrumentedRuntime = {
    Fragment: jsxRuntime.Fragment,
    jsx: (type, props, key) => jsxRuntime.jsx(wrapType(type), props, key),
    jsxDEV: (type, props, key) => jsxRuntime.jsx(wrapType(type), props, key),
    jsxs: (type, props, key) => jsxRuntime.jsxs(wrapType(type), props, key),
  };
  // The hook's line: the caller's frame in the transpiled module (labelled through `labelOf`).
  let labelOf = () => null;
  const callerLine = () => {
    const stack = new Error().stack.split("\n").slice(3, 8).join("\n");
    return labelOf(stack);
  };
  const wrapEffect = (kind, real) =>
    function (fn, deps) {
      const label = `${kind}@${callerLine() ?? "?"}`;
      return real(() => {
        trace.setups.push(label);
        trace.events.push({ hook: label, type: "setup" });
        actSetups++;
        if (actSetups > renderCap * 4) {
          loop ??= { hook: label, setups: actSetups };
          throw new Error(
            `effect cap: ${label} set up ${actSetups} times in one act`
          );
        }
        const c = fn();
        if (typeof c === "function") {
          return () => {
            trace.cleanups.push(label);
            trace.events.push({ hook: label, type: "cleanup" });
            return c();
          };
        }
        return c;
      }, deps);
    };
  const wrapMemo = (kind, real) =>
    function (fn, deps) {
      const label = `${kind}@${callerLine() ?? "?"}`;
      if (kind === "useCallback") {
        // count identity changes
        const v = real(fn, deps);
        return v;
      }
      return real(() => {
        trace.setups.push(label);
        trace.events.push({ hook: label, type: "compute" });
        return fn();
      }, deps);
    };
  const instrumented = {
    ...React,
    createElement: (type, props, ...children) =>
      React.createElement(wrapType(type), props, ...children),
    useEffect: wrapEffect("useEffect", React.useEffect),
    useInsertionEffect: wrapEffect(
      "useInsertionEffect",
      React.useInsertionEffect
    ),
    useLayoutEffect: wrapEffect("useLayoutEffect", React.useLayoutEffect),
    useMemo: wrapMemo("useMemo", React.useMemo),
  };
  instrumented.default = instrumented;

  const container = document.createElement("div");
  document.body.appendChild(container);
  let root = null;
  const act = (fn) => {
    actRenders = new Map();
    actSetups = 0;
    let result;
    let error = null;
    try {
      React.act(() => {
        result = fn();
      });
    } catch (e) {
      error = e;
    }
    if (error) {
      trace.errors.push(String(error.message ?? error).slice(0, 300));
    }
    return result;
  };
  // An async act, for code that sets state after awaiting (React.act flushes the microtasks).
  const actAsync = async (fn) => {
    actRenders = new Map();
    actSetups = 0;
    try {
      await React.act(async () => {
        await fn();
      });
    } catch (e) {
      trace.errors.push(String(e?.message ?? e).slice(0, 300));
    }
  };
  // Let pending promises settle inside act.
  const settle = (rounds = 5) =>
    actAsync(async () => {
      for (let i = 0; i < rounds; i++) {
        await new Promise((r) => setImmediate(r));
      }
    });
  const wrapRoot = (el) =>
    strict ? React.createElement(React.StrictMode, null, el) : el;
  const api = {
    act,
    actAsync,
    settle,
    container,
    document,
    instrumented,
    instrumentedRuntime,
    React,
    ReactDOM,
    restore,
    timers,
    trace,
    window,
    get loop() {
      return loop;
    },
    // createElement through the instrumented React, so the root component's renders count too
    h: (type, props, ...children) =>
      instrumented.createElement(type, props, ...children),
    setLabeller: (fn) => {
      labelOf = fn;
    },
    mount: (el) => {
      root = ReactDOM.createRoot(container, {
        onCaughtError: (e) =>
          trace.errors.push(`caught: ${String(e?.message ?? e).slice(0, 300)}`),
        onRecoverableError: (e) =>
          trace.errors.push(
            `recoverable: ${String(e?.message ?? e).slice(0, 300)}`
          ),
        onUncaughtError: (e) =>
          trace.errors.push(
            `uncaught: ${String(e?.message ?? e).slice(0, 300)}`
          ),
      });
      act(() => root.render(wrapRoot(el)));
    },
    update: (el) => act(() => root.render(wrapRoot(el))),
    unmount: () => act(() => root.unmount()),
    advance: (ms) => timers.advance(ms, (f) => act(f)),
    text: () => container.textContent,
    html: () => container.innerHTML,
    query: (s) => container.querySelector(s),
    queryAll: (s) => container.querySelectorAll(s),
    click: (el) => act(() => el.click()),
    dispatch: (el, type, init = { bubbles: true }) =>
      act(() => el.dispatchEvent(new Event(type, init))),
    // React's props for a host node (the key react-dom stores them under), to call a handler
    // directly when the minimal DOM can't produce the event.
    propsOf: (el) => {
      const key = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
      return key ? el[key] : null;
    },
  };
  return api;
};

// ── loading a module (a calibration case or a subject) ─────────────────
// TypeScript's transpileModule (react-jsx), then compiled as a CommonJS module whose `react`,
// `react/jsx-runtime` and `react-dom` resolve to the runtime's instrumented copies and `stubs`
// supply any other import. Hook calls are labelled by their line in the original source, through a
// line map from the transpiled output (TypeScript keeps statement lines close but not exact, so the
// map comes from a source map).
const loadModule = (
  rt,
  source,
  filename,
  { stubs = {}, globals = {} } = {}
) => {
  const ts = require(
    require("./tools.cjs").dirs.typescript + "/lib/typescript.js"
  );
  const out = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      sourceMap: true,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  const map = JSON.parse(out.sourceMapText);
  const lineMap = decodeLines(map.mappings);
  const tag = `__effects_module_${Math.random().toString(36).slice(2)}.js`;
  rt.setLabeller((stack) => {
    const m = new RegExp(`${tag.replace(/\./g, "\\.")}:(\\d+):(\\d+)`).exec(
      stack
    );
    if (!m) {
      return null;
    }
    const gen = Number(m[1]) - 1;
    return lineMap[gen] !== undefined ? lineMap[gen] + 1 : null;
  });
  const mod = new Module(tag);
  mod.filename = tag;
  mod.paths = [];
  const reactDom = require(join(REACT_DOM, "index.js"));
  mod.require = (id) => {
    if (id === "react") {
      return rt.instrumented;
    }
    if (id === "react/jsx-runtime" || id === "react/jsx-dev-runtime") {
      return rt.instrumentedRuntime;
    }
    if (id === "react-dom") {
      return reactDom;
    }
    if (id in stubs) {
      return stubs[id];
    }
    throw new Error(`no stub for import "${id}"`);
  };
  const wrapper = Module.wrap(
    out.outputText.replace(/\/\/# sourceMappingURL=.*$/m, "")
  );
  const fn = require("node:vm").runInThisContext(wrapper, { filename: tag });
  const g = { ...globals };
  const prev = {};
  for (const [k, v] of Object.entries(g)) {
    prev[k] = Object.getOwnPropertyDescriptor(globalThis, k);
    Object.defineProperty(globalThis, k, {
      configurable: true,
      value: v,
      writable: true,
    });
  }
  fn.call(mod.exports, mod.exports, mod.require, mod, tag, "");
  return mod.exports;
};
// Source map "mappings": for each generated line, the first original line it maps to.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const decodeLines = (mappings) => {
  const out = [];
  let srcLine = 0;
  const lines = mappings.split(";");
  for (let g = 0; g < lines.length; g++) {
    let first = null;
    for (const seg of lines[g].split(",")) {
      if (!seg) {
        continue;
      }
      const vals = [];
      let shift = 0;
      let value = 0;
      for (const ch of seg) {
        let digit = B64.indexOf(ch);
        const cont = digit & 32;
        digit &= 31;
        value += digit << shift;
        if (cont) {
          shift += 5;
        } else {
          vals.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      if (vals.length >= 3) {
        srcLine += vals[2];
        if (first === null) {
          first = srcLine;
        }
      }
    }
    out[g] = first ?? (g > 0 ? out[g - 1] : 0);
  }
  return out;
};

module.exports = {
  Event,
  REACT,
  REACT_DOM,
  TYPES_REACT,
  createRuntime,
  decodeLines,
  loadModule,
};
