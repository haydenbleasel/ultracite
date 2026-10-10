// The researched content of one agent landing page (pages/agents/<id>.astro),
// rendered by components/agents/agent-page.astro. What `init` writes comes
// from the CLI's own table at build time; everything here is about the agent
// itself, checked against its docs or source on `checked.date`.
//
// Copy strings may hold `backticks` for inline code (lib/inline-code.ts).

/** One place the agent looks for instructions, in the order it looks. */
export interface LookupStep {
  /** What happens there: loaded, skipped when…, wins over…, and so on. */
  note: string;
  /** A path, or a short description when there's no single path. */
  path: string;
}

/** A label and a value, such as "Size limit" and "32 KiB per file". */
export interface Fact {
  label: string;
  value: string;
}

/** A config file or snippet shown as a code block. */
export interface Snippet {
  code: string;
  /** Shiki language id: json, jsonc, toml, yaml, ts, md, bash… */
  lang: string;
  /** Shown above the block. */
  title: string;
}

export interface AgentPageContent {
  /** What the facts were checked against, shown on the page. */
  checked: {
    /** ISO date. */
    date: string;
    /**
     * What the version belongs to, when that isn't the agent's own name,
     * such as "Auggie CLI" for Augment Code.
     */
    product?: string;
    /** The agent's version, when it has one, such as "0.42.1". */
    version?: string;
  };
  faqs: { answer: string; question: string }[];
  /** The H1: specific to this agent, under 50 characters. */
  headline: string;
  /** Two to four things worth knowing that only this agent has. */
  highlights: { body: string; title: string }[];
  /** The hero paragraph, two or three sentences. */
  intro: string;
  /**
   * After the agent edits a file: the strongest way the project's checks
   * reach it. When `init` writes a hook for this agent, the page shows it
   * from the CLI's data, and this explains it in the agent's terms.
   */
  loop: {
    body: string;
    /** Extra config the user adds by hand, verified against the docs. */
    snippets?: Snippet[];
    /**
     * What happens after the agent edits a file, in three or four short
     * steps, shown beside the config.
     */
    steps: string[];
    title: string;
  };
  /** Under 160 characters. */
  metaDescription: string;
  /** The <title>, under 65 characters. */
  metaTitle: string;
  /** Agents to link at the bottom, by CLI id. */
  related: string[];
  rules: {
    /** Specifics: size limits, nesting, global files, how to check. */
    facts: Fact[];
    /** Where it looks for instructions, in order. */
    lookup: LookupStep[];
    summary: string;
  };
  /** Whether and where it finds the Ultracite skill. */
  skills: string;
  /** Every page the facts came from. */
  sources: { title: string; url: string }[];
}
