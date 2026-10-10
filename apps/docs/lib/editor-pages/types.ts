// The researched content of one editor landing page (pages/editors/<id>.astro),
// rendered by components/editors/editor-page.astro. What `init` writes and
// installs comes from the CLI's own table at build time; everything here is
// about the editor itself, checked against its docs or source on
// `checked.date`.
//
// Copy strings may hold `backticks` for inline code (lib/inline-code.ts).

import type { Fact, LookupStep, Snippet } from "../agent-pages/types";

export interface EditorPageContent {
  /**
   * What you do in the editor after `init`, in two or three short steps,
   * ending with what you see when it works.
   */
  afterInit: string[];
  /**
   * The editor's built-in agent, when it has one: how it reads the rules
   * and what happens after it edits a file.
   */
  agent?: {
    body: string;
    /** Where the agent looks for instructions, in order. */
    lookup: LookupStep[];
    /** Extra config the user adds by hand, verified against the docs. */
    snippets?: Snippet[];
    /** What happens after the agent edits a file, in three or four steps. */
    steps: string[];
    /** ≤ 45 characters. */
    title: string;
  };
  /** What the facts were checked against, shown on the page. */
  checked: {
    /** ISO date. */
    date: string;
    /** The editor's version, when it has one, such as "1.23.2". */
    version?: string;
  };
  faqs: { answer: string; question: string }[];
  /** The H1: specific to this editor, under 50 characters. */
  headline: string;
  /** Exactly three things worth knowing that only this editor has. */
  highlights: { body: string; title: string }[];
  /**
   * Replaces the hero's note on the hook `init --hooks <id>` writes, when
   * the generic one (it runs `ultracite fix --hook` on each file the agent
   * edits) isn't true of the editor's current version.
   */
  hookNote?: string;
  /** The hero paragraph, two or three sentences. */
  intro: string;
  /** Under 160 characters. */
  metaDescription: string;
  /** The <title>, under 65 characters. */
  metaTitle: string;
  /** Editors to link at the bottom, by CLI id. */
  related: string[];
  /**
   * How the linter runs in this editor once `init` is done: where its
   * extensions come from, what it needs before the settings apply.
   */
  setup: {
    /** Three or six facts (the grid is three wide). */
    facts: Fact[];
    summary: string;
    /** ≤ 45 characters. */
    title: string;
  };
  /** Every page the facts came from. */
  sources: { title: string; url: string }[];
}
