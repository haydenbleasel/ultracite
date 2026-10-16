// Explains where Oxlint, ESLint and Biome disagree on the same accessibility concept in the corpus.
//
// The linters report the same problem at different positions (ESLint at the opening element,
// Oxlint and Biome often at the attribute), so a line-by-line comparison mixes real disagreements
// with position differences. This script maps every raw-mode report (out/accessibility/corpus/) to
// the innermost JSX element whose opening tag contains it, compares the three linters per concept
// by element, and describes each element the linters disagree on: DOM element or component, tag,
// literal role, spread props, aria-hidden, aria-label/labelledby, title, children.
//
// Usage (from the repo root, after a11y-linters.cjs --corpus):
//   node research/corpus/scripts/a11y-disagreements.cjs
// Writes results/accessibility/disagreements.json.
"use strict";

const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const lib = require("./a11y-lib.cjs");

const { dc, ts } = lib;

const rows = (name, tool) => {
  const f = join(lib.OUT_DIR, "corpus", `${name}.${tool}.raw.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : [];
};

// Opening tags of a file: { start, end (lines of the opening tag), tag, features }.
const openings = (abs) => {
  const text = readFileSync(abs, "utf8");
  const sf = ts.createSourceFile(
    abs,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const out = [];
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      const attrs = {};
      let spread = false;
      for (const p of node.attributes.properties) {
        if (ts.isJsxSpreadAttribute(p)) {
          spread = true;
        } else {
          const init = p.initializer;
          attrs[p.name.getText(sf)] = !init
            ? true
            : ts.isStringLiteral(init)
              ? init.text
              : ts.isJsxExpression(init) &&
                  init.expression &&
                  ts.isStringLiteral(init.expression)
                ? init.expression.text
                : "{…}";
        }
      }
      const parent = ts.isJsxOpeningElement(node) ? node.parent : null;
      const children = parent
        ? parent.children.filter((c) => !(ts.isJsxText(c) && !c.text.trim()))
        : [];
      out.push({
        attrs,
        children: children.map((c) =>
          ts.isJsxText(c)
            ? "text"
            : ts.isJsxExpression(c)
              ? "expression"
              : ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)
                ? `<${(ts.isJsxElement(c) ? c.openingElement : c).tagName.getText(sf)}>`
                : "other"
        ),
        end: sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
        spread,
        start: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        tag,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
};

const kindOf = (tag) =>
  /^[a-z][\w-]*$/.test(tag)
    ? "dom"
    : /^[A-Za-z_$][\w$]*\.[a-z]+$/.test(tag)
      ? "factory"
      : "component";

const main = () => {
  const out = {
    concepts: {},
    generated: new Date().toISOString().slice(0, 10),
  };
  for (const name of lib.REPOS) {
    const root = lib.getRepo(name).root;
    const cache = new Map();
    const elementOf = (file, line) => {
      if (!cache.has(file)) {
        cache.set(file, openings(join(root, file)));
      }
      // Innermost opening tag containing the line (the latest start among those that contain it).
      let best = null;
      for (const o of cache.get(file)) {
        if (
          o.start <= line &&
          line <= o.end &&
          (!best || o.start >= best.start)
        ) {
          best = o;
        }
      }
      return best;
    };
    const add = (tool, d, concept) => {
      if (!concept) {
        return;
      }
      const el = elementOf(d.file, d.line);
      const key = el ? `${d.file}:${el.start}` : `${d.file}:${d.line}`;
      const c = (out.concepts[concept] ??= { elements: {} });
      const e = (c.elements[`${name}/${key}`] ??= {
        element: el
          ? {
              attrs: el.attrs,
              children: el.children.slice(0, 6),
              kind: kindOf(el.tag),
              spread: el.spread,
              tag: el.tag,
            }
          : null,
        file: d.file,
        line: el ? el.start : d.line,
        repo: name,
        who: [],
      });
      if (!e.who.includes(tool)) {
        e.who.push(tool);
      }
    };
    for (const d of rows(name, "oxlint")) {
      add("oxlint", d, lib.conceptOfJsx.get(dc.toOxlintName(d.rule)));
    }
    for (const d of rows(name, "eslint")) {
      add("eslint", d, lib.conceptOfJsx.get(dc.toOxlintName(d.rule)));
    }
    for (const d of rows(name, "biome")) {
      add("biome", d, lib.conceptOfBiome.get(d.rule));
    }
  }
  // Summaries: who reports, and the features of the elements they disagree on.
  for (const [concept, c] of Object.entries(out.concepts)) {
    const els = Object.values(c.elements);
    const bucket = {};
    for (const e of els) {
      const who = ["oxlint", "eslint", "biome"]
        .filter((t) => e.who.includes(t))
        .join("+");
      const b = (bucket[who] ??= {
        byKind: {},
        byRole: {},
        byTag: {},
        n: 0,
        withAriaHidden: 0,
        withAriaLabel: 0,
        withSpread: 0,
        withTitle: 0,
      });
      b.n++;
      const el = e.element;
      if (el) {
        b.byKind[el.kind] = (b.byKind[el.kind] ?? 0) + 1;
        b.byTag[el.tag] = (b.byTag[el.tag] ?? 0) + 1;
        if (el.attrs.role !== undefined) {
          b.byRole[el.attrs.role] = (b.byRole[el.attrs.role] ?? 0) + 1;
        }
        b.withSpread += el.spread ? 1 : 0;
        b.withAriaHidden += el.attrs["aria-hidden"] !== undefined ? 1 : 0;
        b.withAriaLabel +=
          el.attrs["aria-label"] !== undefined ||
          el.attrs["aria-labelledby"] !== undefined
            ? 1
            : 0;
        b.withTitle += el.attrs.title !== undefined ? 1 : 0;
      }
    }
    const top = (o, n = 8) =>
      Object.fromEntries(
        Object.entries(o)
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
      );
    for (const b of Object.values(bucket)) {
      b.byTag = top(b.byTag);
      b.byRole = top(b.byRole);
    }
    c.summary = { elements: els.length, byWho: bucket };
    c.examples = els
      .filter((e) => e.who.length < 3)
      .slice(0, 12)
      .map((e) => ({ ...e, permalink: lib.permalink(e.repo, e.file, e.line) }));
    delete c.elements;
  }
  lib.writeJson(join(lib.RESULTS_DIR, "disagreements.json"), out);
  for (const [concept, c] of Object.entries(out.concepts)) {
    console.log(
      concept.padEnd(44),
      Object.entries(c.summary.byWho)
        .map(([w, b]) => `${w} ${b.n}`)
        .join(", ")
    );
  }
};

main();
