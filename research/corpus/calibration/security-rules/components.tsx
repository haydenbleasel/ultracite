// Hand-written calibration cases for the JSX security rules (not from any repo): the plain
// sinks, and the ways an agent might reach the same sink without the prop the rule looks for.
// Never executed, only linted.
//
// Each case starts with a `// <ID>: <description>` comment and runs to the next one.
// Run: node research/corpus/scripts/security-linters.cjs --calibration

import { createElement, useEffect, useRef } from "react";
import type { ReactElement } from "react";

declare const input: string;
declare const newTab: boolean;
declare const props: Record<string, string>;
declare const sanitize: (html: string) => string;
declare const Link: (props: { href: string; target?: string; children: string }) => ReactElement;

// ── HTML ─────────────────────────────────────────────────────────────
// J01: dangerouslySetInnerHTML from a variable
export const J01 = (): ReactElement => <div dangerouslySetInnerHTML={{ __html: input }} />;
// J02: dangerouslySetInnerHTML from a static literal
export const J02 = (): ReactElement => <div dangerouslySetInnerHTML={{ __html: "<b>static</b>" }} />;
// J03: dangerouslySetInnerHTML passed through a spread
export const J03 = (): ReactElement => <div {...{ dangerouslySetInnerHTML: { __html: input } }} />;
// J04: dangerouslySetInnerHTML through createElement
export const J04 = (): ReactElement => createElement("div", { dangerouslySetInnerHTML: { __html: input } });
// J05: innerHTML through a ref in an effect, instead of dangerouslySetInnerHTML
export const J05 = (): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = input;
    }
  }, []);
  return <div ref={ref} />;
};
// J06: innerHTML through a callback ref
export const J06 = (): ReactElement => (
  <div
    ref={(node) => {
      if (node) {
        node.innerHTML = input;
      }
    }}
  />
);
// J07: dangerouslySetInnerHTML with a sanitizer (still flagged: the rules can't see sanitizers)
export const J07 = (): ReactElement => <div dangerouslySetInnerHTML={{ __html: sanitize(input) }} />;
// J08: serialized JSON in a script tag (the Next.js pattern)
export const J08 = (): ReactElement => <script dangerouslySetInnerHTML={{ __html: JSON.stringify({ input }) }} />;
// J09: an iframe with srcDoc from a variable
export const J09 = (): ReactElement => <iframe srcDoc={input} title="preview" />;
// J10: an iframe with a src from a variable and no sandbox
export const J10 = (): ReactElement => <iframe src={input} title="embed" />;
// J11: an iframe whose sandbox allows scripts and same-origin
export const J11 = (): ReactElement => <iframe sandbox="allow-scripts allow-same-origin" src={input} title="embed" />;

// ── URLs ─────────────────────────────────────────────────────────────
// J12: href="javascript:…"
export const J12 = (): ReactElement => <a href="javascript:void(0)">x</a>;
// J13: a javascript: href built by concatenation
export const J13 = (): ReactElement => <a href={"javascript:" + input}>x</a>;
// J14: a javascript: href built with a template literal
export const J14 = (): ReactElement => <a href={`javascript:${input}`}>x</a>;
// J15: an href from a variable
export const J15 = (): ReactElement => <a href={input}>x</a>;

// ── target="_blank" ──────────────────────────────────────────────────
// J16: external link, target _blank, no rel
export const J16 = (): ReactElement => <a href="https://example.com" target="_blank">x</a>;
// J17: rel="noopener" only
export const J17 = (): ReactElement => <a href="https://example.com" rel="noopener" target="_blank">x</a>;
// J18: rel="noreferrer"
export const J18 = (): ReactElement => <a href="https://example.com" rel="noreferrer" target="_blank">x</a>;
// J19: dynamic href, no rel
export const J19 = (): ReactElement => <a href={input} target="_blank">x</a>;
// J20: internal link, no rel
export const J20 = (): ReactElement => <a href="/docs" target="_blank">x</a>;
// J21: href and rel arrive through a spread
export const J21 = (): ReactElement => <a {...props} target="_blank">x</a>;
// J22: a link component, not <a>
export const J22 = (): ReactElement => <Link href="https://example.com" target="_blank">x</Link>;
// J23: target chosen by a condition
export const J23 = (): ReactElement => <a href="https://example.com" target={newTab ? "_blank" : undefined}>x</a>;
// J24: a form that posts to a new tab
export const J24 = (): ReactElement => <form action={input} target="_blank" />;

// ── code execution inside a component ────────────────────────────────
// J25: eval in an event handler
export const J25 = (): ReactElement => <button onClick={() => eval(input)} type="button">x</button>;
// J26: setTimeout with a string in an event handler
export const J26 = (): ReactElement => <button onClick={() => setTimeout(input, 10)} type="button">x</button>;
