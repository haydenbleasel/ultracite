# Accessibility lint rules: literature and source notes

Compiled 2026-10-15 for the Ultracite research post on accessibility lint rules: `eslint-plugin-jsx-a11y` and its Oxlint port (`jsx-a11y/*`), Biome's `a11y` group (`useAltText`, `useButtonType`, `useKeyWithClickEvents`, `noStaticElementInteractions`, `useSemanticElements`, `useValidAriaProps` and the rest), and the template equivalents for Vue, Svelte and Angular. It also covers the `no-autofocus` rule, which Ultracite turns off in every linter, and the accessibility lines in the rules Ultracite writes into AGENTS.md ("Use semantic HTML and ARIA attributes for accessibility", with alt text, heading hierarchy, form labels, keyboard handlers and semantic elements as sub-bullets).

**How to read the tags**

- **VERIFIED**: the primary source (the PDF, the publisher or arXiv record, the W3C or WHATWG spec, the Federal Register or Official Journal text, the court opinion, the official docs, the tool's source code, or the GitHub issue or PR) was opened and the claim found in it.
- **VERIFIED (metadata + abstract)**: the bibliographic record (Crossref, OpenAlex, Semantic Scholar or the publisher page) and the abstract were checked, but not the full text.
- **ANECDOTAL**: a real, primary page exists and says what is reported here, but it is a single practitioner or company report, not a study. Don't present it as a rate or a trend.
- **UNVERIFIED**: only secondary mentions were found. Don't cite these as fact.
- **Vendor** marks research or claims by a company that sells a product in this space (Deque, AudioEye, UsableNet, Axess Lab, IBM, Vercel, Microsoft/GitHub, Anthropic, OpenAI, Lovable, Chromatic/Storybook, VoidZero/Oxc).

Every quote is copied exactly and is under 15 words. Where a longer sentence matters, it is given as consecutive quoted segments.

**How sources were fetched.** Pages and PDFs were read with WebSearch, WebFetch and unauthenticated `curl`. Metadata came from Crossref (no `mailto`), OpenAlex (no `mailto`), Semantic Scholar (no key), the arXiv API, the Federal Register API (no key), the npm registry and downloads API, deps.dev and the Wayback Machine. PDFs were saved under `scratchpad/a11y-pdfs/` and read with `pdftotext`. EUR-Lex blocked `curl`, so the EU directives were read from the Publications Office cellar copy of the Official Journal text. The ACM Digital Library returned 403 to every request, so ACM papers were read only where an author, institutional or Wayback copy exists; the rest are tagged "metadata + abstract". The `gh` CLI, which authenticates with the local GitHub login, was used read-only on public repositories (commits, files, issues, PRs, releases and code-search totals). The AIDev dataset was queried through the public Hugging Face datasets-server with no login. No email address or account detail was put in any URL, query, header or form. Live pages, counts and issue states are as of 2026-10-15 unless a date is given.

**About the "my check" items.** Several entries report runs made on 15 Oct 2026 with the worktree's binaries: Oxlint 1.86.0, Biome 2.5.15, ESLint 10.12.0 and eslint-plugin-jsx-a11y 6.10.2. The most complete is 6.12, a 32-case fixture run through seven configurations (Ultracite's three presets, jsx-a11y's `recommended` and `strict`, Biome's recommended set, and Oxlint's default categories). Its fixture, configs and a `run.sh` that reprints the whole table are kept at `scratchpad/a11y-lint-check/`. Entries 6.7 and 5.48 are smaller ad-hoc runs; their fixtures are in `scratchpad/a11y-check/` (`cases.jsx`, `fixtures/gaming.tsx`, `fixtures/hidden.tsx`), but their run commands were not kept. GitHub code-search totals (5.51, 5.52) and the AIDev query (5.49) are also "my check". Move all of these into the `research/` harness before putting a number in the post.

---

## Most useful for the post

1. **The standards grew by addition for 25 years, and the one criterion ever removed is the one closest to what a linter checks.**
   - Section 508 was rewritten by the Workforce Investment Act (signed 7 Aug 1998). The first Access Board standards were published 21 Dec 2000 (65 FR 80500) and took effect 20 Feb 2001. The 2017 refresh (82 FR 5790, 18 Jan 2017; compliance from 18 Jan 2018) incorporated WCAG 2.0 Level A and AA by reference.
   - WCAG 1.0: 5 May 1999. WCAG 2.0: 11 Dec 2008, 61 success criteria. WCAG 2.1: 5 June 2018, "adds 1 guideline and 17 success criteria" (78). WCAG 2.2: 5 Oct 2023, "adds 9 success criteria" and removes 4.1.1 Parsing (86).
   - W3C's reason for removing 4.1.1: "Assistive technology no longer has any need to directly parse HTML." In Deque's 2021 audit data, 4.1.1 was 11.7% of all issues.
   - WCAG 3 is still a Working Draft (10 Sep 2026), "not expected to be a completed W3C standard for a few more years." Its "not backward compatible" line and 0–4 scoring are from the 2021 draft and have since been dropped. (1.1–1.8, 2.3)
2. **The first rule of ARIA is real, but the W3C document that stated it is now officially abandoned.**
   - The rule, in consecutive segments: "If you can use a native HTML element [HTML] or attribute" / "with the semantics and behavior you require already built in," / "instead of re-purposing an element and adding an ARIA role, state or property" / "to make it accessible, then do so."
   - _Using ARIA_ was a Working Draft from 2013 to 2018, never a Note. On 24 Feb 2026 it became a Discontinued Draft: "It is inappropriate to cite this document as other than abandoned work." Cite it as history and send readers to the APG.
   - The APG's "No ARIA is better than Bad ARIA" section gives the best one-line rationale for the keyboard rules: "Principle 1: A role is a promise." It doesn't cite the WebAIM Million; that statistic is WebAIM's own.
   - ARIA 1.0 became a Recommendation on 20 Mar 2014, 1.1 on 14 Dec 2017 and 1.2 on 6 June 2023. ARIA 1.3 is a Working Draft. (1.9–1.11)
3. **Legal pressure is real, and a regulator has said in writing that AI doesn't yet fix accessibility at scale.**
   - DOJ's ADA Title II rule (89 FR 31320, 24 Apr 2024) made WCAG 2.1 AA the standard for state and local governments. An interim final rule four days before the first deadline (91 FR 20902, 20 Apr 2026) moved the dates to 26 Apr 2027 and 26 Apr 2028. Among DOJ's reasons: "generative AI, does not yet reliably automate the remediation of inaccessible content at scale". The NFB has sued (D. Md., filed 21 May 2026).
   - Seyfarth Shaw counts federal website-accessibility suits only: 3,117 in 2025, up from 2,452 in 2024. State suits and demand letters "are not included".
   - The European Accessibility Act has applied since 28 June 2025. EN 301 549 V4.1.1 (2026-09), written for it, aligns with WCAG 2.2, but I found no Official Journal citation of it yet. (1.13–1.23)
4. **jsx-a11y was built as the static half of a runtime tool, by one person, and Airbnb made it the default.**
   - Ethan Cohen's "Initial commit." is dated 17 Feb 2016 (npm 0.0.1 on 29 Feb). Its first rule names mirror Ryan Florence's runtime library react-a11y (Jan 2015). The early README said static tools "cannot determine values of variables that are being placed in props before runtime".
   - It was never an Airbnb repo. eslint-config-airbnb 7.0.0 (11 Apr 2016) adopted it, and it moved to the `jsx-eslint` org in 2020.
   - Today: 39 rules (36 live), 31 in `recommended`, about 50 million downloads a week. No release since 6.10.2 (26 Oct 2024). (1.28, 1.31, 1.32, 4.15)
5. **The ports copy jsx-a11y almost rule for rule, and the runtime engine they all lean on was designed for precision, not coverage.**
   - Oxlint implements all 36 live jsx-a11y rules (the first on 2 Nov 2023), with the plugin off by default. Biome's `a11y` group has 38 rules, and 35 of its 37 JSX rules declare jsx-a11y as "same logic". Rome created the group in Nov 2022.
   - Svelte's compiler warnings began in 2017 with a plan to "implement as many of the eslint-plugin-jsx-a11y rules as possible". angular-eslint and eslint-plugin-vuejs-accessibility descend from the same rules.
   - axe-core was open-sourced by Deque on 10 June 2015 with the promise "Enjoy zero false positive results". Lighthouse has run a subset of axe since Apr 2016 and says "Automatic detection can only detect a subset of issues". (1.29, 1.34, 1.36–1.40)
6. **Most React developers who "have jsx-a11y" run a handful of warnings.** `eslint-config-next` turns on 6 of its rules, all at `warn`. Create React App's config has 17, also at `warn`, and none of the keyboard rules. react.dev never mentions jsx-a11y or axe. jsx-a11y's own `recommended` leaves out `prefer-tag-over-role`, `no-aria-hidden-on-focusable`, `control-has-associated-label`, `lang` and `anchor-ambiguous-text`. (1.35, 4.16, 6.12)
7. **No single automated tool finds half the barriers on a page built to fail.**
   - GDS (blog, 24 Feb 2017): 10 tools, 143 barriers, 29% "missed by all of the tools". The best single tool found 37–41%. After re-tests (13 Apr 2018): 13 tools, 142 barriers, best 40% (50% counting "needs review" prompts); aXe 29%.
   - Vigo, Brown and Conway (W4A 2013, abstract): coverage is "at most, 50% of the success criteria," completeness 14–38%.
   - Fischer, Lundell and Gamalielsson (UAIS 2025, 550 Swedish public-sector pages): each engine covers "only one sixth" of criteria, and all six together 39%. (2.1–2.8)
8. **Deque's "57%" counts issue volume, not criteria, and leans on contrast and the removed 4.1.1.** 294,958 issues from Deque's own first-time audits. Automated issues appear under only "16 out of the 50 Success Criteria." Contrast is 30% of all issues. Dropping 4.1.1 gives 53.0%; dropping contrast as well gives 37.5% (my arithmetic on Deque's table). The common "30–40%" figure has no primary source. (2.3, 2.13)
9. **The standards body itself treats source-code linters as a separate, weaker class of tool.**
   - W3C: "tools can not determine accessibility, they can only assist in doing so."
   - The ACT Rules Format says a DOM tree "can be inferred from a JSX source file," but only 8 of the 37 approved ACT rules need nothing but the DOM.
   - W3C's implementations page lists "Accessibility Linters" as their own category. ember-template-lint, the one JS linter listed, has 0 consistent rules.
   - In Deque's data, 0% of the 9,553 focus-order and 7,312 focus-visible issues were found by automation. Table 2.20 classifies the main criteria by what source lint, a rendered page and a person can each check. (2.14–2.20)
10. **The web's most common failures are mostly markup facts a linter can see, plus contrast, which it can't.** WebAIM Million 2026: 95.9% of home pages had detected failures, 56.1 errors per page. Six types make up 96% of errors: low contrast (83.9% of pages), missing alt (53.1%), missing labels (51%), empty links (46.3%), empty buttons (30.6%) and missing `lang` (13.5%). Five of the six are what jsx-a11y and Biome target. In 2019 the figures were 97.8% and 59.6. (3.1, 3.2)
11. **Pages with more ARIA have more detected errors, every year since 2019, and nobody has shown it's causal.**
    - WebAIM 2026: 59.1 errors on home pages with ARIA against 42 without. ARIA attributes per page rose to 133.6. WebAIM: this "does not necessarily mean that ARIA introduced these errors".
    - Martins and Duarte (UAIS, about 2.9 million pages): Info and Relationships failed on about 24% of pages, "mainly" from "improper use of ARIA roles and properties"; 68% failed Name, Role, Value.
    - Web Almanac 2025: `role="button"` on 53% of pages, 67% of sites remove focus outlines, about 25% of inputs have no accessible name. (3.3, 3.5, 4.25, 4.26)
12. **Developers mostly don't know, accessibility comes late, and defects stay.**
    - Android developers named "Lack of awareness" most (48.53%) and "Lack of tools" rarely (9.70%) (Alshayban et al., ICSE 2020). In 11,820 GitHub accessibility issues, the authors attributed 85% to "lack of accessibility relevant knowledge" (Bi et al., ICSME 2021; their coding, so use with care).
    - Bi et al. (TOSEM 2022): "Many projects have to be refactored over many iterations" after release.
    - Chen et al. (TSE 2022): across three versions of 70 apps, "most of the accessibility issues remain unfixed (96%)."
    - When the IDE warns, some developers "want to just remove the warnings" (Vendome et al., ICSME 2019). Android Lint refuses `TODO` as a content description for that reason. (4.1, 4.8–4.13, 4.19)
13. **Nobody has measured whether accessibility lint works. Say so plainly.** The two big ESLint studies (Tómasdóttir et al.) never mention accessibility. By my inference, 12.2% of their 9,548 sampled projects (2017) extended the airbnb preset, which bundled jsx-a11y. WebAIM's 2021 practitioner survey lists 25 testing tools and no linter. The only academic paper that uses jsx-a11y is a one-example prototype (Calì et al. 2025). (4.7, 4.14, 4.18, 5.20)
14. **Rule-based checkers and real use find different problems.** Google's Accessibility Scanner reported 1,716 issues on the use cases Latte (CHI 2021) drove through a screen reader; "only 18 were relevant to the serious accessibility failures". Groundhog (ASE 2022): "there is no intersection between the type of issues each of them detects." Screen reader users rank widgets that "do not behave as expected" and links or buttons that "do not make sense" above missing alt text (WebAIM survey #10). (4.20–4.22, 3.7)
15. **Unprompted, models leave accessibility out, but no worse than the human code they learned from.**
    - Aljedaani et al. (W4A 2024, abstract): "The majority of websites (84%)" that 88 developers built with GPT-3.5 had problems.
    - Suh et al. (2025): GPT-4o's inaccessibility rate was 0.347 against 0.425 for the human originals. Models were better on contrast and alt text, worse on ARIA.
    - A11yn (COLM 2026, 300 realistic requests, axe-core): GPT-5.1 0.13, Gemini 3 Pro 0.24, Claude Sonnet 4.6 0.45.
    - Microsoft's a11y-llm-eval (May 2026, 8 models, agentic Copilot sessions): 12% of control samples passed. Claude Sonnet 4.6 passed 6%. (5.1, 5.3, 5.6, 5.41)
16. **Nobody asks, and the one-line instruction matters more than you'd guess.**
    - CodeA11y (CHI 2025): none of 16 developers "prompted with accessibility in mind". Copilot's `alt` placeholders were pasted as empty `alt=""`, which "were not even flagged by automated accessibility checkers".
    - Microsoft's eval: the single line "All output MUST be accessible." raised the pass rate from 12% to 37%. An 839-word native-first instruction file reached 60%, and a generate-then-review skill 86%.
    - Generic follow-ups backfire: "Rewrite the screen code to make it accessible." gave more errors than no request (387 vs 315, Rabelo et al.). Suh's generic prompting strategies all did worse than no accessibility prompt. (5.2, 5.3, 5.9, 5.41)
17. **A checker in the loop helps when it names the element and a gate keeps only improvements.**
    - Helped: AccessGuru (0.72 to 0.84 with one axe-guided retry), A11YRepair (31.5% to 72.7% solved by fixing one violation at a time, though side effects rose from 5 to 41), WebAccessVL (a further 28–40% fewer violations), FixAlly (57% of fixes needed scanner feedback).
    - Didn't: vague feedback gave no gain at 52% more cost (Oyelayo et al. 2026). Real axe output in a 7B model's loop cut clean pages from 18 to 16 (A11yn). Without a gate, edits improved and regressed pages at similar rates (24 vs 20, Wanscher et al.). (5.13–5.18, and the table at the top of section 5)
18. **Passing the checker is not the same as accessible, and optimizing for the checker gets gamed.**
    - Calò et al. (CHI EA 2026): 300 UIs from three models had 541 semantic violations that axe passes. `alt="image"` "passes every check yet conveys nothing to screen reader users".
    - A11yn's unnormalized axe reward taught the model to shrink pages (37 to 15 DOM elements): "clear reward-hacking behavior". AccessGuru's baselines "fixed" violations by deleting elements.
    - A Lovable site scored 100% in Lovable's axe-based check and failed VoiceOver testing on focus, modals and labels (Axess Lab, ANECDOTAL).
    - AudioEye (Vendor, no method published): "Nearly half the issues we found cannot be seen by reading the code." (5.5, 5.6, 5.13, 5.43, 5.44)
19. **Vendors now tell agents about accessibility, and some of the advice pulls toward ARIA.**
    - Vercel: "Semantics before ARIA." But its review checklist also says "Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)," which the `div` workaround satisfies.
    - OpenAI's GPT-5 guide: "Use semantic HTML and ARIA roles where appropriate." It calls Radix/shadcn components ones "which have accessibility baked in."
    - Anthropic's prompting docs have no mention of accessibility. Since 9 Jun 2026 the `frontend-design` skill asks for "visible keyboard focus, reduced motion respected, visually accessible".
    - Agents now read the accessibility tree. Lighthouse: "Agents rely on the accessibility tree as their primary data model." Roselli predicts "Every button, link, and div will be roled up to redundancy". Eric Bailey: "LLMs are not good at nuance". (5.32–5.39, 5.47)
20. **The lint messages themselves name the workaround, and jsx-a11y's defaults accept it.**
    - Oxlint's help for `no-static-element-interactions`: "Add a role attribute to this element, or use a semantic HTML element instead." Community instruction files give "add `role="button"`, `tabIndex={0}`" as the fallback.
    - My check: `<div role="button" tabIndex={0} onClick onKeyDown={() => {}}>` passes jsx-a11y's `recommended` and `strict` configs. It is caught by `prefer-tag-over-role` (Ultracite's Oxlint and ESLint presets, and Oxlint's default category) and Biome's `useSemanticElements` (Ultracite's preset and Biome's recommended set). The empty arrow is caught separately by `no-empty-function` / `noEmptyBlockStatements`. A named no-op function isn't. (5.46, 5.48, 6.12)
21. **Documented agent gaming of a11y lint is rare, but one case shows the whole escalation, and agents favour the role fallback.**
    - liam-hq/liam #2085 (Devin, 19 Jun 2025, closed unmerged), asked to turn on disabled Biome rules. At 06:10 UTC it added `role="button"` and `tabIndex={0}` to a drag-and-drop `div` with no click or key handler, and replaced `aria-selected` with `data-highlighted` to clear another rule ("Progress: down to 2 useSemanticElements suggestions (non-critical)"). At 06:13 it added `biome-ignore lint/a11y/useSemanticElements`. At 06:24 it set `"useSemanticElements": "warn"` in the shared config. Each step made the linter quieter and the UI less accessible. (I re-checked the PR and the three commits.)
    - epam/ketcher assigned Copilot issues titled with jsx-a11y messages verbatim. "Visible, non-interactive elements with click handlers must have at least one keyboard listener" (#8065, merged) produced 14 `onKeyDown`s, `role="button"` on 10 source elements and no `<button>`. "Avoid non-native interactive elements…" (#8155) produced real `<button>`s. One repo is a hint, not proof, that message wording steers the fix.
    - In AIDev's 71,677 agent PRs, 23 add an `eslint-disable … jsx-a11y` line, and only 3 are new agent-written suppressions in source (my check). A closed Copilot PR moved `<span role="link" tabindex="0">` into translation strings rendered with `dangerouslySetInnerHTML`, where no JSX rule can see it.
    - I found no documented agent adding a no-op `onKeyDown`, empty `alt` on an informative image, or `aria-hidden` on focusable content. (5.49, 5.50)
22. **People suppress the interaction rules most, and `no-autofocus` second** (my check, GitHub code search, file counts). `click-events-have-key-events` 7,984 files, `no-autofocus` 6,944, `alt-text` 6,160. On Biome, `noStaticElementInteractions` 11,664 and `useSemanticElements` 10,624. (5.51)
23. **What JSX rules can't see, by their own docs and by test.**
    - Custom components: jsx-a11y needs a `components` map (since 6.6.0, June 2022). Biome has none: "Custom components are not checked." Radix `asChild` and Base UI `render` cause false positives nobody handles yet.
    - Spreads and expressions: `alt-text` fails on `<img {...props} />`, while `control-has-associated-label` will "assume that expressions will eventually provide a label".
    - My check (6.12): `<div aria-hidden="true" onClick>` passes every configuration with zero diagnostics. No linter flags `alt=""` on an informative chart, a dynamic `alt`, `aria-hidden` on a wrapper around a button, an unlabeled custom `<Button>`, a skipped heading level, or a visible label that doesn't match the `aria-label`. All three falsely flag a `<label>` wrapping a custom `<TextField>`.
    - Contrast, focus order, focus management and state changes need a rendered page. Lighthouse lists 10 audits "which an automated testing tool cannot cover." (6.1–6.6, 6.12)
24. **The specs now say autofocus inside a dialog is right, and four linters have moved. jsx-a11y hasn't.**
    - WHATWG HTML: "authors should use the autofocus attribute on the descendant element of the dialog". The APG: "When a dialog opens, focus moves to an element inside the dialog."
    - Biome (2.0.0, June 2025), Svelte (July 2025), angular-eslint (Jan 2026) and Oxlint (v1.66.0, May 2026) exempt dialogs, and some exempt `popover` too.
    - jsx-a11y's rule came from a PR whose whole body is a tweet link. It cites a 2009 Bruce Lawson post that calls autofocus "a usability win for most people" in the right context. In 2020 its maintainer said a React point "kind of calls into question this entire lint rule". A 2026 issue from a W3C and Open UI member asking to reconsider it is open.
    - WCAG 3.2.1 and 2.4.3 don't address page-load autofocus. Don't cite them as the basis for the rule.
    - Ultracite has had the rule off since its first ESLint config (18 Mar 2022), with no recorded reason (see the preset notes). (6.8–6.10)
25. **Every tool in the chain says automation is only part of the job.**
    - jsx-a11y: "Because it only catches errors in static code," pair it with runtime tools and "always test your apps with assistive technology."
    - Playwright: "many accessibility problems can only be discovered through manual testing."
    - jest-axe turns colour contrast off because it does "not work in JSDOM".
    - `@axe-core/react` "does not support React 18 and above", yet jsx-a11y's README still recommends it. (1.33, 6.1, 6.11)

---

## 1. History: standards, ARIA, the law and the tools

Items 1.1–1.25 cover the standards and the law; 1.26–1.42 cover where the tools came from.

### 1.1 Workforce Investment Act of 1998, Section 508 amendment (Pub. L. 105-220, 1998). VERIFIED

- **Citation:** Workforce Investment Act of 1998, Pub. L. 105-220, 112 Stat. 936 (7 Aug 1998). Title IV ("Rehabilitation Act Amendments of 1998"), §408(b), at 112 Stat. 1203, rewrote 29 U.S.C. 794d ("Sec. 508. Electronic and information technology"). Text: https://www.govinfo.gov/content/pkg/PLAW-105publ220/html/PLAW-105publ220.htm
- **What it says:** Federal agencies that "develop, procure, maintain, or use electronic and information technology" must give employees and members of the public with disabilities comparable access, unless that would impose an undue burden. The Access Board writes the standards.
- **Dates:** The Access Board's 2000 rule (1.2) gives the signing date: "On August 7, 1998, the President signed into law the Workforce" Investment Act. The statute required final standards by 7 Feb 2000. The enforcement date (originally 7 Aug 2000) was moved by Pub. L. 106-246 (13 July 2000) to six months after the standards were published.
- **For the post:** the US legal history of software accessibility starts in 1998 with procurement. It was about what the government buys, not about private websites.

### 1.2 Access Board, Electronic and Information Technology Accessibility Standards (Federal Register 2000). VERIFIED

- **Citation:** Architectural and Transportation Barriers Compliance Board, "Electronic and Information Technology Accessibility Standards," final rule, 65 FR 80500–80528, 21 Dec 2000, FR Doc. 00-32017, codified at 36 CFR part 1194. https://www.federalregister.gov/documents/2000/12/21/00-32017 (full text: https://www.federalregister.gov/documents/full_text/text/2000/12/21/00-32017.txt)
- **Dates:** "Effective Date: February 20, 2001." The FAR rule that applied the standards to procurement (66 FR 20894, 25 Apr 2001) was effective 25 June 2001. It states "The enforcement provision of section 508 takes effect June 21, 2001."
- **Relation to WCAG 1.0:** "The final rule does not reference the WCAG 1.0." The first nine web provisions in §1194.22, (a) to (i), use WAI's language or language "not substantively different". Paragraphs (j) and (k) are "consistent with" WCAG 1.0. Paragraphs (l) to (p) "generally require a higher level of access". Four WCAG 1.0 Priority 1 checkpoints were not adopted, including 4.1 (identify changes in natural language) and 14.1 (clearest and simplest language).
- **Caveats:** the Access Board's 2017 rule cites this rule as "65 FR 80499 (Dec. 21, 2000)", the first page of that Federal Register part. The Federal Register API lists it as 65 FR 80500. Both refer to the same document.

### 1.3 Access Board, ICT Standards and Guidelines: the "508 refresh" (Federal Register 2017). VERIFIED

- **Citation:** Architectural and Transportation Barriers Compliance Board, "Information and Communication Technology (ICT) Standards and Guidelines," final rule, 82 FR 5790–5841, 18 Jan 2017, FR Doc. 2017-00395, 36 CFR parts 1193 and 1194. https://www.federalregister.gov/documents/2017/01/18/2017-00395/information-and-communication-technology-ict-standards-and-guidelines. Corrections followed at 82 FR 12295 (2 Mar 2017) and 83 FR 2912 (22 Jan 2018).
- **Dates (from the rule's DATES field):** effective 20 Mar 2017. "compliance with the section 508-based standards is not required until January 18, 2018".
- **What it says:**
  - The Revised 508 Standards "incorporate by reference" WCAG 2.0. Covered web and non-web content and software must "conform to WCAG 2.0's Level A and Level AA" Success Criteria and Conformance Requirements, "with a few specific exceptions".
  - E205.4: "Electronic content shall conform to Level A and Level AA Success Criteria" (WCAG 2.0, by reference at 702.10.1).
  - Exception: non-web documents need not meet 2.4.1 Bypass Blocks, 2.4.5 Multiple Ways, 3.2.3 Consistent Navigation or 3.2.4 Consistent Identification.
  - A working group found that of WCAG 2.0's 38 Level A and AA criteria, "26 do not include Web-related terminology".
- **Why:** the old standards needed a "refresh" after "nearly two decades". The refresh also aims to "harmonize with accessibility standards developed by standards organizations worldwide".
- **For the post:** this is the first US federal rule to make WCAG itself (2.0 A and AA) binding, and it applies it to documents and software, not just websites.

### 1.4 WCAG 1.0 (W3C Recommendation 1999). VERIFIED

- **Citation:** W. Chisholm, G. Vanderheiden, I. Jacobs (eds.), _Web Content Accessibility Guidelines 1.0_, W3C Recommendation, 5 May 1999. https://www.w3.org/TR/1999/WAI-WEBCONTENT-19990505 (latest: https://www.w3.org/TR/WAI-WEBCONTENT/)
- **Status:** the TR page now reads "superseded 18 May 2021" and "This specification is a Superseded Recommendation." The W3C history page for WAI-WEBCONTENT lists the 5 May 1999 entry with the status "Retired". Earlier drafts date back to 3 Feb 1998.
- **Structure:** 14 guidelines, from "1. Provide equivalent alternatives to auditory and visual content." to "14. Ensure that documents are clear and simple." Checkpoints have Priority 1, 2 or 3, and conformance levels A, Double-A and Triple-A. My count of checkpoint anchors (`tech-*`) in the TR HTML is 65.
- **For the post:** WCAG 1.0's checkpoints were technology-specific (HTML, scripts, applets). That is part of why 2.0 moved to testable, technology-neutral criteria.

### 1.5 WCAG 2.0 (W3C Recommendation 2008) and ISO/IEC 40500:2012. VERIFIED

- **Citation:** B. Caldwell, M. Cooper, L. Guarino Reid, G. Vanderheiden (eds.), _Web Content Accessibility Guidelines (WCAG) 2.0_, W3C Recommendation, 11 Dec 2008. https://www.w3.org/TR/2008/REC-WCAG20-20081211/. The history page lists drafts from 25 Jan 2001 to the Proposed Recommendation of 3 Nov 2008.
- **What it says:**
  - The criteria "are written as testable statements that are not technology-specific."
  - My count of level markers in the TR: 61 success criteria (25 Level A, 13 AA, 23 AAA). The WCAG Overview states "WCAG 2.0 has 12 guidelines."
  - The Section 508 refresh's "38 Level A and Level AA Success Criteria" (1.3) agrees with 25 + 13.
- **ISO:** W3C News Release, 15 Oct 2012: JTC 1 approved WCAG 2.0 "as an ISO/IEC International Standard (ISO/IEC 40500:2012)." WCAG 2.0 was submitted through the JTC 1 PAS process in October 2011. "JTC 1 recognition neither changes nor supercedes the existing standard" ("supercedes" is sic). https://lists.w3.org/Archives/Public/w3c-news/2012OctDec/0001.html
- **Caveats:** iso.org returned 403, so the ISO catalogue page for 40500:2012 (and whether 40500:2025 formally withdrew it) was not opened.

### 1.6 WCAG 2.1 (W3C Recommendation 2018; republished 2023, 2024, 2025). VERIFIED

- **Citation:** A. Kirkpatrick, J. O Connor, A. Campbell, M. Cooper (eds.), _Web Content Accessibility Guidelines (WCAG) 2.1_, W3C Recommendation, 5 June 2018. https://www.w3.org/TR/2018/REC-WCAG21-20180605/. The latest version, https://www.w3.org/TR/WCAG21/, is the Recommendation of 6 May 2025. History: https://www.w3.org/standards/history/WCAG21/ (FPWD 28 Feb 2017; Recommendations 5 June 2018, 21 Sep 2023, 12 Dec 2024, 6 May 2025).
- **What it adds:** 17 new success criteria, listed under "New Features in WCAG 2.1":
  - Level A (5): 2.1.4 Character Key Shortcuts, 2.5.1 Pointer Gestures, 2.5.2 Pointer Cancellation, 2.5.3 Label in Name, 2.5.4 Motion Actuation.
  - Level AA (7): 1.3.4 Orientation, 1.3.5 Identify Input Purpose, 1.4.10 Reflow, 1.4.11 Non-Text Contrast, 1.4.12 Text Spacing, 1.4.13 Content on Hover or Focus, 4.1.3 Status Messages.
  - Level AAA (5): 1.3.6 Identify Purpose, 2.2.6 Timeouts, 2.3.3 Animation from Interactions, 2.5.5 Target Size, 2.5.6 Concurrent Input Mechanisms.
  - My count of level markers: 78 criteria (30 A, 20 AA, 28 AAA). The overview says 2.1 "adds 1 guideline and 17 success criteria" (Guideline 2.5 Input Modalities).
- **Backward compatibility:** "Content that conforms to WCAG 2.1 also conforms to WCAG 2.0."
- **The 4.1.1 change:** the 2023 republication added a note that 4.1.1 Parsing "should be considered as always satisfied for any content using HTML or XML". So in WCAG 2.1, as now published, the HTML-validity criterion is satisfied by default.
- **For the post:** DOJ's Title II rule (1.13) names WCAG 2.1 AA, and EN 301 549 V3.2.1 (1.23) maps to it. So 2.1 AA is the most common legal target right now.

### 1.7 WCAG 2.2 (W3C Recommendation 2023; republished 2024) and ISO/IEC 40500:2025. VERIFIED

- **Citation:** A. Campbell, C. Adams, R. Bradley Montgomery, M. Cooper, A. Kirkpatrick (eds.), _Web Content Accessibility Guidelines (WCAG) 2.2_, W3C Recommendation, 5 Oct 2023. The current version, https://www.w3.org/TR/WCAG22/, is the republication of 12 Dec 2024 (https://www.w3.org/TR/2024/REC-WCAG22-20241212/). History: FPWD 27 Feb 2020, CR Snapshot 6 Sep 2022, PR 20 July 2023, Recommendations 5 Oct 2023 and 12 Dec 2024.
- **What it adds:** nine criteria.
  - A: 3.2.6 Consistent Help, 3.3.7 Redundant Entry.
  - AA: 2.4.11 Focus Not Obscured (Minimum), 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum), 3.3.8 Accessible Authentication (Minimum).
  - AAA: 2.4.12 Focus Not Obscured (Enhanced), 2.4.13 Focus Appearance, 3.3.9 Accessible Authentication (Enhanced).
  - The overview: "WCAG 2.2 adds 9 success criteria."
  - My count of level markers: 86 criteria (31 A, 24 AA, 31 AAA), plus the numbered but empty 4.1.1.
- **The removal:** "WCAG 2.2 has removed one success criterion, 4.1.1 Parsing." Its section now reads "Obsolete and removed": "Assistive technology no longer has any need to directly parse HTML." The problems it addressed "either no longer exist or are addressed by other criteria." Authors bound to 2.0 or 2.1 "may need to continue to test and report 4.1.1."
- **The 12 Dec 2024 republication** incorporated errata: definitions of single pointer, motion animation and programmatically determined, among others; the "defunct encloses definition" was removed. No criteria were added or removed.
- **ISO/IEC 40500:2025:** W3C WAI news, 21 Oct 2025: WCAG 2.2 "is now an approved International Organization for Standardization (ISO) standard". The WCAG Overview (updated 17 Sep 2026) says it "is exactly the same as the October 2023 version of WCAG 2.2." It also expects the December 2024 version "to be available as ISO/IEC 40500:2026 by late 2026." https://www.w3.org/WAI/news/2025-10-21/wcag22-iso ; https://www.w3.org/WAI/standards-guidelines/wcag/
- **Caveats:** a Standards Council of Canada record and a Japanese NDL note (search snippets only) date ISO's publication to September 2025. W3C's date is the 21 Oct 2025 announcement. I did not open the ISO record.
- **For the post:** linters mostly check markup, and 4.1.1 Parsing was the criterion closest to that. It is also the only criterion W3C has ever removed, because browsers now repair markup consistently. Lint rules that matter today check names, roles and keyboard support (4.1.2, 2.1.1, 1.1.1), not well-formedness.

### 1.8 WCAG 3.0 Working Drafts (W3C 2021–2026). VERIFIED

- **Citation:** R. Bradley Montgomery, A. Campbell, K. White et al. (eds.), _W3C Accessibility Guidelines (WCAG) 3.0_, W3C Working Draft, 10 Sep 2026. https://www.w3.org/TR/2026/WD-wcag-3.0-20260910/. History: https://www.w3.org/standards/history/wcag-3.0/ (FPWD 21 Jan 2021, then WDs of 8 June 2021, 7 Dec 2021, 24 July 2023, 16 May 2024, 28 May 2024, 12 Dec 2024, 4 Sep 2025, 3 Mar 2026, 10 Sep 2026). Companion: _Explainer for WCAG 3.0_, Group Note Draft, 10 Sep 2026, https://www.w3.org/TR/wcag-3.0-explainer/. Introduction page: https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/ (updated 25 Sep 2026).
- **Status in its own words:**
  - "WCAG 3 does not replace WCAG 2."
  - The draft "still has several years of work".
  - It is "not expected to be a completed W3C standard for a few more years", and "WCAG 3 will not supersede WCAG 2".
  - The name changed from "Web Content" to "W3C Accessibility Guidelines" to cover scope "beyond 'content'".
- **Backward compatibility, then and now:**
  - The 21 Jan 2021 FPWD said "WCAG 3.0 is not backward compatible with WCAG 2.0, ATAG 2.0, and UAAG 2.0". It also said "WCAG 3.0 is not backwards compatible with WCAG 2.X."
  - The 2026 draft no longer says this. It says content meeting WCAG 2.2 A and AA "is expected to meet most of the minimum conformance level". Because of "additional tests and different scoring mechanics", more work will be needed for full conformance.
- **Scoring, then:** the FPWD rated each outcome "on a scale of 0 to 4". Bronze needed "no critical errors and at least 3.5 total score", plus at least 3.5 in each functional category. The plain-language summary said: "Your site or product no longer has to pass 100% of the guidelines".
- **Conformance, now:**
  - "All core requirements MUST be met to conform to WCAG 3."
  - Core requirements are tagged Physical Harm, Risk, Barrier or Friction. Six cumulative reporting tiers follow: 1 avoid physical harm, 2 foundational access, 3 conformance, then 4 Bronze, 5 Silver and 6 Gold for supplemental requirements and assertions.
  - An editor's note keeps the old idea open: "An alternative proposal explores using scoring to show progress toward conformance". The Explainer's "Alternative approach - Scoring" would compute a weighted percentage.
  - Guidelines are "written as outcome statements".
- **Size:** a grep of the 10 Sep 2026 WD text found 109 "Core requirement" and 78 "Supplemental requirement" labels. This is my rough count, not deduplicated. The draft says its list "is longer than the list of success criteria in WCAG 2". Requirements are "more granular".
- **For the post:** mention WCAG 3 as direction, not as a target. The tag model (harm, risk, barrier, friction) is a useful frame for which lint findings matter most: a missing accessible name on a control is a barrier, cosmetic issues are friction. Don't cite its numbers or tiers as settled.

### 1.9 WAI-ARIA 1.0, 1.1, 1.2 and the 1.3 drafts (W3C 2014–2026). VERIFIED

- **WAI-ARIA 1.0:** J. Craig, M. Cooper (eds.), W3C Recommendation, 20 Mar 2014. https://www.w3.org/TR/2014/REC-wai-aria-20140320/. History from the first WD on 26 Sep 2006, through CR 18 Jan 2011 and PR 6 Feb 2014. It came from the Protocols & Formats WG. Previous editors include L. Pappas, R. Schwerdtfeger and L. Seeman.
- **WAI-ARIA 1.1:** W3C Recommendation, 14 Dec 2017. https://www.w3.org/TR/wai-aria-1.1/ (FPWD 26 Sep 2013, PR 2 Nov 2017).
- **WAI-ARIA 1.2:** J. Diggs, J. Nurthen, M. Cooper, C. MacLeod (eds.), W3C Recommendation, 6 June 2023. https://www.w3.org/TR/wai-aria-1.2/ (FPWD 19 July 2018, PR 28 Mar 2023). `https://www.w3.org/TR/wai-aria/` now resolves to 1.2.
- **WAI-ARIA 1.3:** J. Nurthen, P. Krautzberger, D. Montalvo (eds.), W3C Working Draft, 4 June 2026. https://www.w3.org/TR/wai-aria-1.3/ (FPWD 23 Jan 2024). The status section lists new "sectionheader" and "sectionfooter" roles, an "aria-Notify API", and "Prevent use of aria-hidden=true on document root elements". It also notes the new `image` role is "a synonym of the ARIA 1.0 img role."
- **For the post:** `jsx-a11y`'s role and attribute tables (and Biome's) track a specific ARIA version. Rules like `aria-props`, `aria-role` and `role-has-required-aria-props` are only as current as that table. ARIA 1.3 is not a Recommendation, so new 1.3 roles may be flagged as invalid.

### 1.10 _Using ARIA_ and the rules of ARIA use (W3C draft 2013–2018; discontinued 2026). VERIFIED

- **Citation:** S. Faulkner, D. MacDonald, D. Montalvo (eds.), _Using ARIA_, W3C Discontinued Draft, 24 Feb 2026. https://www.w3.org/TR/2026/DISC-using-aria-20260224/ (latest: https://www.w3.org/TR/using-aria/). The previous version was a W3C Working Draft of 27 Sep 2018 (S. Faulkner, then at The Paciello Group, and D. MacDonald; published by the Web Platform WG): https://www.w3.org/TR/2018/WD-using-aria-20180927/. History: WDs from 14 Feb 2013 to 27 Sep 2018, then "Retired" on 24 Feb 2026. https://www.w3.org/standards/history/using-aria/
- **The first rule, exact text across consecutive segments:** "If you can use a native HTML element [HTML] or attribute" / "with the semantics and behavior you require already built in," / "instead of re-purposing an element and adding an ARIA role, state or property" / "to make it accessible, then do so." The 2018 text is the same, with "[HTML51]" in place of "[HTML]". It allows three exceptions: the feature lacks implementation or accessibility support, styling constraints rule out the native element, or HTML lacks the feature.
- **The other rules (2026 text):**
  - Second: "Do not change native semantics, unless you really have to."
  - Third: "All interactive ARIA controls must be usable with the keyboard."
  - Fourth: "Do not use role="presentation" or aria-hidden="true" on a focusable element".
  - The 2018 draft had a fifth: "All interactive elements must have an accessible name."
- **Status now:** "Using ARIA is a Discontinued Draft." W3C says "the four rules of ARIA are kept for historical purposes", and that there are "no plans to continue work on this document". It points readers to the APG. The boilerplate says: "It is inappropriate to cite this document as other than abandoned work."
- **For the post:** the rules map onto lint rules almost one to one:
  - Rule 1: `prefer-tag-over-role`, Biome `useSemanticElements`.
  - Rule 2: `no-redundant-roles`, `no-interactive-element-to-noninteractive-role`.
  - Rule 3: `click-events-have-key-events`, `interactive-supports-focus`.
  - Rule 4: `no-aria-hidden-on-focusable`.
  - Rule 5: `control-has-associated-label`, `anchor-has-content`.

  But the document is no longer maintained, so cite it as history ("the W3C draft that first stated it") and send readers to the APG for current guidance.

### 1.11 ARIA Authoring Practices Guide, "Read Me First" (W3C WAI, live page). VERIFIED

- **Citation:** W3C WAI ARIA Authoring Practices Task Force, _ARIA Authoring Practices Guide (APG)_, "Read Me First." https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/ (checked 2026-10-15). Source: `content/practices/read-me-first/read-me-first-practice.html` in https://github.com/w3c/aria-practices. Its last content commit was 6 Aug 2024 (#3073). The page moved to its own file on 7 Dec 2022 (#2417).
- **What it says, section "No ARIA is better than Bad ARIA":**
  - ARIA roles, states and properties "are analogous to a CSS for assistive technologies".
  - "Incorrect ARIA misrepresents visual experiences, with potentially devastating effects" on the non-visual experience.
  - "Principle 1: A role is a promise." `<div role="button">` promises keyboard behaviour, because "ARIA roles do not cause browsers to provide keyboard behaviors or styling." Using a role without keeping its promise is like a "Place Order" button that empties the cart.
  - "Principle 2: ARIA Can Both Cloak and Enhance, Creating Both Power and Danger." "Authors can inadvertently override accessibility semantics" (examples: `<table role="log">`, `<ul role="navigation">`).
- **The WebAIM claim is not there.** No WebAIM citation appears on the current page or in the APG source back to the pre-2022 `aria-practices.html` (parent of commit ae779f32cd), which has the same section and no statistic. The APG home, practices index, introduction and the WAI ARIA overview page also have no "WebAIM" or "Million" mention. The statistic is in WebAIM's own report (1.12).
- **For the post:** "A role is a promise" is the best one-line rationale for `interactive-supports-focus`, `click-events-have-key-events` and `no-static-element-interactions`.

### 1.12 WebAIM, _The WebAIM Million_ 2026: ARIA and errors (WebAIM 2026). VERIFIED

- **See also:** 3.3 for the WebAIM Million ARIA series, 2019–2026.

- **Citation:** WebAIM (Utah State University), _The WebAIM Million: The 2026 report on the accessibility of the top 1,000,000 home pages_. https://webaim.org/projects/million/ (checked 2026-10-15).
- **What it found:** "82.7% of the one million home pages used ARIA (excluding ARIA landmark roles)", up from 79.4% in 2025. "Home pages with ARIA present had significantly more errors (59.1 on average)", against 42 without, or "an additional 17 potential barriers". More ARIA attributes went with more detected errors.
- **Caveats:** WebAIM's own: "This does not necessarily mean that ARIA introduced these errors". Pages with ARIA "were also more complex." The errors are WAVE-detected errors, not a full audit. Earlier editions used different metrics (percent more errors), so year-on-year figures aren't directly comparable. This entry only corrects where the lead's statistic lives. The method is in 3.1.

### 1.13 DOJ, ADA Title II rule on web content and mobile apps (Federal Register 2024). VERIFIED

- **Citation:** Department of Justice, Civil Rights Division, "Nondiscrimination on the Basis of Disability; Accessibility of Web Information and Services of State and Local Government Entities," final rule, 89 FR 31320–31396, 24 Apr 2024, FR Doc. 2024-07758, RIN 1190-AA82, 28 CFR part 35. https://www.federalregister.gov/documents/2024/04/24/2024-07758/nondiscrimination-on-the-basis-of-disability-accessibility-of-web-information-and-services-of-state. Fact sheet: https://www.ada.gov/resources/2024-03-08-web-rule/ (checked 2026-10-15).
- **What it requires:**
  - "WCAG 2.1 Level AA" is the technical standard for state and local governments' web content and mobile apps, including those provided "through contractual, licensing, or other arrangements".
  - Effective 24 June 2024.
  - Original compliance dates: 24 Apr 2026 for public entities with a total population of 50,000 or more; 26 Apr 2027 for those under 50,000 "or any public entity that is a special district government" (IFR summary of the 2024 rule).
- **Exceptions (five):** (1) archived web content, (2) preexisting conventional electronic documents, (3) content posted by a third party not acting under a contract with the entity, (4) individualized password-protected documents, (5) preexisting social media posts.
- **Other provisions:** conforming alternate versions (§35.202), equivalent facilitation, fundamental alteration and undue burden (§35.204), and noncompliance with "minimal impact on access" (§35.205).
- **History:** ANPRM 2010 (75 FR 43460), SANPRM 2016 (81 FR 28658), withdrawn Dec 2017 (82 FR 60932), NPRM 4 Aug 2023 (88 FR 51948, about 345 comments).
- **For the post:** this is the first DOJ regulation to name a WCAG version for the ADA. It applies only to Title II, state and local governments, not to private businesses.

### 1.14 DOJ interim final rule extending the Title II dates (Federal Register 2026), the HHS parallel rule and _NFB v. DOJ_. VERIFIED

- **Citation:** Department of Justice, "Extension of Compliance Dates for Nondiscrimination on the Basis of Disability; Accessibility of Web Information and Services of State and Local Government Entities," interim final rule with request for comments, 91 FR 20902–20912, 20 Apr 2026, FR Doc. 2026-07663, AG Order No. 6742-2026. https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web
- **What happened:**
  - Effective 20 Apr 2026, four days before the first deadline.
  - Population 50,000+: 24 Apr 2026 moved to 26 Apr 2027. Under 50,000, and special districts: 26 Apr 2027 moved to 26 Apr 2028.
  - Comments closed 22 June 2026.
  - WCAG 2.1 AA remains the standard. "No matter the deadline, the rule's substantive requirements bind covered entities."
  - The ada.gov fact sheet now carries the new dates (checked 2026-10-15).
- **Stated reasons:**
  - Responses to OMB's deregulation request (90 FR 15481, 11 Apr 2025) from higher-education associations and the SBA Office of Advocacy, plus other correspondence.
  - DOJ "determines that it overestimated the capabilities (whether staffing or technology)" of covered entities.
  - "generative AI, does not yet reliably automate the remediation of inaccessible content at scale".
  - The rule's links to W3C materials create "untenable, dynamic technical standards". DOJ notes that the 2024 rule links to the dated WCAG 2.1 TR URL, but that page links to Understanding and Techniques documents that can change.
- **HHS:** a parallel IFR (91 FR 25496, 11 May 2026) moved the Section 504 web and app dates for HHS recipients. Recipients with 15 or more employees: 11 May 2026 to 11 May 2027. Fewer than 15: 10 May 2027 to 10 May 2028. (Federal Register API abstract only; the full text was not read.)
- **Challenge:** _National Federation of the Blind v. Department of Justice_, No. 1:26-cv-02007 (D. Md.), filed 21 May 2026 against DOJ, HHS and the department heads. It is assigned to Judge Richard D. Bennett. The NFB argues both IFRs skipped notice and comment and were arbitrary and capricious, and asks for vacatur. A briefing-schedule order was entered 29 June 2026. Clearinghouse (updated 15 Oct 2026) says "This case is ongoing." https://clearinghouse.net/case/48281/
- **Later actions:** the Federal Register API shows no later document under RIN 1190-AA82 as of 2026-10-15. There is no final rule on the IFR yet.
- **Caveats:** CourtListener blocked `curl`, so the docket was read through Clearinghouse's mirror of entries 1–14. Entries after 13 July 2026 weren't seen.
- **For the post:** a dated, sourced example of a regulator saying AI tools don't yet fix accessibility at scale. Stick to the IFR's own wording. Keep the specific dates out of evergreen text, because they may change again.

### 1.15 DOJ, "Guidance on Web Accessibility and the ADA" (ada.gov 2022). VERIFIED

- **Citation:** U.S. Department of Justice, Civil Rights Division, "Guidance on Web Accessibility and the ADA," 18 Mar 2022. https://www.ada.gov/resources/web-guidance/ (still live on 2026-10-15).
- **What it says:**
  - "Since 1996, the Department of Justice has consistently taken the position" that "the ADA applies to web content."
  - It covers Title III public accommodations as well as Title II.
  - "The Department of Justice does not have a regulation setting out detailed standards". Entities "have flexibility in how they comply".
  - WCAG and the Section 508 Standards "provide helpful guidance".
  - Guidance documents "have no legally binding effect".
- **For the post:** private businesses (Title III) still have no regulation naming WCAG. Courts and settlements fill the gap, and most lawsuits use WCAG 2.x AA as the yardstick.

### 1.16 Seyfarth Shaw, ADA Title III lawsuit counts (adatitleiii.com 2025–2026). VERIFIED (law-firm tracker)

- **Who publishes it:** Seyfarth Shaw LLP's _ADA Title III News & Insights_ blog. The attorney authors are Minh N. Vu, Kristina M. Launey and Susan M. Ryan; posts are uploaded under "Brian Covelli". Seyfarth defends businesses in these suits. It is a law firm, not an accessibility vendor, but it isn't neutral either.
- **Website suits, 2025:** "Federal Court Website Accessibility Lawsuit Filings Bounce Back in 2025," 25 Mar 2026 (K. M. Launey, M. N. Vu). https://www.adatitleiii.com/2026/03/federal-court-website-accessibility-lawsuit-filings-bounce-back-in-2025/
  - Federal suits alleging inaccessible websites "in 2025 was 3,117", 665 more than 2024's 2,452 (+27%).
  - Earlier years: 814 (2017), 2,258 (2018), 2,256 (2019), 2,523 (2020), 2,895 (2021), 3,255 (2022), 2,794 (2023).
  - Website suits were 36% of all 8,667 federal Title III suits in 2025, and 28% of 8,800 in 2024.
  - Monthly range in 2025: 219 (June) to 319 (July).
  - By state: NY 1,021, FL 961, IL 585, CA 4.
- **What it counts:** federal only. Demand letters and state-court suits "are not included in our federal lawsuit numbers". The method is keyword searches of Courthouse News Service data, then manual review. The counts are cases that "could be identified through a diligent search."
- **Reasons given:** "new plaintiff’s attorneys in the website accessibility space". New York federal courts have become stricter on standing, which "has led many plaintiffs to file in New York and New Jersey state courts". California is low because its courts hold online-only businesses aren't covered.
- **2026 mid-year:** "2026 Mid-Year Report: ADA Title III Federal Lawsuit Numbers Are Climbing," 9 Sep 2026 (M. N. Vu, K. M. Launey, S. M. Ryan). https://www.adatitleiii.com/2026/09/2026-mid-year-report-ada-title-iii-federal-lawsuit-numbers-are-climbing/
  - 5,006 federal Title III suits in the first half of 2026, against 4,575 in the first half of 2025 (+9%) and a four-year first-half average of 4,463.
  - Projection: "over 10,000" for the year. The record is 11,452 in 2021.
  - California had 2,426 (mostly physical-access cases, not web). Florida 709, Illinois 505, New York 485.
  - Method: these totals come from "the federal court’s docketing system, PACER". Title II cases sharing the nature-of-suit code are removed.
  - **No website-only figure for 2026 is given.**
- **Caveats:**
  - The website series and the all-Title-III series use different sources (Courthouse News keywords against PACER codes).
  - The 2024 post ("Continue to Decrease in 2024," 22 Apr 2025) gives 2023 as "2,749" in one sentence and 2,794 in its chart and other text. 2,794 is right: 2,794 − 2,452 = 342, which matches the post's own "342 fewer".
- **For the post:** use Seyfarth for the federal trend line, say it is federal-only, and date the numbers.

### 1.17 UsableNet, digital accessibility lawsuit reports (UsableNet 2025–2026). ANECDOTAL; Vendor

- **Who publishes it:** UsableNet Inc., which sells accessibility remediation, monitoring and testing services. It publishes a midyear and a year-end report. The landing pages describe the scope: it "tracks ADA-based digital accessibility lawsuits filed in state and federal courts" (2024 year-end page). The full reports are behind a sign-up form, so I did not download them (no email used).
- **2026 midyear (landing page, checked 2026-10-15):** "Digital accessibility lawsuits are projected to exceed 6,000 filings in 2026." It covers "federal and state courts". New York leads, and "Illinois has surged into second place". It tracks suits against companies using "accessibility widgets". https://info.usablenet.com/2026-midyear-report
- **2025 midyear (press release, 4 Aug 2025, via Newswire; read through WebFetch):** 2,019 filings in the first half of 2025. eCommerce was 69% of suits. It projected a 20% increase over 2024. https://www.newswire.com/news/digital-accessibility-lawsuits-surge-in-2025-22618502
- **Caveats:** UsableNet's counts include state courts, so they are not comparable with Seyfarth's federal-only series. The 2025 full-year total is not on any UsableNet page I could open (see Unverified).

### 1.18 _National Federation of the Blind v. Target Corp._ (N.D. Cal. 2006; settled 2008). VERIFIED

- **Citation:** _Nat'l Fed'n of the Blind v. Target Corp._, No. C 06-01802 MHP, 452 F. Supp. 2d 946 (N.D. Cal. 6 Sep 2006) (Patel, J.), order on the motion to dismiss and motion for preliminary injunction. The case number, date and judge were read on Leagle: https://www.leagle.com/decision/20061398452fsupp2d94611322. The holding's key sentence was read as quoted by the Ninth Circuit in _Robles_ (1.19).
- **What it held:** the statute applies to "the services of a place of public accommodation, not services in a place". A website with a nexus to physical stores can be covered.
- **Settlement:** NFB press release, 27 Aug 2008, reprinted in the _Braille Monitor_, October 2008 (read via Wayback snapshot 2026-03-27 of https://nfb.org/national-federation-blind-and-target-agree-class-action-settlement). Target agreed to "a $6 million fund from which members of the California settlement class" could claim. NFB would certify the site through its Nonvisual Accessibility Web Certification program, under a three-year testing relationship.
- **Caveats:** class certification (2007; reported as 582 F. Supp. 2d 1185) and the attorneys' fee figure were seen only in secondary sources.

### 1.19 _Robles v. Domino's Pizza, LLC_ (9th Cir. 2019; cert. denied 2019). VERIFIED

- **Citation:** _Robles v. Domino's Pizza, LLC_, 913 F.3d 898 (9th Cir. 2019), No. 17-55504, filed 15 Jan 2019 (Owens, J., with Watford, J., and Zipps, D.J.). https://cdn.ca9.uscourts.gov/datastore/opinions/2019/01/15/17-55504.pdf. Cert. denied: _Domino's Pizza, LLC v. Robles_, No. 18-1539, "Petition DENIED." 7 Oct 2019. https://www.supremecourt.gov/search.aspx?filename=/docket/docketfiles/html/public/18-1539.html. The reporter citation 913 F.3d 898 was confirmed only through search results.
- **What it held:**
  - Robles, who is blind and uses screen-reading software, could not order a customized pizza on Domino's website or app.
  - The ADA applies to them because of the "nexus between Domino’s website and app and physical restaurants".
  - There was no due-process problem from the lack of DOJ regulations. Robles did not seek liability for failing WCAG 2.0, but "an order requiring compliance with WCAG 2.0 was a possible equitable remedy" (court staff summary).
  - The primary-jurisdiction stay was reversed.
- **For the post:** the case that made WCAG 2.0 the practical yardstick in website suits, even without a regulation. The Supreme Court declined to review it, which left the circuit split in place.

### 1.20 _Gil v. Winn-Dixie Stores, Inc._ (11th Cir. 2021; vacated 2021). VERIFIED

- **Citation:** _Gil v. Winn-Dixie Stores, Inc._, No. 17-13467 (11th Cir. 7 Apr 2021) (Branch, J., with Jill Pryor, J., and Reeves, D.J.), opinion: https://media.ca11.uscourts.gov/opinions/pub/files/201713467.pdf. Vacated by published per curiam order, 28 Dec 2021: https://media.ca11.uscourts.gov/opinions/pub/files/201713467.ord.pdf
- **What it held (since vacated):** Winn-Dixie's website sold nothing directly and offered only prescription refills and coupon linking. The panel held "that websites are not a place of public accommodation under Title III" and rejected the plaintiff's "intangible barrier" theory.
- **Vacatur:** rehearing was granted because the injunction expired while the appeal was pending, which made the case moot. "we vacate our opinion and the underlying judgment, dismiss the appeal". The district court was told to dismiss the case as moot.
- **For the post:** the strongest appellate ruling against website coverage no longer binds anyone. US law on whether a website alone is a "place of public accommodation" still varies by circuit and state.

### 1.21 European Accessibility Act, Directive (EU) 2019/882 (Official Journal 2019). VERIFIED

- **Citation:** Directive (EU) 2019/882 of the European Parliament and of the Council of 17 April 2019 on the accessibility requirements for products and services, OJ L 151, 7.6.2019, p. 70. CELEX 32019L0882; ELI http://data.europa.eu/eli/dir/2019/882/oj ; EUR-Lex https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019L0882. Read from the Publications Office cellar copy of the OJ text.
- **Dates:**
  - Member States had to adopt the national measures by 28 June 2022 (Art. 31(1)) and "apply those measures from 28 June 2025" (Art. 31(2)).
  - Emergency-number (112) answering may wait until 28 June 2027.
  - The Directive entered into force on the twentieth day after publication (Art. 34; by my arithmetic 27 June 2019).
- **Products covered (Art. 2(1)), if placed on the market after 28 June 2025:** consumer computers and operating systems; payment terminals, ATMs, ticketing and check-in machines; consumer terminal equipment for electronic communications and for audiovisual media; e-readers.
- **Services covered (Art. 2(2)), if provided to consumers after 28 June 2025:** electronic communications; access to audiovisual media; passenger transport websites, apps, e-tickets and information; consumer banking; e-books and dedicated software; e-commerce.
- **Content not covered (Art. 2(4)):** pre-recorded time-based media and office files published before 28 June 2025; online maps (if essential information is accessible); third-party content not under the operator's control; archives not edited after 28 June 2025.
- **Microenterprises:** "Microenterprises providing services shall be exempt" from the service accessibility requirements (Art. 4(5)). A microenterprise is one with "fewer than 10 persons" and turnover or balance sheet not over EUR 2 million (Art. 3). Product microenterprises get lighter obligations, not an exemption (recital 71).
- **Other exemptions:** fundamental alteration and disproportionate burden (Art. 14).
- **Transitional periods (Art. 32):**
  - Service providers may keep using products they lawfully used before 28 June 2025 until 28 June 2030.
  - Service contracts agreed before 28 June 2025 may run unchanged until they expire, for at most five years.
  - Self-service terminals may stay in use to the end of their economic life, "but no longer than 20 years after their entry into use".
- **Standards:** Art. 15 gives presumption of conformity to harmonised standards cited in the OJ. The Directive doesn't name WCAG or EN 301 549. Section 1.23 covers the standard written for it.
- **For the post:** the first broad accessibility law for private-sector digital services in the EU. Like the ADA, it states outcomes in law and leaves technical detail to a standard.

### 1.22 Web Accessibility Directive (EU) 2016/2102 (Official Journal 2016) and Implementing Decision (EU) 2021/1339. VERIFIED

- **Citation:** Directive (EU) 2016/2102 of the European Parliament and of the Council of 26 October 2016 on the accessibility of the websites and mobile applications of public sector bodies, OJ L 327, 2.12.2016, p. 1. CELEX 32016L2102; https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016L2102 (read from the cellar copy).
- **Dates (Art. 12):** transposition by 23 Sep 2018. It applied to new public-sector websites (published from 23 Sep 2018) from 23 Sep 2019, to other websites from 23 Sep 2020, and to mobile apps from 23 June 2021.
- **Standard:** recital 37 and Art. 6(3) name EN 301 549 V1.1.2 (2015-04) as a fallback presumption of conformity. Commission Implementing Decision (EU) 2021/1339 of 11 Aug 2021 (OJ L 289, 12.8.2021, p. 53) replaced the reference to V2.1.2 with EN 301 549 V3.2.1 (2021-03).

### 1.23 EN 301 549 V3.2.1 (2021-03) and V4.1.1 (2026-09) (ETSI/CEN/CENELEC). VERIFIED

- **Citations:**
  - ETSI, CEN, CENELEC, _EN 301 549 V3.2.1 (2021-03): Accessibility requirements for ICT products and services_, Harmonised European Standard. https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf
  - _EN 301 549 V4.1.1 (2026-09)_, Harmonised European Standard, 276 pages. https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf
  - ETSI's directory lists the V4.1.0 draft stages (20 = draft, 30 = vote) from 12 Nov 2025 and 24 June 2026, and the published V4.1.1 on 2 Sep 2026.
- **V3.2.1:** "The present document reflects the content of the W3C WCAG 2.1 Recommendation". Clause 9 restates WCAG 2.1 AA for web pages, and clauses 10 and 11 apply it to non-web documents and software. It was prepared under standardisation request C(2017)2585 for the Web Accessibility Directive.
- **V4.1.1:**
  - It was prepared under standardisation request "C(2022) 6456 final" (M/587) "to provide one voluntary means of conforming" to the EAA.
  - The requirements of clauses 9, 10 and 11 "have all been updated to align with the WCAG 2.2" Recommendation. New Annexes ZA (WAD) and ZB (EAA) were added.
  - It was adopted on 24 Aug 2026. The latest announcement date is 30 Nov 2026, and conflicting national standards must be withdrawn by 31 May 2028.
  - Clause 9.4.1.1 is now "Void". Earlier versions referenced 4.1.1 Parsing, which WCAG 2.2 removed.
  - Clause 9.0 maps WCAG 2.0, 2.1 and 2.2 Level AA onto its clauses. For example, 2.1 AA equals clauses 9.1 to 9.4 minus the new 2.2 clauses.
- **Harmonised status for the EAA:** V4.1.1 says presumption of conformity applies "Once the present document is cited in the Official Journal". I found no Commission implementing decision citing it under 2019/882 as of 2026-10-15 (one search; EUR-Lex was not searchable by `curl`). The WCAG Overview says "The 2026 version of EN 301 549 uses WCAG 2.2."
- **For the post:** in the EU, the WCAG version that matters is set through EN 301 549, and that is moving from 2.1 to 2.2.

### 1.24 UK: Public Sector Bodies Accessibility Regulations 2018 and GOV.UK guidance. VERIFIED

- **Citation:** The Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018, SI 2018/952. Made 29 Aug 2018, laid 31 Aug 2018, in force 23 Sep 2018. https://www.legislation.gov.uk/uksi/2018/952/made. It replaced the defective SI 2018/852 and implements the Web Accessibility Directive.
- **Guidance:** GOV.UK, "Understanding accessibility requirements for public sector bodies" (GDS; published 9 May 2018, last updated 30 Sep 2024). https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps. Bodies must "meet the Web Content Accessibility Guidelines (WCAG) 2.2 AA accessibility standard". The guidance was updated for WCAG 2.2 on 5 Oct 2023. The regulations "build on" duties under the Equality Act 2010 (and the DDA 1995 in Northern Ireland), which also cover private service providers through the duty to make reasonable adjustments.

### 1.25 Canada: Accessible Canada Act (S.C. 2019, c. 10). VERIFIED (metadata + abstract)

- **Citation:** _Accessible Canada Act_, S.C. 2019, c. 10, assented to 21 June 2019. https://laws-lois.justice.gc.ca/eng/acts/A-0.6/. Only the statute's title page and assent date were checked. Its ICT technical standards (and any WCAG reference) were not read.

### 1.26 Google, Accessibility Developer Tools (2012). VERIFIED

- **Citation:** GoogleChrome/accessibility-developer-tools, GitHub. https://github.com/GoogleChrome/accessibility-developer-tools (Apache-2.0, archived).
- **Dates:** the oldest commit is "Initial commit." by Mike West, 8 June 2012. The GitHub repo record was created 12 July 2013. On npm, `accessibility-developer-tools` was first published 16 Dec 2014, and the last version (2.12.0) on 8 Mar 2017.
- **What it says:** "This is a library of accessibility-related testing and utility code." Its main part is "the accessibility audit", a set of rules run in a page. It also has contrast-ratio and accessible-name utilities.
- **Influence:**
  - jsx-a11y 0.5.0 (2 Apr 2016) based its `valid-aria-role` rule on `AX_ARIA_01` from this library (changelog).
  - tota11y says "Many of tota11y's features come straight from" it (1.30).
  - AccessLint's Ruby gem ran its rules via PhantomJS (1.27).
- **Caveat:** in the GDS test (6.11), "Google Developer Tools" found only 17% of 143 barriers, the lowest of 10 tools.

### 1.27 AccessLint (Cameron Cundiff, 2013). VERIFIED (repo metadata and README only)

- **Citation:** AccessLint/accesslint.rb, GitHub. The first commit is "ran `bundle gem access_lint`" by Cameron Cundiff, 27 July 2013. The repo is now marked "DEPRECATED".
- **What it says:** "AccessLint uses the Accessibility Developer Tools javascript library". Later repos: `accesslint.js` (2015), "Accessibility warnings for dynamic web content", and `accesslint-ci` (2016), a GitHub integration.
- **For the post:** a minor precursor. It shows that before 2016, a11y "linting" meant running audits on rendered pages, not on source.

### 1.28 react-a11y (Ryan Florence, Jan 2015). VERIFIED

- **Citation:** reactjs/react-a11y (originally `rackt/react-a11y`, per the npm 0.0.1 record). https://github.com/reactjs/react-a11y
- **Dates:** commits "first" and "release v0.0.1" by Ryan Florence, 19 Jan 2015; npm 0.0.1 the same day.
- **What it does:** "Warns about potential accessibility issues with your React elements." It is a runtime tool. It "patches the React rendering functions", logs to the console, and the README says not to run it in production.
- **Status:** "This library is being deprecated in favor of @axe-core/react." The notice credits Deque as "one of the top authorities on web accessibility". The last commit is from 30 Aug 2021.
- **For the post:** this is the runtime tool jsx-a11y was written to complement (1.31).

### 1.29 axe-core open-sourced (Deque, June 2015). VERIFIED; Vendor

- **See also:** 2.3 and 2.4 for the method behind the 57% figure.

- **Citation:** Deque Systems, "Accessibility Testing Goes Open Source and Mainstream," 10 June 2015, signed by Preety Kumar. https://www.deque.com/blog/axe-accessibility-engine-launch/. Repo: https://github.com/dequelabs/axe-core (repo record created 10 June 2015).
- **Dates and license:**
  - npm `axe-core` 1.0.0 was published 8 June 2015. The npm records show `MPL-2.0` from 1.0.1.
  - The git history starts earlier, with "Initial commit" by David Sturley on 1 May 2014 (pre-release, internal).
  - John Foliot announced the release to W3C lists on 10 June 2015 ("Deque Proudly Gives Back", w3c-wai-ig).
- **What it says:**
  - The launch post: "available as open source" so the community "can build upon 15 years of industry-leading accessibility research". It also promises "Enjoy zero false positive results, eliminating noise and frustration."
  - The README manifesto today: "It returns zero false positives (bugs notwithstanding)."
  - The README also claims "**on average 57% of WCAG issues automatically**". Elements axe can't decide are returned as "incomplete" for manual review.
- **Rule count (develop branch, `doc/rule-descriptions.md`, checked 2026-10-15):** 105 rules: 60 WCAG 2.0 A/AA, 3 WCAG 2.1, 1 WCAG 2.2, 27 best practices, 3 AAA, 6 experimental, 5 deprecated. That leaves 94 that are neither experimental nor deprecated. Latest release: v4.14.0, 5 Oct 2026.
- **Downloads:** 79.7 million in the week 6–12 Oct 2026 (npm downloads API).
- **For the post:** the design goal was no false positives, not full coverage. That is the opposite trade-off from a lint rule like `alt-text`, which fails on spreads it can't resolve (6.3).

### 1.30 tota11y (Khan Academy, June 2015). VERIFIED

- **Citation:** Jordan Scales, "tota11y - an accessibility visualization toolkit," KA Engineering blog, 8 June 2015. Read from the Wayback capture of 11 June 2015: http://web.archive.org/web/20150611190315/http://engineering.khanacademy.org:80/posts/tota11y.htm. Repo: Khan/tota11y, now `jdan/tota11y`. First commit "let's roll", 11 May 2015. npm 0.0.3 on 29 June 2015.
- **What it says:**
  - Khan Academy had been fixing a11y "since early January", using tests written with Chrome's Accessibility Developer Tools.
  - Then "regressions still popped up". The tests "were flaky", and "didn't gain the same level of respect as our unit tests or linter."
  - tota11y draws annotations on the page: alt text, contrast, heading structure, labels, landmarks, and unclear link text.
- **Status:** deprecated. The README says it was "created at a time when tooling to assist in developing accessible solutions was sparse", and points to axe.
- **For the post:** a good 2015 quote for why a11y checks needed to live where developers already look, next to the linter.

### 1.31 eslint-plugin-jsx-a11y (Ethan Cohen, Feb 2016). VERIFIED

- **Citation:** jsx-eslint/eslint-plugin-jsx-a11y. https://github.com/jsx-eslint/eslint-plugin-jsx-a11y. npm: https://www.npmjs.com/package/eslint-plugin-jsx-a11y
- **Origin:**
  - The repo record was created 17 Feb 2016. The first commit, "Initial commit.", is by Ethan Cohen on 17 Feb 2016, with one rule, `img-uses-alt`. The second commit, "Update README to remove React reference.", came the same day. The first README called it "A static analysis linter of React components and their accessibility with screen readers."
  - npm 0.0.1: 29 Feb 2016, author "Ethan Cohen". 1.0.0: 19 Apr 2016. 6.0.0: 27 June 2017.
- **Lineage from react-a11y:**
  - The 0.1.2 rules (1 Mar 2016) were `img-uses-alt`, `onClick-uses-role`, `mouseEvents-require-keyEvents`, `use-onblur-not-onchange`, `no-access-key` and `use-label-for`.
  - 1.0.0 renamed them to today's names (`img-has-alt`, `mouse-events-have-key-events`, `no-onchange`, `label-has-for`, …).
  - From 2 Mar 2016 the README said: "Ryan Florence built out this awesome runtime-analysis tool called react-a11y". It added that this project "does not _replace_ react-a11y" and should be "used in conjunction with it". The reason given: static tools "cannot determine values of variables that are being placed in props before runtime".
  - That text was replaced on 15 Feb 2022 (commit f878d3b, fixing #829) with the current "Why?" paragraph.
- **README today:**
  - "Static AST checker for accessibility rules on JSX elements."
  - "Because it only catches errors in static code, use it in combination with @axe-core/react". It adds: "always test your apps with assistive technology."
- **Org move:** commits on the `jsx-eslint` repo appear from June 2020 (merge branch names in #678, 11 June 2020). The `jsx-eslint` org itself was created 19 May 2020, and also holds eslint-plugin-react and jsx-ast-utils. URLs in docs were switched from `evcohen/` on 28 Oct 2021 ("[meta] update URLs", Jordan Harband). No evidence was found that the repo was ever under an Airbnb account.
- **People:**
  - npm maintainers: `ljharb`, `lencioni`, `jessebeach`, `evcohen`.
  - Non-merge commits by author: Ethan Cohen 270, Jesse Renee Beach 177 (plus 10 as "J. Renée Beach"), Jordan Harband 170.
  - Cohen's last commit is from 15 Aug 2019. Harband (`ljharb`) answers the issues today.
  - Wilco Fiers of Deque wrote `autocomplete-valid` (2019).
- **Rules (6.10.2 and `main`, checked 2026-10-15):**
  - 39 rule docs. 3 are deprecated: `accessible-emoji`, `label-has-for`, `no-onchange`.
  - 31 are in `recommended` and `strict`. `anchor-ambiguous-text` is off in recommended, and `control-has-associated-label` is off in both. `lang`, `no-aria-hidden-on-focusable` and `prefer-tag-over-role` are in neither.
- **Release stall:**
  - Latest npm release: 6.10.2, 26 Oct 2024. `main` has 18 more commits, including "[patch] `no-autofocus`: don't report error if autoFocus is set to false" (25 Dec 2024) and two `[New]` features.
  - In #1088 (closed 28 Apr 2026) the maintainer agreed the fix "lacks a release tag at this time". He explained that the GitHub release for 6.10.2 is dated Jan 2025 because "github releases … can't be backdated".
  - Downloads: 50.2 million in the week 6–12 Oct 2026.
- **For the post:** the most-installed a11y lint plugin hasn't shipped in nearly two years. Oxlint and Biome reimplemented it rather than wrapping it.

### 1.32 Airbnb's adoption (eslint-config-airbnb 7.0.0, Apr 2016). VERIFIED

- **Citation:** airbnb/javascript, `packages/eslint-config-airbnb/CHANGELOG.md`, and the npm registry record for `eslint-config-airbnb`.
- **What it says:**
  - The 7.0.0 entry (2016-04-11) reads "Add accessibility rules to the React style guide + `eslint-plugin-a11y`". The plugin name is misspelled in the changelog.
  - The npm `peerDependencies` confirm 7.0.0 is the first version to require `eslint-plugin-jsx-a11y` (`^0.6.2`). That was two months after the plugin's first commit.
- **Lead check:** "Airbnb's eslint config adopted it" is right. "Was it ever an Airbnb repo?": no evidence. The README still carries a note for people "installing this plugin via `eslint-config-airbnb`".

### 1.33 react-axe and @axe-core/react (Deque, 2016 and 2020). VERIFIED; Vendor

- **Citation:** `react-axe` on npm (1.0.0 on 10 May 2016; maintainers include `dylanb`). Its successor is `@axe-core/react` (first published 6 Aug 2020, "feat: add `@axe-core/react` (#53)"), in https://github.com/dequelabs/axe-core-npm/tree/develop/packages/react
- **What it says:**
  - It runs axe on the rendered DOM and reports to the "Chrome DevTools console" after component updates, debounced.
  - Since 6 Feb 2024: "This package does not support React 18 and above." React 18.0.0 was published to npm on 29 Mar 2022.
  - The README now points to "axe Developer Hub", a paid Deque product with a free plan.
- **Downloads:** 730k in the week 6–12 Oct 2026.
- **For the post:** the runtime partner that jsx-a11y's README recommends doesn't support current React. The realistic runtime partners now are axe in component tests, Playwright or Storybook (6.11).

### 1.34 Lighthouse uses axe-core (Apr 2016). VERIFIED

- **Citation:** GoogleChrome/lighthouse.
  - The repo record was created 8 Mar 2016. Commit 0f149459, "Adds a11y valid-aria-attr check, using axe-core audits" (Paul Lewis, 24 Apr 2016), is the earliest commit that search finds mentioning axe.
  - Scoring docs: "Lighthouse accessibility score," Chrome for Developers, last updated 22 Oct 2025. https://developer.chrome.com/docs/lighthouse/accessibility/scoring
  - Report strings: `core/config/default-config.js` on `main`.
- **What it says:**
  - Scoring page: "The Lighthouse Accessibility score is a weighted average of all accessibility audits." "Weighting is based on axe user impact assessments." "Each accessibility audit is pass or fail." "a page doesn't get points for partially passing an accessibility audit."
  - Report text (category description): "Automatic detection can only detect a subset of issues" and "does not guarantee the accessibility of your web app". It goes on: "so manual testing is also encouraged."
  - Manual section: "These items address areas which an automated testing tool cannot cover."
- **Counts on `main` (checked 2026-10-15):**
  - The accessibility category has 76 audit refs: 58 with weight above zero, 10 manual audits and 8 zero-weight low-impact ones.
  - The gatherer runs axe with `runOnly` tags `wcag2a` and `wcag2aa`, and explicitly disables 16 axe rules (e.g. `duplicate-id`, `nested-interactive`, `scrollable-region-focusable`).
  - So it runs a subset of axe.
- **Caveat:** the brief's claim that the scoring page says "only a subset of issues can be detected automatically" is wrong as stated. That sentence is in the report's category description, not the scoring page.

### 1.35 React's accessibility docs (June 2017) and what react.dev says now. VERIFIED

- **Citation:**
  - facebook/react PR #9519, "[Docs: A11y] Add accessibility docs" by Almero Steyn, merged 26 June 2017. It added `docs/docs/accessibility.md`, which moved to reactjs.org on 28 Sep 2017.
  - The legacy page is still up at https://legacy.reactjs.org/docs/accessibility.html, with the banner "This site is no longer updated."
- **What it says (2017 text and legacy page):**
  - It recommends eslint-plugin-jsx-a11y for "AST linting feedback regarding accessibility issues in your JSX". It notes "Create React App has this plugin with a subset of rules activated".
  - It recommends `react-axe`, now updated to `@axe-core/react`, to report findings "directly to the console".
  - It says browser audit tools "can only test the technical accessibility of your HTML."
- **react.dev today (repo `reactjs/react.dev` at 046f17d, 6 Oct 2026):**
  - No Accessibility page. No mention of jsx-a11y, axe-core or react-axe in `src/content`.
  - "Responding to Events" has a pitfall telling you to use `<button onClick>` "instead of `<div onClick={handleClick}>`".
  - The editor-setup page links `eslint-config-react-app` as the "recommended configuration for React".
- **What that config enables:** `eslint-config-react-app` (7.0.1, last published 12 Apr 2022) turns on 17 jsx-a11y rules, all at `warn`. They are `alt-text`, `anchor-has-content`, `anchor-is-valid` (noHref and invalidHref only), `aria-activedescendant-has-tabindex`, `aria-props`, `aria-proptypes`, `aria-role`, `aria-unsupported-elements`, `heading-has-content`, `iframe-has-title`, `img-redundant-alt`, `no-access-key`, `no-distracting-elements`, `no-redundant-roles`, `role-has-required-aria-props`, `role-supports-aria-props` and `scope`. None of the keyboard rules are on, and neither is `no-autofocus`.
- **CRA deprecation:** React deprecated Create React App on 14 Feb 2025 ("Sunsetting Create React App", react.dev blog).
- **Next.js (Vendor):** `eslint-config-next` (`src/index.ts` on `canary`) enables 6 jsx-a11y rules at `warn`: `alt-text`, `aria-props`, `aria-proptypes`, `aria-unsupported-elements`, `role-has-required-aria-props`, `role-supports-aria-props`.

### 1.36 Svelte's compile-time a11y warnings (Sept 2017). VERIFIED

- **Citation:**
  - sveltejs/svelte PR #815, "a11y checks", by Rich Harris, merged 5 Sep 2017. Changelog 1.38.0: "Compile-time a11y warnings".
  - Docs: "Compiler warnings," `documentation/docs/98-reference/30-compiler-warnings.md` and the generated list on `main`.
- **What it says:**
  - The PR plan: "the best way to approach this" is to "implement as many of the eslint-plugin-jsx-a11y rules as possible", followed by a checklist of jsx-a11y rules.
  - The docs today: Svelte "warns you at compile time if it catches potential mistakes", "such as writing inaccessible markup." You silence a warning with `<!-- svelte-ignore <code> -->`.
  - There are 42 `a11y_*` codes on `main` (2026-10-15).
- **For the post:** Svelte is the case where the check lives in the compiler, not a separate linter. It still descends from jsx-a11y.

### 1.37 Angular: codelyzer (2019) and angular-eslint (2020). VERIFIED

- **Citation:**
  - mgechev/codelyzer: "feat(rule): label accessibility - should have associated control (#739)" (11 Feb 2019) and "accessibility rule for alt text (#741)" (13 Feb 2019), both by Zama Khan Mohammed. Its `src` has six `templateAccessibility*` rules.
  - angular-eslint PR #227, "feat(eslint-plugin-template): accessibility-alt-text" (18 Dec 2020).
  - Config: `packages/angular-eslint/src/configs/template-accessibility.ts` on `main`.
- **What it says:** the `template-accessibility` preset enables 11 rules: `alt-text`, `click-events-have-key-events`, `elements-content`, `interactive-supports-focus`, `label-has-associated-control`, `mouse-events-have-key-events`, `no-autofocus`, `no-distracting-elements`, `role-has-required-aria`, `table-scope` and `valid-aria`. The README tags exactly 11 rules "[Accessibility]".

### 1.38 Vue: eslint-plugin-vue-a11y (2018) and eslint-plugin-vuejs-accessibility (2020). VERIFIED

- **Citation:**
  - maranran/eslint-plugin-vue-a11y (repo created 12 Apr 2018): "Static AST checker for accessibility rules on elements in .vue".
  - vue-a11y/eslint-plugin-vuejs-accessibility: first commit "Initial commit" by Kevin Deisz, 20 Apr 2020. npm 0.1.0: 27 Apr 2020.
- **What it says:**
  - The README credits: "largely based on previous work done on eslint-plugin-vue-a11y", plus eslint-plugin-jsx-a11y.
  - 23 rules in `src/rules` on `main`. `no-autofocus` keeps jsx-a11y's `ignoreNonDOM` option and has no dialog exception.
  - Downloads: 567k in the week 6–12 Oct 2026.
- **Note:** Vue's own Accessibility guide (vuejs/docs `best-practices/accessibility.md`) doesn't mention any lint plugin.

### 1.39 Rome's a11y group (Nov 2022) and Biome today. VERIFIED

- **Citation:**
  - rome/tools PR #3471, "feat(rome_js_analyze): promote rules", merged 1 Nov 2022. It added `analyzers/a11y.rs` and moved `no_auto_focus`, `use_alt_text`, `use_anchor_content`, `use_blank_target`, `use_key_with_click_events`, `use_key_with_mouse_events`, `use_valid_anchor`, `no_positive_tabindex` and `use_button_type` into it.
  - Rome CHANGELOG 10.0.0 (CLI v10.0.0 released 8 Nov 2022) lists those rules as new. `useButtonType` first appeared in 0.10.0. 12.0.0 and 12.1.0 added more `lint/a11y/*` rules.
  - Biome: "Announcing Biome," 29 Aug 2023 (Emanuele Stoppa and the core team): "Biome is the official fork of Rome". `@biomejs/biome` 1.0.0 was published 28 Aug 2023.
  - Rule metadata: https://biomejs.dev/metadata/rules.json (fetched 2026-10-15) and the installed 2.5.15 `configuration_schema.json`.
- **Counts (Biome site metadata, 2026-10-15):**
  - The `a11y` group has 38 rule names for JS/JSX/CSS: 37 JSX/JS rules plus `useGenericFontNames` for CSS. There are 37 HTML-language versions, added in 2.3.x (Oct 2025) to 2.5.0 (June 2026).
  - Every JSX/JS a11y rule is recommended except `noNoninteractiveElementInteractions`.
  - Sources: 35 of the 37 JSX/JS rules list `eslintJsxA11y` as `sameLogic`; the docs render this as "Same as". `useButtonType` cites eslint-plugin-react `button-has-type`, and `noSvgWithoutTitle` cites no source. Most HTML versions cite jsx-a11y as "inspired".
- **Rome PR note:** #3471 also says it "added support for spread props in `useAltText`". Biome 2.5.15 still flags `<img {...props} />` (6.7), so whatever that change did, it doesn't make spreads pass.

### 1.40 Oxlint's jsx-a11y plugin (Nov 2023 onward). VERIFIED; Vendor

- **Citation:**
  - oxc-project/oxc, `crates/oxc_linter/src/rules/jsx_a11y/` (sparse clone at 2c671979b, 15 Oct 2026). The first commit there is 1aa4b4e02, "feat(linter): Add rule `eslint-plugin-jsx-a11y(alt-text)` (#1126)" by Trevor Manz, 2 Nov 2023. More rules followed through Nov 2023 (`anchor-has-content`, `html-has-lang`, `anchor-is-valid`, `heading-has-content`, `img-redundant-alt`).
  - Plugin docs: https://oxc.rs/docs/guide/usage/linter/plugins.html
- **Counts:**
  - 36 rule files, exactly jsx-a11y's 39 minus the 3 deprecated ones (diffed against the jsx-a11y docs).
  - 35 are `correctness` and 1 (`anchor-ambiguous-text`) is `restriction`.
  - 31 carry the `recommended` marker. The five without it are `anchor-ambiguous-text`, `control-has-associated-label`, `lang`, `no-aria-hidden-on-focusable` and `prefer-tag-over-role`. That is the same 31 as jsx-a11y's `recommended`.
- **Docs caveats:**
  - The plugins page lists jsx-a11y as not enabled by default; the default set is eslint, typescript, unicorn and oxc. The source agrees (`LintPlugins::default()`).
  - "Setting `plugins` **overwrites the default plugin set**."
  - The settings struct supports `polymorphicPropName`, `components` and `attributes`, but not `polymorphicAllowList`.
- **Divergence is tracked in open issues:**
  - #27450 (8 Oct 2026): `role-has-required-aria-props` reports unmapped custom components that the original allows.
  - #27609 (12 Oct 2026): `interactive-supports-focus` and `role="toolbar"`.
  - #25231: `anchor-is-valid` ignores `settings.react.linkComponents`.
  - #25942: `click-events-have-key-events` ignores the `attributes` href alias.
  - These are single reports (ANECDOTAL for any claim about frequency).

### 1.41 Astro, Solid, Qwik, and the jsx-a11y-x fork. VERIFIED (READMEs and source)

- **eslint-plugin-astro** (ota-meshi; npm 0.0.1 on 22 May 2022): 36 `astro/jsx-a11y/*` rules that "extend the rules provided by eslint-plugin-jsx-a11y to work well in Astro component". You must install `eslint-plugin-jsx-a11y` or `eslint-plugin-jsx-a11y-x`.
- **eslint-plugin-solid** has no a11y rules. Its README says: "You may also want to check out eslint-plugin-jsx-a11y".
- **eslint-plugin-qwik**'s `jsx-a` rule is framed as SEO ("For a perfect SEO score, always provide href attribute"). `jsx-img` is framed as performance (width/height). Neither is an a11y rule, though Biome cites `jsx-a` as a source for `useValidAnchor`.
- **eslint-plugin-jsx-a11y-x** (es-tooling repo created 16 Oct 2024, now `eslint-community/eslint-plugin-jsx-a11y-x`; npm 0.2.0 on 10 May 2026) is a separate package with the same "Why?" text. Migration renames the namespace to `jsx-a11y-x/` and drops the three deprecated rules. Its motivation wasn't found in a primary source.

### 1.42 Runtime test integrations: a timeline. VERIFIED (npm registry dates)

- `@storybook/addon-a11y` 3.2.15: 16 Nov 2017 (Vendor: Chromatic).
- `jest-axe` 1.0.0: 12 Feb 2018 (Nick Colley).
- `cypress-axe` 0.1.0: 5 Nov 2018.
- `@axe-core/playwright` 4.2.1-alpha: 2 June 2021 (Vendor: Deque).
- `vitest-axe` 0.0.0: 4 July 2022 (Chance Strickland). Its README: "This library is a fork of `jest-axe`."
- Downloads, week 6–12 Oct 2026: `@axe-core/playwright` 14.3 million, `jest-axe` 2.7 million.

---

## 2. How much automated checking can catch

### 2.1 Duran, "What we found when we tested tools on the world's least-accessible webpage" (GDS Accessibility blog 2017). VERIFIED

- **Citation:** Mehmet Duran, GOV.UK Accessibility blog, posted 24 February 2017. https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/
- **Method:**
  - The GDS accessibility team (Duran, with Alistair and Richard) built a test page "full of accessibility failures": 143 failures in 19 categories.
  - Some barriers were put in deliberately because they expected tools to miss them, such as flashing content with no warning and plain language not being used.
  - They ran 10 free (or free-trial) tools: Tenon, WAVE, HTML_CodeSniffer, aXe, AChecker, SortSite, Google Accessibility Developer Tools, EIII checker, Asqatasun and the Nu HTML Checker.
- **What it found:**
  - Of the 143 barriers, "a total of 42 were missed by all of the tools we tested" (29%). The missed barriers included long italic text, tables with empty cells, and links identified by colour alone.
  - Counting only errors and warnings, Tenon found the most, at 37%. Counting manual-inspection prompts, Asqatasun found 41%. Google ADT found 17%.
  - All tools combined picked up 71%.
- **Framing quotes:** "No tool will be able to pick up every accessibility barrier on a website." Duran compares a testing tool to a spellchecker: "think of a testing tool as like using a spellchecker."
- **Caveats:** this is one synthetic page. A barrier counts once, whatever its real-world frequency or severity. The 2017 numbers were later revised (2.2).

### 2.2 alphagov/accessibility-tool-audit: results page and data (GDS, 2016–2018). VERIFIED

- **Citation:** Government Digital Service, "Accessibility tool audit." Results: https://alphagov.github.io/accessibility-tool-audit/ (page says "Last updated: 13 April 2018"). Repo: https://github.com/alphagov/accessibility-tool-audit. The repo is **archived**; its last push was 29 Jul 2021. Checked 2026-10-15.
- **Changelog** (`changelog.json`):
  - First results 7 Aug 2016, then re-tests through 2017–2018.
  - Tools added: Siteimprove (13 Dec 2017), FAE (19 Dec 2017) and ASLint (13 Feb 2018).
  - "Re-interpreted some results due to removal of less helpful categories" (13 Feb 2018). The last entry is a WAVE re-test on 13 Apr 2018.
- **What the current page says:** GDS "introduced 142 accessibility barriers to a page of content" and "ran them through 13 automated tools." Also: "The best performing tool in this category found 40% of the problems we introduced," and with prompts the best "picked up 50% of our deliberate mistakes."
- **Per-tool results** (share of all 142 barriers; from the page, matching `analysis.json`):

  | Tool | Barriers found (error/warning) | Including "needs human check" prompts |
  | --- | --- | --- |
  | SortSite | 40% | 40% |
  | Tenon | 34% | 34% |
  | AChecker | 31% | 35% |
  | WAVE | 30% | 39% |
  | aXe | 29% | 30% |
  | Siteimprove | 29% | 36% |
  | ASLint | 28% | 35% |
  | FAE | 28% | 50% |
  | Asqatasun | 25% | 47% |
  | HTML_CodeSniffer | 20% | 34% |
  | EIII | 17% | 17% |
  | Google ADT | 17% | 17% |
  | Nu Html Checker | 13% | 16% |

- **All tools combined:**
  - `analysis.json` gives `"total": 142, "detectable": 122, "undetectable": 20` and `"detectable": 86`. So 86% of barriers were found by at least one tool, counting prompts.
  - Counting only errors and warnings (including SortSite's paid-tier errors), 100 of 142 (70%) were found by at least one tool (my count from `tests.json`).
- **Barriers no tool flagged at all (18 in my count of `tests.json`):**
  - wrong reading order in source, and content not chunked with headings or lists;
  - horizontal scroll, inadequate line height, long lines, and text in the wrong direction;
  - "Text formatting used instead of an actual heading," "List not marked up as a list," and tables with empty cells;
  - flashing content with no warning, links not separated by printable characters, and small targets;
  - three lightbox keyboard failures: Esc doesn't close it, focus isn't moved into it, and focus isn't kept in it;
  - `visibility:hidden` and `display:none` hiding content meant for screen readers, and an inline style that adds colour.
  - Two more show only an "identified" status, not an error, warning or prompt.
- **For the post:** these are almost all rendering, behaviour or meaning problems. A JSX linter couldn't see them either.

### 2.3 Deque, "The Automated Accessibility Coverage Report" and press release (2021). VERIFIED; Vendor

- **Citation:**
  - Press release: Deque Systems, "Results of Extensive Data Set Redefine Limits of Automated "Accessibility Coverage"," Herndon VA, 10 March 2021. https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/
  - Report: https://deque.com/coverage-report/, which redirects to https://accessibility.deque.com/hubfs/Accessibility-Coverage-Report.pdf (12 pp.; PDF created 9 Mar 2021; footer code "CommonAccessibilityIssues-3.9.21-v1"). The PDF downloaded directly, with no form.
- **Method, as stated:**
  - "Over 2,000 audits," "13,000+ pages/page states," and "nearly 300,000 issues" (Table 1 total: 294,958).
  - First-time audits only: each page or state is counted once, from its first audit.
  - Automated testing used axe-core. The study covered HTML pages only and "spans across various conformance standards like WCAG 2.0/2.1 Level A and AA."
  - Template issues (header, footer, nav) are counted once: "we account for issues on these common templates only once."
  - Items that need human review don't count as automated: "needs manual verification, or is a best practice, it is not included."
- **The argument:**
  - The report's stated aim is "to disprove the widely accepted belief" that automation covers only 20–30%.
  - CTO Dylan Barrell says the result came from shifting the definition "beyond the number of WCAG Success Criteria to total volume of issues."
  - The report concedes the per-criterion view: "we found automated issues for 16 out of the 50 Success Criteria" (WCAG 2.1 AA).
- **Headline:** "57.38% of total issues were identified using Deque’s automated tests" (169,242 automated against 125,716 manual).
- **Where the volume comes from (Table 1):**
  - 1.4.3 Contrast: 88,714 issues, 83.1% automated, 30.08% of all issues ("accounting for about 30%").
  - 4.1.2: 48,287 (54.4% automated). 1.3.1: 36,382 (45.2%).
  - 4.1.1 Parsing: 34,488, of which 31,137 automated (90.3%), 11.69% of all issues.
  - 1.1.1: 23,701 (67.6% automated).
  - These five make up 78.5% of all issues.
  - Zero automated: 2.4.3 Focus Order (9,553 issues), 2.4.7 Focus Visible (7,312) and 1.4.11 Non-text Contrast (4,539).
  - 2.1.1 Keyboard: 9,412 issues, 2.5% automated.
- **Caveats:**
  - Vendor data from Deque's own audits and tool, with no independent replication.
  - The denominator holds only issues that Deque's auditors found. Issues nobody found are invisible.
  - Volume weighting rewards repetitive, machine-detectable failures. Contrast alone supplies 43.6% of all automated issues (73,733 of 169,242, my arithmetic).
  - **4.1.1 Parsing is obsolete in WCAG 2.2** (2.19). Removing it gives (169,242 − 31,137) / (294,958 − 34,488) = 53.0%. Also removing 1.4.3 gives 64,372 / 171,756 = 37.5% (my arithmetic).
  - The press release says "completely covered." The report says "identified using Deque’s automated tests." Neither defines how a partly automated finding is split.
- **For the post:** cite both views. By criteria, automation reaches about a third of WCAG 2.1 AA (16 of 50). By volume, it reaches a little over half, and much of that is contrast.

### 2.4 axe-core README and API: "57%" and "needs review" (Deque, 2026). VERIFIED; Vendor

- **Citation:** dequelabs/axe-core, `README.md` and `doc/API.md` on `develop`, read 2026-10-15. Latest release v4.14.0, published 2026-10-05. https://github.com/dequelabs/axe-core
- **What it says:**
  - "With axe-core, you can find **on average 57% of WCAG issues automatically**." That is the 2021 report's number (2.3).
  - The README also claims "It returns zero false positives (bugs notwithstanding)."
  - The API defines `incomplete`: "Also known as "needs review"". Such results "were aborted and require further testing," either from technical limits or a JavaScript error. Rules can be set with `reviewOnFail` to report "Needs Review" instead of "Violation."
- **For the post:** the zero-false-positive design is why axe defers so much to "needs review" (2.18). A lint rule that errors without that escape hatch has to choose between false positives and silence.

### 2.5 Groves, "We need more choices in automated testing" (karlgroves.com 2026). ANECDOTAL

- **Citation:** Karl Groves, published 21 September 2026. https://karlgroves.com/we-need-more-choices-in-automated-testing/ (opened 2026-10-15).
- **What it says:**
  - When one engine dominates, "coverage is judged against what the tool can detect" rather than what the standard requires.
  - "automated tools still detect only a fraction of the issues" in a real conformance evaluation.
  - "No rule running inside a web page can handle all of that."
- **Caveats:** this is a practitioner essay. It doesn't name axe, though Roselli reads it as "almost definitely a reference to axe" (2.11). It is the closest thing I found to a published critique of tool-defined coverage. It isn't a direct rebuttal of the 57% figure.

### 2.6 Vigo, Brown and Conway, "Benchmarking web accessibility evaluation tools: measuring the harm of sole reliance on automated tests" (W4A 2013). VERIFIED (metadata + abstract)

- **Citation:** Markel Vigo, Justin A. Brown, Vivienne L. Conway. _Proceedings of the 10th International Cross-Disciplinary Conference on Web Accessibility (W4A '13)_, ACM, 13 May 2013, article 1, pp. 1–10. https://doi.org/10.1145/2461121.2461124 (Crossref, Semantic Scholar: 239 citations; closed access). Brown and Conway were at Edith Cowan University (ECU repository record https://ro.ecu.edu.au/ecuworks2013/236/).
- **What the abstract says:**
  - Six "state-of-the-art tools" were assessed on coverage, completeness and correctness against WCAG 2.0.
  - "Coverage is very narrow as, at most, 50% of the success criteria are covered."
  - Completeness ranges from 14% to 38%. "some of the tools that exhibit higher completeness scores produce lower correctness scores (66-71%)."
  - Conclusion: one in two criteria won't be analysed, and of those analysed "only 4 out of 10 will be caught."
- **Secondary detail (not checked against the paper):**
  - Frazão and Duarte (2.7) and Pădure and Pribeanu (2.10) both name the tools: AChecker, SortSite, Total Validator, TAW, Deque and AMP.
  - Fischer et al. (2.8) report the coverage range as "23% to 50%" of success criteria, counting only true violations.
  - An unofficial slide transcript (slideserve.com) lists three Australian sites (Vision Australia, the Prime Minister's site, Transperth) and a manually built ground truth.
- **Caveats:** I couldn't get the full text. ACM was closed (403), the ECU and EHU repositories hold metadata only, and no Manchester copy turned up. The number of sites and the per-tool figures are unverified. The brief's "4 websites" is not confirmed.

### 2.7 Frazão and Duarte, "Comparing accessibility evaluation plug-ins" (W4A 2020). VERIFIED

- **Citation:** Tânia Frazão, Carlos Duarte (LASIGE, Universidade de Lisboa). _17th Web for All Conference (W4A '20)_, Taipei, 20–21 April 2020, 11 pp. https://doi.org/10.1145/3371300.3383346 (CC BY-NC). Full text read from the Wayback copy of the ACM PDF (snapshot 2023-04-05), because ACM returned 403 to curl.
- **Method:**
  - Eight Chrome extensions: aXe, Tenon Check, WAVE, TotalValidator, ACCESS Assistant Community, Accessibility Insights, ARC Toolkit and Lighthouse. Three of them (aXe, Accessibility Insights, Lighthouse) share the axe-core engine.
  - Each tool ran in its own Sandboxie sandbox on the home pages of 10 Alexa top sites (9 English and 1 non-English), within seconds of each other, in Chrome 78.
- **What it found:**
  - "individual tools still provide limited coverage of the success criteria."
  - Going by each tool's documented checks, all eight together test 62 of 78 WCAG 2.1 success criteria ("the total of individual success criteria tested is 62"). Using all of them adds "approximately 10% to 40% more coverage" than any one tool.
  - Documented checks per tool: aXe 44, Lighthouse 47, Accessibility Insights 64, ARC 145, WAVE 180, ACCESS Assistant 252.
  - 4.1.1 Parsing had the most errors across tools, followed by 1.4.3 and 1.1.1.
- **Caveats:**
  - "we did not look at possible false positives or false negatives." So "62 of 78" is what the tools claim to check, not what they reliably catch.
  - Fischer et al. (2.8) dispute it: axe reported 24 criteria here, but only 15 in their study.

### 2.8 Fischer, Lundell and Gamalielsson, "Coverage of web accessibility guidelines provided by automated checking tools" (UAIS 2025). VERIFIED

- **Citation:** Thomas Fischer, Björn Lundell, Jonas Gamalielsson (University of Skövde). _Universal Access in the Information Society_ 24(4):3615–3637, published online 18 Sep 2025. https://doi.org/10.1007/s10209-025-01263-x. Full text read from the open copy at DiVA: https://his.diva-portal.org/smash/get/diva2:1999126/FULLTEXT02
- **Method:**
  - Six tool/engine combinations, all open source and run in Linux containers: Pa11y/aXe (axe-core 4.2.4), Pa11y/HTMLCS, A11yWatch/aXe (a fork of axe-core 4.6.3), A11yWatch/HTMLCS, QualWeb/WCAG and QualWeb/ACT.
  - They ran on 550 landing pages of Swedish public-sector organisations, which are legally required to be accessible.
  - Coverage was measured two ways: by violations reported, and by reading each engine's source for checks mapped to each success criterion.
- **What it found:**
  - Abstract: "the tools cover only one sixth of all WCAG success criteria." Five of six engines report violations for about 12 criteria each, and QualWeb/WCAG for 21.
  - "The combination of all six engines allows to cover 39% of all success criteria."
  - "31 out of 78 success criteria (44.8%) are not covered by any engine." For 8 more, checks exist but never fired on these pages. Only three criteria are reported by all engines.
  - Per-page medians of unique violated criteria are low: two or fewer for most engines, 8 for QualWeb/WCAG, and 11 with all six merged.
  - Contrast (1.4.3) was flagged on 91.0% of pages.
  - On alt text, their reading of the engines' source confirms what other studies say: the engines check for empty or duplicate alt text, not whether it is informative. Only one QualWeb technique checks for filename-like alt text.
- **Caveats:**
  - Swedish public-sector landing pages only, and older engine versions (axe-core 4.2.4/4.6.3).
  - The engines' violations were not checked for false positives.
  - The prose mislabels some criteria. It calls 1.4.5 "ability to bypass blocks" and 1.4.9 "avoidance of text in an image." Cite the numbers, not those glosses.

### 2.9 İsmailova and İnal, "Comparison of Online Accessibility Evaluation Tools: An Analysis of Tool Effectiveness" (IEEE Access 2022). VERIFIED (metadata + abstract)

- **Citation:** Rita İsmailova, Yavuz İnal. _IEEE Access_ 10, 2022. https://doi.org/10.1109/ACCESS.2022.3179375 (gold open access; OpenAlex: 32 citations).
- **What the abstract says:** 41 government websites from different countries were tested with six online tools. "each tool generated different evaluation data for the same websites." The tools are complementary, so the best coverage and completeness come from combining them.
- **Caveats:** I couldn't read the full text. IEEE returned HTTP 418 to curl and WebFetch, and the NVA repository's file download returned 403. I have no tool names or numbers.

### 2.10 Pădure and Pribeanu, "Comparing Six Free Accessibility Evaluation Tools" (Informatica Economică 2020). VERIFIED

- **Citation:** Marian Pădure, Costin Pribeanu. _Informatica Economică_ 24(1):15–25, 2020. https://doi.org/10.24818/issn14531305/24.1.2020.02 (PDF: http://revistaie.ase.ro/content/93/02%20-%20padure,%20pribeanu.pdf).
- **What it found:**
  - Six tools (AChecker, Cynthia Says, Mauve, TAW, Total Validator, WAVE) were run on six Romanian municipal sites (Aug–Sep 2019) with no ground truth.
  - The counts vary wildly. On one site, Level AA errors ranged "from none (TAW) to 416 (Wave) and 765 (Mauve)."
- **For the post:** a minor source. Useful only to show that error counts aren't comparable across tools.

### 2.11 Roselli, "Comparing Manual and Free Automated WCAG Reviews" (adrianroselli.com 2023, updated 2026). ANECDOTAL

- **Citation:** Adrian Roselli, originally posted 19 January 2023, "Updated September 21, 2026." https://adrianroselli.com/2023/01/comparing-manual-and-free-automated-wcag-reviews.html
- **Method:** one popular site's home page, reviewed against WCAG 2.1 A/AA on 14 Jan 2023. The manual review used JAWS, NVDA and VoiceOver, against axe DevTools 4.47.0 (axe-core 4.6.2), ARC Toolkit 5.4.2, WAVE 3.2.2.0 and IBM Equal Access Checker 3.1.42.
- **What it found:**
  - "Automated accessibility testing tools cannot test 100% of WCAG."
  - Unique failures found: manual 37 across 18 criteria, axe 2, ARC 3, WAVE 0, EAAC 5. A later update adds Level Access's Access Assistant at 4.
  - Roselli found "almost seven-and-a-half times (7½×) more issues" than the next-best tool. He also says he no longer fails anything under 4.1.1.
  - Later updates collect similar reports (Robert Dodd 2025, Chris Yoong 2025, Anselm Hannemann 2025, Steve Faulkner 2025, Karl Groves 2026), but I opened only Groves's (2.5, 2.12).
- **Caveats:** one page and one reviewer, who concedes he may have been "overzealous," with no QA. It is good for illustration but isn't a rate.

### 2.12 Groves, "Web Accessibility Testing: What Can be Tested and How" (karlgroves.com 2012). ANECDOTAL

- **Citation:** Karl Groves, published 15 September 2012, last updated 21 October 2025. https://karlgroves.com/web-accessibility-testing-what-can-be-tested-and-how/ (curl got 403; read from the Wayback snapshot of 2026-01-15 and confirmed with WebFetch).
- **What it says:**
  - Groves listed his own "Best Practices" for each criterion (26 for 1.1.1, for example) and classed each as Auto, Manual Verification or Manual Only.
  - Auto: 25% at Level A, 17% at AA and 23% at AAA. Manual Only: 46%, 41% and 53%.
  - there are "9 WCAG Success Criterion (in Level A and AA) that cannot be tested" in any meaningful way. Conclusion: "relying solely on automatic testing is probably a bad idea."
- **Caveats:**
  - It is expert judgement, not measured. It "does not take into account the capabilities" of any tool.
  - His table rates 2.1.1 Keyboard at 88% automatable, while Deque's audit data shows 2.5% automated (2.3).
  - The "25 to 33%" or "a quarter to a third" paraphrases (A11Y Project 2025; Roselli) don't match his table. It says 25% at A and 17% at AA.

### 2.13 The "30–40%" figure. UNVERIFIED (as a general rate)

- **Where it shows up:**
  - UK Department for Education, "Tools and testing" knowledge hub: "Automated testing tools provide around 30 to 40% of coverage" (Wayback snapshot 8 Jul 2025, https://web.archive.org/web/20250708182421/https://accessibility.education.gov.uk/knowledge-hub/tools-testing). No source is given, and the live page now 404s. ANECDOTAL.
  - The A11Y Project, "Myth: Automated tools can ensure full accessibility compliance" (10 Mar 2025): a GDS audit found "even the best automated tools detect only 30-40% of known accessibility issues." No link to the GDS audit. https://www.a11yproject.com/posts/automated-tools-can-ensure-full-accessibility-compliance/
- **Trace:**
  - The nearest primary data is the GDS single-tool range (17–41% in the 2017 blog; 13–40% for errors only and up to 50% with prompts in 2018) (2.1, 2.2).
  - Deque calls the common belief "20-30%" and cites WebAIM, GDS and a LinkedIn engineering post for it (2.3).
  - Fischer et al. note that the Swedish regulator DIGG says at most 40% of criteria can be checked automatically, but I didn't open DIGG.
- **For the post:** don't cite "30–40%" as a finding. Cite GDS directly.

### 2.14 W3C WAI, "Selecting Web Accessibility Evaluation Tools" (W3C 2024). VERIFIED

- **Citation:** W3C Web Accessibility Initiative, EOWG. https://www.w3.org/WAI/test-evaluate/tools/selecting/ ("Updated: 13 May 2024"; first published March 2006; editors Kevin White, Eric Velleman, Michel Hansma, Vera Lange). Checked 2026-10-15.
- **What it says (section "What Evaluation Tools Can Do and Can Not Do"):**
  - "Tools cannot check all accessibility aspects automatically. Human judgement is required."
  - "Sometimes evaluation tools can produce false or misleading results."
  - The key sentence ends: "tools can not determine accessibility, they can only assist in doing so."
- **Note:** older papers quote an earlier wording: "can not determine the accessibility of Web sites" (Frazão and Duarte 2020). Use the current one.

### 2.15 ACT Rules Format 1.0 and 1.1 (W3C Recommendations 2019, 2026). VERIFIED

- **Citation:**
  - _Accessibility Conformance Testing (ACT) Rules Format 1.0_, W3C Recommendation, 31 October 2019. https://www.w3.org/TR/2019/REC-act-rules-format-1.0-20191031/
  - _ACT Rules Format 1.1_, W3C Recommendation, 5 February 2026. https://www.w3.org/TR/act-rules-format/ (editors Wilco Fiers (Deque), Kathy Eng (US Access Board), Daniel Montalvo (W3C)).
- **What it says:**
  - Atomic rules must list their "input aspects": the parts of the test subject they need, such as the DOM tree, CSS styling, the accessibility tree, language, and audio or visual output.
  - Both versions say a DOM tree "can be inferred from a JSX source file." Both add: "All rules that have only DOM tree as an input aspect can be applied" to those technologies.
  - Implementations can be "fully automated, completely manual, or some combination."
- **For the post:** this is the standard's own statement of which rules can, in principle, run on JSX source: the DOM-only ones. See 2.16 for how few they are.

### 2.16 ACT rules: counts and input aspects (W3C, checked 2026-10-15). VERIFIED (my tally)

- **Citation:** W3C, "All ACT Rules," https://www.w3.org/WAI/standards-guidelines/act/rules/. Data: `wcag-mapping.json` in https://github.com/w3c/wcag-act-rules (raw file fetched 2026-10-15).
- **Counts (my tally):**
  - 94 rules: 37 approved, 50 proposed, 7 deprecated.
  - Of the 37 approved, all atomic: 37 use the DOM tree, 28 CSS styling, 13 the accessibility tree and 5 "Language" (human judgement).
  - **Only 8 of 37 approved rules need nothing but the DOM tree:**
    - ARIA attribute is defined in WAI-ARIA;
    - Element with role attribute has required states and properties;
    - HTML page has lang attribute; HTML page lang attribute has valid language tag;
    - HTML page has non-empty title;
    - Meta element has no refresh delay (two variants);
    - Meta viewport allows for zoom.
  - Across all 87 non-deprecated rules, 9 are DOM-only. The ninth is "No keyboard shortcut uses only printable characters."
  - Active ACT rules map to 38 success criteria. The rules page shows "No ACT Rules available" for many others, including 2.4.3 Focus Order.
- **Rules that need judgement:**
  - Approved: "Image accessible name is descriptive" (Language), "HTML page title is descriptive" and "Text has minimum contrast" (CSS, accessibility tree, Language).
  - Proposed: "Link in context is descriptive," "Heading is descriptive" and "Form field label is descriptive."
- **Caveats:** many rules list CSS styling only to decide visibility or inclusion in the accessibility tree. A linter can approximate those by assuming everything is visible. That assumption is the false-positive and false-negative trade-off.

### 2.17 ACT implementations, including "Accessibility Linters" (W3C, checked 2026-10-15). VERIFIED

- **Citation:** W3C, "ACT Implementations," https://www.w3.org/WAI/standards-guidelines/act/implementations/ (data supplied by vendors and "not verified by the W3C").
- **What it says:**
  - The page has a separate category: "Linters are fully automated tools that test source code." Unlike other tools, "linters can skip examples that require dynamic content such as JavaScript and CSS."
  - Listed linters: Total Validator 17.4.0 (29 consistent rules) and ember-template-lint 5.5.1 (**0** consistent rules).
  - Automated tools (consistent approved rules / proposed): axe-core 4.10.2, 26/3; Alfa 0.118.0, 27/3; SortSite 6.55, 33/9; Total Validator (+Browser), 33/10; QualWeb 3.0.0, 23/9; IBM Equal Access, 21/2; UsableNet AQA, 32/6.
- **For the post:**
  - W3C already treats source-code linters as a distinct, weaker class.
  - None of eslint-plugin-jsx-a11y, Oxlint or Biome is listed. ember-template-lint, the one JS-ecosystem linter listed, scores zero.
  - "Consistent" is strict: every expected outcome must match. So zero means it doesn't fully match any rule's test cases. It doesn't mean it catches nothing.

### 2.18 axe-core 4.14 rule descriptions (Deque, 2026). VERIFIED; Vendor

- **Citation:** `doc/rule-descriptions.md` at tag v4.14.0, https://github.com/dequelabs/axe-core/blob/v4.14.0/doc/rule-descriptions.md
- **Counts (my count):**
  - 105 rules: WCAG 2.0 A/AA 60, WCAG 2.1 A/AA 3, WCAG 2.2 A/AA 1, best practices 27, AAA 3, experimental 6, deprecated 5.
  - Issue type: 41 "failure" only, 53 "failure, needs review" and 11 "needs review" only.
  - The "needs review" ones include `bypass`, `video-caption`, `no-autoplay-audio`, `th-has-data-cells` and `identical-links-same-purpose`. The `color-contrast`, `image-alt`, `label` and `link-name` rules can also return "needs review."
  - The 64 A/AA rules carry tags for 22 distinct success criteria, one of them AAA (2.1.3), so about 21 A/AA criteria. 28 rules are tagged 4.1.2, and 9 are tagged 1.3.1.
- **For the post:** the market-leading runtime engine automates about 21 of WCAG 2.2's 55 A/AA criteria. Most of its rules can defer to a person. That is a ceiling for a source linter, which sees less.

### 2.19 WCAG 2.2 and its Understanding documents (W3C). VERIFIED

- **Citation:** _WCAG 2.2_, W3C Recommendation 12 December 2024, https://www.w3.org/TR/WCAG22/. Understanding docs at https://www.w3.org/WAI/WCAG22/Understanding/ (non-text-content, info-and-relationships, contrast-minimum, focus-order, focus-visible). Checked 2026-10-15.
- **What they say, by criterion:**
  - **1.1.1:** text alternatives must serve "the equivalent purpose." The Understanding doc gives one handshake photo two different correct alt texts because "The same image is used in a different context."
  - **1.3.1:** "conveyed through presentation can be programmatically determined or are available in text." Passing means comparing the visual presentation with the markup.
  - **1.4.3:** 4.5:1 (3:1 for large text). Evaluators should use the foreground and background "colors obtained from the user agent, or the underlying markup and stylesheets." Contrast is computable in principle from styles, but only once the cascade, inheritance and backgrounds are resolved.
  - **2.4.3:** focusable components must "receive focus in an order that preserves meaning and operability." That is a judgement about meaning.
  - **2.4.7:** "a mode of operation where the keyboard focus indicator is visible." That is a property of rendered styles.
  - **4.1.1 Parsing** is "(Obsolete and removed)" in WCAG 2.2: "This criterion no longer has utility and is removed."

### 2.20 Which success criteria a source-level linter can check (my analysis)

The classification is my own analysis. It is based on ACT input aspects (2.16), the Understanding docs (2.19), Deque's per-criterion automated share (2.3), GDS's never-detected list (2.2), and the names of rules in eslint-plugin-jsx-a11y's `docs/rules` (checked 2026-10-15).

"Source lint" means a per-file JSX/template rule that sees literal elements and attributes. It doesn't see props resolved at runtime, the composed DOM, CSS or behaviour. "DOM-only" in ACT terms isn't the same as JSX-only: a linter sees one component at a time, and spread props or dynamic values hide attributes.

| SC | Source lint can check? | Needs rendered page? | Needs a person? | Basis |
| --- | --- | --- | --- | --- |
| 1.1.1 Non-text Content | Partly: `alt` or name missing on a literal `<img>`, `<area>`, `<input type="image">`, `<object>` (`alt-text`); obvious junk like "image of" (`img-redundant-alt`) | Yes, for computed names and decorative or hidden status (ACT 23a2a8, 46ca7f use CSS and the accessibility tree) | Yes: whether the alt "serves the equivalent purpose" (ACT qt1vmo needs Language; 2.19) | Deque: 67.6% of 1.1.1 issues automated |
| 1.3.1 Info and Relationships | Partly: valid ARIA attributes and roles, required states (ACT 5f99a7, 4e8ab6 are DOM-only), `scope`, label association in one file | Yes: required parent and owned roles span components (ACT ff89c9, bc4a75 use the accessibility tree) | Yes: does the markup match the visual structure? GDS: no tool found bold text used as a heading, or a visual list not marked up | Deque: 45.2% automated |
| 1.4.3 Contrast (Minimum) | No: colours come from the cascade, themes, inherited backgrounds and images | Yes (ACT afw4f7: CSS styling, accessibility tree) | Sometimes: text over images or gradients (axe can return needs review) | Deque: 83.1% automated, 30% of all issues; WebAIM 2026: 83.9% of pages |
| 2.1.1 Keyboard | Partly: click handler with no key handler, or not focusable (`click-events-have-key-events`, `interactive-supports-focus`, `no-static-element-interactions`) | Yes: handlers attached elsewhere, scrollable regions (ACT 0ssw9k uses CSS) | Yes: does it actually operate? | Deque: 2.5% of 9,412 automated |
| 2.4.3 Focus Order | Only a proxy: positive `tabindex` (`tabindex-no-positive`) | Yes | Yes: "preserves meaning and operability"; no ACT rule exists | Deque: 0% of 9,553; GDS: lightbox focus failures missed by all 13 tools |
| 2.4.7 Focus Visible | No: outline removal is in CSS | Yes (ACT oj04fd uses CSS) | Usually | Deque: 0% of 7,312; Almanac 2025: 67% of sites remove outlines |
| 2.4.2 Page Titled | Partly: a `<title>` exists, if it is in the linted source; frameworks often set it through a metadata API | For final presence (Almanac: 7% of titles change after rendering) | Yes: is it descriptive? (ACT c4a8a4 needs Language) | Deque: 11.3% automated |
| 2.4.4 Link Purpose | Partly: empty links, a stock list of vague text (`anchor-has-content`, `anchor-ambiguous-text`) | Yes: computed name (ACT c487ae) | Yes: purpose in context (ACT 5effbb, proposed, needs Language) | Deque: 0% automated; WebAIM 2026: empty links on 46.3% of pages |
| 3.1.1 Language of Page | Yes, if `<html>` is in the linted source (`html-has-lang`, `lang`; ACT b5c3f8, bf051a are DOM-only) | No | Only whether it is the right language (ACT ucwvc8, proposed) | Deque: 91.8% automated; WebAIM 2026: missing on 13.5% |
| 4.1.2 Name, Role, Value | Partly: invalid ARIA, missing required states, `aria-hidden` on focusable elements (`aria-props`, `aria-role`, `role-has-required-aria-props`, `no-aria-hidden-on-focusable`) | Yes: accessible-name rules need the accessibility tree (ACT 97a4e1) | Yes: do the name, role and state match behaviour? | Deque: 54.4% automated |
| 1.2.2 Captions | Only that a `<track>` exists (`media-has-caption`) | Yes (audio output) | Yes: accuracy | ACT rules all proposed |
| 2.2.2 Pause, Stop, Hide | `<marquee>` and `<blink>` only (`no-distracting-elements`) | Yes: autoplay, CSS animation | Yes | — |
| 1.4.4 Resize Text | A zoom-locking `<meta name="viewport">`, if it is in source (ACT b4f0c3 is DOM-only) | Clipping needs rendering (ACT 59br37) | — | Almanac 2025: 19% of mobile sites restrict scaling |
| 1.3.5 / 3.3.2 Input purpose, labels | Valid `autocomplete` token (`autocomplete-valid`; ACT 73f2c2); a label is associated (`label-has-associated-control`) | Computed name | Yes: is the label descriptive? (ACT cc0f0a needs Language) | WebAIM 2026: 33.1% of inputs unlabelled |

---

## 3. The state of the web

### 3.1 WebAIM, "The WebAIM Million: The 2026 report on the accessibility of the top 1,000,000 home pages" (WebAIM 2026). VERIFIED

- **Citation:** WebAIM (Institute for Disability Research, Policy, and Practice, Utah State University). https://webaim.org/projects/million/ ("Last updated: Mar 30, 2026"). Data from February 2026. Checked 2026-10-15.
- **Method:**
  - Home pages from the Tranco list. It excludes pages with errors, pages with fewer than 10 elements, and pages with more than 5,000 same-domain links.
  - WAVE analysed the rendered DOM "after scripting and styles were applied."
  - "Errors" are WAVE-detected barriers with a "very high likelihood of being WCAG 2.2 Level A/AA conformance failures."
- **Caveats in WebAIM's own words:**
  - "not all conformance failures can be automatically detected."
  - "Absence of detected errors does not indicate that a page is accessible or conformant."
  - Full conformance is "certainly lower than 4.1%."
  - On technologies: "correspondence of additional errors with a technology cannot always be attributed to that technology."
- **Headline numbers:**
  - 95.9% of home pages had detected WCAG 2 failures, up from 94.8% in 2025.
  - 56,114,377 errors, or 56.1 per page (up 10.1%).
  - 1,437 elements per page on average (up 14.3%). 3.9% of elements had an error.
  - 20.5% of pages had 5 or fewer errors.
- **The six most common failures (share of home pages):** low contrast text 83.9%, missing alt text 53.1%, missing form labels 51%, empty links 46.3%, empty buttons 30.6%, missing document language 13.5%. "96% of all errors detected fall into these six categories." These have been the same six for seven years.
- **Other details:**
  - 34 low-contrast instances per page.
  - 16.2% of images (10.8 per page) had no alt. 10.8% of alt texts were questionable or repetitive.
  - 33.1% of 6.9 inputs per page were unlabelled.
  - 18.1% of pages had more than one `<h1>`. Skipped heading levels appeared on 41.8% of pages.
  - 17.1% of pages had a skip link, and one in ten skip links was broken.
  - 15.2% had ambiguous link text.
  - 5.7% had `role="menu"`, and 22% of those menus introduced barriers.
- **WebAIM's interpretation:** these trends "likely reflect" third-party frameworks and "automated or AI-assisted coding practices (“vibe coding”)." That is speculation in the conclusion, not a measured finding.
- **For the post (my analysis):**
  - Five of the six top failure types are markup facts that source-level rules target: alt text, labels, empty links, empty buttons and `lang`.
  - Contrast is the sixth, and a linter can't see it. At 34 instances against 56.1 errors per page, contrast is about 61% of detected error instances (my arithmetic, assuming both counts are "distinct" in the same sense).

### 3.2 WebAIM Million trend, 2019–2026 (WebAIM). VERIFIED

- **Citation:** archived editions at https://webaim.org/projects/million/2019 through /2025 (each opened 2026-10-15), plus the 2026 edition. Data were collected in February each year. Last-updated stamps run from Feb 27, 2019 to Mar 30, 2026.
- **Headline series:**

  | Year | Pages with detected WCAG failures | Errors/page | Total errors | Elements/page | Sample source |
  | --- | --- | --- | --- | --- | --- |
  | 2019 | 97.8% | 59.6 | 59,653,607 | 782 | Majestic Million + Open PageRank |
  | 2020 | 98.1% | 60.9 | 60,909,278 | 864 | Majestic + Open PageRank + Alexa |
  | 2021 | 97.4% | 51.4 | 51,379,694 | 887 | Majestic + Open PageRank + Alexa |
  | 2022 | 96.8% | 50.8 | 50,829,406 | 955 | Majestic + Alexa + DomCop |
  | 2023 | 96.3% | 50.0 | 49,991,225 | 1,050 | Majestic + Alexa + DomCop |
  | 2024 | 95.9% | 56.8 | 56,791,260 | 1,173 | Tranco |
  | 2025 | 94.8% | 51.0 | 50,960,288 | 1,257 | Tranco |
  | 2026 | 95.9% | 56.1 | 56,114,377 | 1,437 | Tranco |

- **Top six failures over time** (share of home pages, from the 2026 table):

  | Failure | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | Low contrast text | 85.3% | 86.3% | 86.4% | 83.9% | 83.6% | 81% | 79.1% | 83.9% |
  | Missing alt text | 68% | 66% | 60.6% | 55.4% | 58.2% | 54.5% | 55.5% | 53.1% |
  | Missing labels | 52.8% | 53.8% | 54.4% | 46.1% | 45.9% | 48.6% | 48.2% | 51% |
  | Empty links | 58.1% | 59.9% | 51.3% | 49.7% | 50.1% | 44.6% | 45.4% | 46.3% |
  | Empty buttons | 25% | 28.7% | 26.9% | 27.2% | 27.5% | 28.2% | 29.6% | 30.6% |
  | Missing language | 33.1% | 28% | 28.9% | 22.3% | 18.6% | 17.1% | 15.8% | 13.5% |

- **The 2019 caveat:** actual conformance is "perhaps below 1%."
- **Caveats:** the sample source changed three times (Majestic, then adding Alexa and DomCop, then Tranco from 2024), and pages roughly doubled in size. Year-to-year moves of a point or two aren't clean trends.

### 3.3 WebAIM Million: ARIA findings, 2019–2026 (WebAIM). VERIFIED

- **Citation:** as 3.2.
- **Findings by year:**
  - **2019:** 60.1% of pages had ARIA, and 22.3 million elements had ARIA attributes. Pages with ARIA had "26.7 more detectable errors," and there was a "moderate correlation" between ARIA count and errors.
  - **2020:** 64.6% used ARIA (excluding landmark roles). "Home pages with ARIA present averaged 60% more errors than those without!" (+26.2). That gap did not hold on interior pages.
  - **2021:** 68.1% used ARIA, with about 48 attributes per page. Pages had 41% more errors (+24).
  - **2022:** 74.6% used ARIA, with about 60 per page. Pages had 70% more errors (+23).
  - **2023:** 80% used ARIA, with about 77 per page. Pages had 68.6% more errors (+22).
  - **2024:** 74.6% used ARIA (the Tranco switch year), with 89 per page. Pages had 34.2% more errors (+15).
  - **2025:** 79.4% used ARIA, with about 106 per page. Pages had "over twice as many errors" (57 vs 27, +30).
  - **2026:** 82.7% used ARIA, with 133.6 per page, "over 6 times higher" than 2019. Pages averaged 59.1 errors against 42 without ARIA, "an additional 17 potential barriers" (about 41% more, my arithmetic). Pages also averaged 23.3 `aria-hidden="true"`, 4.8 `role="button"` and 30.4 `tabindex` 0/−1.
- **WebAIM's caveat (every year since 2021):** it "does not necessarily mean that ARIA introduced these errors," since those pages are also more complex.
- **For the post:** a correlation, consistent over eight years, that fits "use semantic elements instead of divs with roles." Don't present it as causal.

### 3.4 WebAIM Million: frameworks and libraries (WebAIM 2019–2026). VERIFIED

- **Citation:** as 3.2. Each row is the average errors per page, with the % difference from that year's overall average.
- **JavaScript frameworks:**
  - **2019:** React 65.5 (+10.1%), Vue.js 73.7 (+23.7%), Angular 70.9 (+19.2%). Apart from MooTools and TweenMax, "the adoption of any of these frameworks is aligned with additional accessibility errors."
  - **2020:** React 64.4 (+5.7%), Vue.js 76.2 (+25.0%). Angular wasn't listed, but averaged 53.7 errors.
  - **2021:** React 50.4 (−1.9%). WebAIM notes React "saw notable decreases in detected errors." Vue.js 67.3 (+31.1%), Angular 64.9 (+26.4%).
  - **2022:** React 50.8 (−0.1%), Angular 50.7 (−0.3%), AngularJS 58.4 (+14.9%), Vue.js 63.4 (+24.8%).
  - **2023:** React 47.0 (−5.9%), Angular 48.1 (−3.8%), Nuxt.js 52.2 (+4.4%), Vue.js 60.5 (+20.9%).
  - **2024:** Next.js 41.4 (−27.1%), Nuxt.js 42.4 (−25.3%), React 50.1 (−11.7%), AngularJS 60.7 (+6.9%), Vue.js 62.3 (+9.7%).
  - **2025:** AngularJS 37.7 (−26.0%), Next.js 38.6 (−24.2%), React 42.4 (−16.8%), Nuxt.js 45.2 (−11.2%), Vue.js 58.7 (+15.3%), Angular 70.7 (+38.8%).
  - **2026:** Astro 9.0 (−84.0%), Next.js 40.9 (−27.1%), React 43.5 (−22.5%), Nuxt.js 54.7 (−2.6%), Vue.js 64.6 (+15.1%), AngularJS 76.6 (+36.4%).
- **2026 libraries and platforms:**
  - jQuery is on 560,294 pages and averages 64.9 (+15.7%). Bootstrap averages 63.3 (+12.8%).
  - Shopify +33.9% and Prestashop +155.3%. The "Government" category is −24.4%, and the `.gov` TLD −67.1%.
  - Nearly all popular JavaScript libraries were "associated with an increase in detected accessibility errors."
- **Caveats:**
  - Detection is by technology fingerprinting, so a page can count under several frameworks.
  - The rows swing a lot: AngularJS went from −26.0% to +36.4% in one year.
  - Astro's −84% probably reflects what kinds of sites use Astro (my analysis, not WebAIM's).
  - WebAIM: correspondence "cannot always be attributed to that technology."

### 3.5 Lazar and Gifford, "Accessibility" (HTTP Archive Web Almanac 2025). VERIFIED

- **Citation:** Bogdan Lazar and Mike Gifford (authors); reviewed by Hidde de Vries, Aidan Tierney and Scott Davis; analysed by Mike Gifford and Barry Pollard. _Web Almanac 2025_, chapter 6. Published 2026-01-15, last updated 2026-01-17. https://almanac.httparchive.org/en/2025/accessibility. There is no 2026 edition yet (the /en/2026/ URL returns 404 as of 2026-10-15).
- **Method** (methodology page https://almanac.httparchive.org/en/2025/methodology):
  - July 2025 crawl of 16,213,084 websites: 15,426,398 mobile and 12,155,374 desktop. URLs come from the Chrome UX Report (June 2025 visits).
  - Home and secondary pages, run through Lighthouse, which uses axe-core.
  - Automated tests "can only partially check a subset of WCAG Success Criteria." "A perfect score doesn’t guarantee full accessibility."
- **Headline numbers (2025):**
  - Median Lighthouse accessibility score 85%. The series runs 83% (2019), 80% (2020), 82% (2021), 83% (2022), 84% (2024), 85% (2025).
  - Sites passing colour contrast: 30% (figure). The text says "only 31% of mobile sites."
  - Valid `lang`: about 86% of sites.
  - Zoom restricted: 19% of mobile and 21% of desktop sites.
  - Focus: "67% of sites explicitly removed default focus outlines, up 14% from 2024." `:focus-visible` is used on 25% (desktop) and 24% (mobile).
  - Positive `tabindex`: 3.7% (desktop) and 3.4% (mobile). `tabindex` in general: about 50%.
  - `<main>` (element or role): 47%. Correct heading order (mobile): 59%.
  - Skip links: about 24% in the text, against 25.65% (desktop) and 26.23% (mobile) in figure 6.13.
  - `<title>`: 98%.
  - Input accessible names: 34–35% from `<label>`, about 25% from placeholder only, and 24.65% (desktop) / 24.93% (mobile) none at all.
  - Images passing the Lighthouse alt audit: 69%. 13–14% of images have no `alt` and 30% have empty `alt`. About 8.5% of alt texts end in a file extension.
  - ARIA roles: `button` on 53–54% of pages, `presentation` on 42%, `dialog` on 34–36%. `aria-label` on 70% (desktop).
  - The chapter reads the rise in `role="button"` as divs or spans given roles, or redundant roles on `<button>`.
  - Overlays: about 2% of desktop sites (2.1%) and 1.8% of mobile, rising from 1.0% in 2021. Only 0.2% among the top 1,000 sites.
- **Frameworks** (average Lighthouse accessibility score):
  - Qwik 91.86%, Stimulus 91.42%, OpenUI5 90.23%, Astro 89.22%, Next.js 88.05%, Remix 87.61%, React 87.56%, Ember.js 86.72%, Alpine.js 85.91%, Angular 85.63%, Preact 85.28%.
  - Meta-frameworks: RedwoodJS 92.38%, Astro, Gatsby 88.20%, Next.js and Remix. Nuxt.js and others run from 84.52% down to 79.91% (Meteor).
  - The authors flag "volatility" from sample-size changes.
- **Conclusions:**
  - "automation is necessary but insufficient."
  - "Heading hierarchy can be audited, but semantic meaningfulness requires human judgment."
  - Contrast, link naming, heading hierarchy and alt text "remain the top four issues across nearly every platform and framework."
- **Caveats:**
  - Lighthouse scores are weighted pass rates, not error counts, so they aren't comparable with WebAIM.
  - Year-on-year deltas are often "up 14%" style, which could be relative or absolute. The chapter doesn't say.
  - In two places the text and figures disagree (contrast, skip links).
  - The chapter's summary of GDS ("they all detect less than 50%") is slightly off: FAE reached 50% with prompts (2.2).

### 3.6 Gifford, "Accessibility" (HTTP Archive Web Almanac 2024). VERIFIED

- **Citation:** Mike Gifford. _Web Almanac 2024_, chapter 8. Published 2024-11-11, last updated 2026-01-21. https://almanac.httparchive.org/en/2024/accessibility (there was no 2023 edition).
- **What it says:**
  - The median Lighthouse accessibility score rose to 84%.
  - Mobile sites with sufficient contrast: 22% (2019), 21% (2020), 22% (2021), 23% (2022), 29% (2024).
  - "In WCAG 2.2, the 4.1.1 Success criteria was removed." Deque then removed `duplicate-id` and `duplicate-id-active` from axe, which affects comparisons with earlier years.
  - Frameworks: Stimulus 91%, Remix 89%, Qwik 89%, Astro 89%, Next.js 87%, React 87%, Svelte 85%.
- **For the post:** use it only for the 4.1.1 note and the contrast series.

### 3.7 WebAIM, "Screen Reader User Survey #10 Results" (2024) and "#11" (2026). VERIFIED

- **Citation:**
  - #10: WebAIM, survey Dec 2023–Jan 2024, 1,539 valid responses, "Last updated: Feb 22, 2024." https://webaim.org/projects/screenreadersurvey10/
  - #11: survey Jul–Aug 2026, 1,780 valid responses, "Last updated: Sep 29, 2026." https://webaim.org/projects/screenreadersurvey11/
- **Most problematic items (#10, weighted ranking):**
  1. CAPTCHA
  2. "Interactive elements like menus, tabs, and dialogs do not behave as expected"
  3. "Links or buttons that do not make sense"
  4. Screens that change unexpectedly
  5. Lack of keyboard accessibility
  6. Images with missing or improper alt text
  7. Complex forms
  8. Missing or improper headings
  - The order is "largely unchanged over the last 14 years."
- **#11 (2026):**
  - Asked whether the web improved over the past year: 32.2% said more accessible, 44.9% unchanged and 22.9% less accessible.
  - 83.9% think better websites would help more than better assistive technology.
  - 60.1% use AI to generate image descriptions.
  - #11's contents don't include the "problematic items" question.
- **Caveats:** a self-selected sample ("not controlled"). Weighted ranks, not frequencies.

---

## 4. Research on developers and accessibility

**Why accessibility gets skipped: practitioner studies**

### 4.1 Bi, Xia, Lo, Grundy, Zimmermann, Ford, "Accessibility in Software Practice: A Practitioner's Perspective" (ACM TOSEM 2022). VERIFIED

- **Citation:** Tingting Bi, Xin Xia, David Lo, John Grundy, Thomas Zimmermann, Denae Ford. _ACM Transactions on Software Engineering and Methodology_ 31(4):1–26, 2022 (Crossref issued 28 Jul 2022). https://doi.org/10.1145/3503508. Preprint: https://arxiv.org/abs/2103.08778 (v1, 16 Mar 2021). I read the arXiv v1 full text, not the published version.
- **Method:** 15 semi-structured interviews (30 minutes each) with practitioners from Alibaba, Hengtian and Microsoft, averaging 9 years' experience. These produced 44 statements in eight topics. A survey then scored the statements on a 5-point Likert scale: 365 valid responses from 26 countries, mostly China (177) and the US (105). 262 respondents worked in teams under 20 people.
- **What it found:**
  - Barriers are mostly organisational. Finding 3 lists "lack of appropriate group resources, available expertise, time, budget and support." Mean agreement was 4.05 for "Accessibility has lack of demand in the industry", 4.10 for "Accessibility requirements are an expensive addition for the system", and 4.00 for "Not a core requirement for the project".
  - Accessibility comes late. Finding 5: "Many projects have to be refactored over many iterations" after release.
  - Tools: "Automatic testing tools are useful" scored 4.19, and "No single tool can determine if a site or project meets accessibility guidelines" scored 4.17. Only 34% agreed they "used a set of tools and checklists" to evaluate accessibility.
  - One designer (I10) put the false sense of safety this way: "The framework we’re using takes care of it for us." The same interviewee warned that a passing automated test may be "passing by omission, not because it’s actually accessible." I10 also called free online checkers inconvenient, with "false positives."
  - Linters, ESLint, axe and Lighthouse are never mentioned (grep of the full text). The only accessibility tools it names are "Anywhere" (a screen reader) and "Hera."
- **Caveats:** Two co-authors were at Microsoft Research. The sample skews to China and to small teams. The paper reports Likert means, not effect sizes, and the 44 statements came from 15 interviews.
- **For the post:** the best general-purpose practitioner study. Use it for "accessibility is postponed and then retrofitted" and for the "no single tool" consensus.

### 4.2 Patel, Breton, Baker, El-Glaly, Shinohara, "Why Software is Not Accessible: Technology Professionals' Perspectives and Challenges" (CHI EA 2020). VERIFIED (metadata + abstract)

- **Citation:** _Extended Abstracts of the 2020 CHI Conference on Human Factors in Computing Systems_, pp. 1–9. https://doi.org/10.1145/3334480.3383103. ACM DL returned 403, so I read the abstract via OpenAlex.
- **What it says:** a survey (77 responses) and 10 follow-up interviews. "formal education inadequately prepared them to handle accessibility challenges." Other reasons were "inadequate accessibility tools and resources" and not accounting for "retroactive changes in project timelines."
- **Caveats:** an extended abstract (late-breaking work), not a full paper. I didn't see the numbers behind the findings.

### 4.3 Leite, Scatalon, Freire, Eler, "Accessibility in the mobile development industry in Brazil: Awareness, knowledge, adoption, motivations and barriers" (JSS 2021). VERIFIED (metadata + abstract)

- **Citation:** _Journal of Systems and Software_ 177:110942, July 2021. https://doi.org/10.1016/j.jss.2021.110942 (hybrid OA per OpenAlex; full text not opened).
- **What it says:** a survey of 872 people in Brazilian mobile development. Most had "moderate accessibility awareness, but low levels of knowledge or adoption in practice." The abstract says "accessibility is usually not considered in their projects" due to "lack of requirements, time, training and focus on users with disabilities."
- **For the post:** the largest practitioner sample found. This is probably the lead given to me as "Leite et al., A Survey of Accessibility in Software Development"; that exact title doesn't exist.

### 4.4 Miranda, Araujo, "Studying industry practices of accessibility requirements in agile development" (ACM SAC 2022). VERIFIED (metadata + abstract)

- **Citation:** _Proceedings of the 37th ACM/SIGAPP Symposium on Applied Computing_, pp. 1309–1317. https://doi.org/10.1145/3477314.3507041.
- **What it says:** an online survey of 13 companies doing agile web development. Most participants had only basic web accessibility knowledge and didn't know the guidelines. The survey "reveals that accessibility is not a priority item by the companies," and "no specific methods or tools assist teams in this process." Lack of training and lack of customer demand were the main reasons.
- **Caveats:** 13 companies. Small.

### 4.5 Parthasarathy, Joshi, "Exploring the Need of Accessibility Education in the Software Industry: Insights from a Survey of Software Professionals in India" (ICSE-SEET 2024). VERIFIED

- **Citation:** P. D. Parthasarathy, Swaroop Joshi. _ICSE-SEET '24_, pp. 212–220. https://doi.org/10.1145/3639474.3640079. Full text: https://arxiv.org/abs/2401.00451.
- **What it found:**
  - 269 respondents, recruited from 14,339 alumni emails, February–March 2023. 39.8% rated their accessibility skill 1 or 2 out of 5.
  - Only 12 (4.4%) had ever held an accessibility-related role, and only 105 (39%) practised accessibility at all.
  - Of those 105, 31.4% did no accessibility testing and 21.9% outsourced it. 27.5% weren't sure when in the lifecycle accessibility was considered.
  - 69.9% asked for training materials, workshops and bootcamps. "Improved tools and Processes" was named by 6.79%.
- **For the post:** "tools" rank far below "education" in what practitioners ask for, which fits a linter as a teaching tool more than a gate.

### 4.6 Indika, Kazman, Peruma, "Practitioner Views on Mobile App Accessibility: Practices and Challenges" (ICSE 2026). VERIFIED

- **Citation:** _ICSE '26_, pp. 2697–2709. https://doi.org/10.1145/3744916.3787791. Preprint: https://arxiv.org/abs/2601.14131.
- **What it found:**
  - A mixed-methods survey of 110 mobile developers in 43 countries. Invitations went to the 720 people who accepted the authors' 900 connection requests; the platform isn't named in the passages I read. Developers "typically perform compliance testing late in the development process."
  - iOS respondents: 61 used manual inspection, 33 automated tools, and 7 did no formal testing. Android respondents: 65 manual, 36 automated, 10 none.
  - "only 9.8% involve users with disabilities in the process."
- **Caveats:** mobile only. Platform counts overlap, since some respondents build for both.

### 4.7 WebAIM, "Survey of Web Accessibility Practitioners #3 Results" (January 2021). VERIFIED

- **Citation:** WebAIM (Utah State University), https://webaim.org/projects/practitionersurvey3/ (checked 15 Oct 2026). This is the latest edition. Earlier ones ran April 2014 and April 2018, and `practitionersurvey4/` returns 404.
- **Sample:** 758 valid responses, 62.8% North America. 47.5% were accessibility experts, consultants or leads, and 25.7% developers. WebAIM: "The sample was not controlled."
- **Tools ("commonly use for testing"):** aXe or aXe plugins 64.0%, browser DevTools 63.9%, WAVE extensions 53.0%, bookmarklets 40.1%, Lighthouse 34.6%, Accessibility Insights 21.2%, and 19 more, plus "Other" 21.8%. **No linter appears among the response options.** "Nearly all respondents indicated using multiple tools."
- **How much automation finds:** the modal answer was 20%–30% of issues (34.7%). "Only 17.6%" think 50% or more can be detected automatically.
- **ARIA:** 75.8% say ARIA made the web more accessible and 9.7% less, up from 3.7% in 2018. Respondents with disabilities and more experienced respondents were more likely to say "less."
- **Overlays:** 67% rate overlays not very or not at all effective (32.0% + 37.0%, n = 676). Among respondents with disabilities it was 72%, and only 2.4% rated them very effective.
- **Motivation:** 86.0% are personally motivated by "Moral motivation." Their organisations' motivation is spread across morals (25.3%), legal requirements (23.6%), compliance (22.9%) and fear of a lawsuit (11.0%).
- **Caveats:** a self-selected sample of specialists, not of developers in general. It is five years old.
- **For the post:** the clean way to say that practitioners trust browser-based axe and WAVE but don't think of linters as accessibility testing tools at all.

**Mobile apps: mining plus developer surveys**

### 4.8 Alshayban, Ahmed, Malek, "Accessibility Issues in Android Apps: State of Affairs, Sentiments, and Ways Forward" (ICSE 2020). VERIFIED

- **Citation:** Abdulaziz Alshayban, Iftekhar Ahmed, Sam Malek. _ICSE '20_, pp. 1323–1334. https://doi.org/10.1145/3377811.3380392. Full text: https://par.nsf.gov/servlets/purl/10179940.
- **Apps:**
  - 1,135 apps after filtering, from 1,500 top free Google Play apps plus 200 more by the same developers, in 33 categories. Each ran 30 minutes under Monkey with a custom checker built on Google's Accessibility Testing Framework.
  - Mean "inaccessibility rate" (the share of eligible UI elements with an issue) was 6.04% (SD 2.42%). The commonest issues were TextContrast (22.81%), TouchTargetSize (19.78%), ImageContrast (12.85%) and SpeakableText (11.08%).
  - 5 of 10 Android Studio templates had issues.
  - Over 60 apps and 181 versions, 47% of updates improved accessibility, 28% made it worse and 25% left it unchanged.
- **Survey:** 740 emails to F-Droid developers, 66 responses (8.9%), 61 used, from 18 countries, averaging 3.11 years' experience. Reported challenges (Table 3):

  | Challenge                        | Share  |
  | -------------------------------- | ------ |
  | Lack of awareness                | 48.53% |
  | Additional cost                  | 16.50% |
  | Lack of management support       | 15.53% |
  | Lack of tools                    | 9.70%  |
  | Lack of standards and guidelines | 8.73%  |

  23 of 32 paid developers had no accessibility evaluation in their process. 27 said accessibility isn't treated as importantly as qualities like security.

- **On lint:**
  - "all of our survey respondents mentioned using Lint."
  - Lint "only provides support for detection of one type of accessibility issue."
  - The authors argue that "more comprehensive checks in the build process of IDEs" could stop issues creeping in.
  - Also: "None of the current accessibility analysis tools consider context."
- **Caveats:** the brief asked about awareness of Android Lint and Accessibility Scanner, but the paper gives no per-tool awareness percentage. The 47% "improving" result is disputed by Chen et al. (4.11). App ratings showed no strong association with accessibility.

### 4.9 Vendome, Solano, Liñán, Linares-Vásquez, "Can Everyone use my app? An Empirical Study on Accessibility in Android Apps" (ICSME 2019). VERIFIED

- **Citation:** Christopher Vendome, Diana Solano, Santiago Liñán, Mario Linares-Vásquez. _ICSME 2019_, pp. 41–52. https://doi.org/10.1109/ICSME.2019.00014. The author's copy (mustang.cec.miamioh.edu) refused connections, so I read it from the Wayback snapshot of 24 Apr 2025.
- **Mining:**
  - Of 13,817 GitHub Android apps, only 288 (2.08%) imported any accessibility API, so "over 97%" don't use any.
  - 6,920 apps (50.08%) had content descriptions on all GUI components. 6,390 (46.25%) left at least half empty, and 5,107 left all of them empty.
- **Stack Overflow:** 810 accessibility discussions found. A sample of 366 was open-coded into a 58-category taxonomy. About 36% were about using accessibility APIs for non-accessibility purposes, such as key-loggers and notification readers.
- **On lint:**
  - Lint warns about missing content descriptions, but some threads show developers "do not know the relation between assistive content and some GUI attributes." They "want to just remove the warnings when displayed by the IDE."
  - At the same time, "when developers are made aware of accessibility issues," they "are inclined to learn more."
  - Actionable result: automated checks "should be integrated within the IDE."
- **Caveats:** open-source GitHub apps. Static analysis only, and it didn't judge the quality of descriptions. Alshayban's reference list garbles the author order. Crossref has the order above.
- **For the post:** the clearest primary evidence that a lint warning both teaches and invites suppression.

### 4.10 Di Gregorio, Di Nucci, Palomba, Vitiello, "The making of accessible Android applications: an empirical study on the state of the practice" (Empirical Software Engineering 2022). VERIFIED

- **Citation:** Marianna Di Gregorio, Dario Di Nucci, Fabio Palomba, Giuliana Vitiello. _Empirical Software Engineering_ 27(6):145, 2022. https://doi.org/10.1007/s10664-022-10182-x. Open access (CC BY). Full text read via Europe PMC (PMC9356958). It began as a registered report at ICSME 2020.
- **What it found:**
  - Manual testing of 50 top-rated open-source apps (AndroidTimeMachine) against 54 guidelines in 11 categories: "only 41% of the guidelines are actually applied." The abstract: "most accessibility guidelines are ignored when developing mobile apps."
  - Survey of 75 developers (60% high programming experience): "77% of the respondents do not use tools." The rest used Accessibility Scanner, the Play pre-launch report or beta tests with users. Three said tools "provide minimal information."
- **Caveats:** the paper's 77% + 13% doesn't sum to 100. The text says "The remaining 13%", so treat the split as approximate.
- **Lead correction:** the venue is EMSE, not TACCESS or JSS.

### 4.11 Chen, Chen, Fan, Fan, Zhan, Liu, "Accessible or Not? An Empirical Investigation of Android App Accessibility" (IEEE TSE 2022). VERIFIED

- **Citation:** Sen Chen, Chunyang Chen, Lingling Fan, Mingming Fan, Xian Zhan, Yang Liu. _IEEE Transactions on Software Engineering_ 48(10):3954–3968, 2022 (online 2021). https://doi.org/10.1109/TSE.2021.3108162. Full text: https://arxiv.org/abs/2203.06422.
- **What it found:**
  - 86,767 issues from 2,270 apps, found by their Xbot explorer (about 80% activity coverage). 89% of apps had severe problems, averaging 43 issues per app and 6.5 per page.
  - On fixing, they re-scanned the latest 3 versions of 70 apps (210 versions) and found "most of the accessibility issues remain unfixed (96%)."
  - On Alshayban's 37-app, 92-version dataset, issue counts were unchanged in 21 apps (56.76%) and grew in 10 (27.03%).
  - They attribute Alshayban's 47% to Monkey's "unsteady activity coverage."
  - They also call static rule checkers like Lint "ineffective and time-consuming" for mobile, citing earlier work.
- **For the post:** the strongest evidence that, once shipped, accessibility defects stay. That is the case for catching them before merge.

### 4.12 Yan, Ramachandran, "The Current Status of Accessibility in Mobile Apps" (ACM TACCESS 2019). VERIFIED (metadata + abstract); Vendor

- **Citation:** Shunguo Yan, P. G. Ramachandran (both IBM Accessibility Research, Austin). _ACM Transactions on Accessible Computing_ 12(1):1–31, 2019. https://doi.org/10.1145/3300176.
- **What it says:**
  - 479 Android apps in 23 business categories were checked with IBM's Mobile Accessibility Checker. 94.8% had violations, 97.5% potential violations and 66.4% warnings.
  - Five widget types created 92% of GUI elements and caused most of the issues.
  - The authors estimate MAC "identified about 67% of accessibility issues."
- **Caveats:** IBM authors evaluating an IBM tool, including its own coverage estimate. Closed access; abstract only.

**GitHub issues**

### 4.13 Bi, Xia, Lo, Aleti, "A First Look at Accessibility Issues in Popular GitHub Projects" (ICSME 2021). VERIFIED

- **Citation:** Tingting Bi, Xin Xia, David Lo, Aldeida Aleti. _ICSME 2021_, pp. 390–401. https://doi.org/10.1109/ICSME52107.2021.00041. Author PDF: https://xin-xia.github.io/publication/icsme211.pdf.
- **Method:** searched issues in 1,000 popular repositories for "accessibility" (the term, or the "Accessibility" label), then checked them manually (two collectors, kappa 0.79). That gave 11,820 issues and their threads.
- **What it found:**
  - 708 projects (about 70%) had accessibility issues, and 61.2% of issues concern UI design.
  - On causes: "85% of the accessibility issues occur because of developers’ lack of accessibility relevant knowledge." About 28% were tied to architecture or design patterns, where accessibility was "postponed" or "dropped" near the end of a project.
  - Top tools mentioned: Accessibility Checker (102), Accessibility Checklist (65), Accessibility View (49), "A11Y" (34) and Accessibility Scanner (12). **No linter, axe or Lighthouse appears** (grep of the full text).
- **Caveats:** the 85% is the authors' coding of causes from issue threads, and the method behind it is thin. The search term "accessibility" misses issues titled "a11y" only. The tool list mixes Windows, Android and web tools.
- **For the post:** good for "about 70% of popular projects have accessibility issues on file." Use the 85% causal claim with care.

**Linters: what is known (and not)**

### 4.14 Tómasdóttir, Aniche, van Deursen, "Why and How JavaScript Developers Use Linters" (ASE 2017) and "The Adoption of JavaScript Linters in Practice: A Case Study on ESLint" (IEEE TSE 2020). VERIFIED

- **Citations:**
  - ASE: Kristín Fjóla Tómasdóttir, Maurício Aniche, Arie van Deursen. _ASE 2017_, pp. 578–589. https://doi.org/10.1109/ASE.2017.8115668. Author copy: https://pure.tudelft.nl/ws/portalfiles/portal/26024522/ase2017.pdf.
  - TSE: _IEEE Transactions on Software Engineering_ 46(8):863–891, 2020 (early access 2018, hence "TSE 2018" in some citations). https://doi.org/10.1109/TSE.2018.2871058. Author copy: https://pure.tudelft.nl/ws/files/46810031/tse_js.pdf.
- **What they found:** 15 interviews with maintainers of top-120 JS projects (ASE), plus 9,548 ESLint configurations (GHTorrent, April 2017) and 337 survey responses (TSE). Reasons for linting include:
  - fast feedback: a contributor "receives much faster feedback from a linter than from a person";
  - avoiding code-style review;
  - sparing feelings: "because it’s not personal";
  - teaching newcomers: "leveling the playing field."
- **On accessibility:** neither paper mentions accessibility, a11y or jsx-a11y (grep of both full texts). They don't analyse plugin rules.
- **My inference (not in the paper):**
  - Table 7 shows 1,166 projects extending the `airbnb` preset: 16.7% of presets used, and 12.2% of all 9,548 projects.
  - `eslint-config-airbnb` has listed `eslint-plugin-jsx-a11y` as a peer dependency since v9.0.0 (7 May 2016). Its entry point extends `./rules/react-a11y` (checked at tag v15.0.0, May 2017, and on the current main branch).
  - So in 2017 roughly one in eight sampled ESLint projects ran jsx-a11y rules through a preset, and no study looked at them.
- **For the post:** the linter-use literature gives the "why lint" reasons. Its silence on accessibility is itself a finding.

### 4.15 Adoption counts for accessibility linting and testing packages (npm, deps.dev, GitHub; checked 15 Oct 2026). VERIFIED

- **Sources:** `https://api.npmjs.org/downloads/point/last-week/<pkg>` (week 2026-10-06 to 2026-10-12); deps.dev `v3alpha …/versions/6.10.2:dependents`; GitHub's dependents page; the npm registry.
- **Weekly downloads:**

  | Package                                  | Weekly downloads |
  | ---------------------------------------- | ---------------- |
  | `eslint`                                 | 158,743,826      |
  | `eslint-plugin-react`                    | 62,636,758       |
  | `eslint-plugin-jsx-a11y`                 | 50,165,457       |
  | `eslint-config-next`                     | 36,085,987       |
  | `eslint-config-react-app`                | 3,607,682        |
  | `eslint-config-airbnb`                   | 2,899,871        |
  | `eslint-plugin-jsx-a11y-x` (fork)        | 176,036          |
  | `eslint-plugin-vue`                      | 6,693,042        |
  | `eslint-plugin-vuejs-accessibility`      | 567,093          |
  | `@angular-eslint/eslint-plugin-template` | 3,501,832        |
  | `eslint-plugin-svelte`                   | 1,716,693        |
  | `axe-core`                               | 79,734,817       |
  | `@axe-core/playwright`                   | 14,281,826       |
  | `@playwright/test`                       | 76,227,910       |
  | `jest-axe`                               | 2,704,260        |
  | `jest`                                   | 46,829,919       |
  | `vitest-axe`                             | 1,669,672        |
  | `@axe-core/react`                        | 730,003          |
  | `cypress-axe`                            | 703,813          |
  | `@lhci/cli`                              | 1,856,318        |
  | `pa11y`                                  | 257,460          |
  | `lighthouse`                             | 5,404,521        |

- **Ratios (my arithmetic):**
  - jsx-a11y / eslint ≈ 32%
  - vuejs-accessibility / eslint-plugin-vue ≈ 8.5%
  - @axe-core/playwright / @playwright/test ≈ 19%
  - jest-axe / jest ≈ 6%
- **Dependents:**
  - deps.dev lists 60,680 npm packages depending on `eslint-plugin-jsx-a11y@6.10.2`: 7,522 direct and 53,501 indirect.
  - GitHub's dependency graph lists 15,633,537 repositories and 84,195 packages. I didn't check how GitHub counts transitive or lockfile-only dependencies, so treat that as an upper bound.
  - The plugin was first published 29 Feb 2016 (repo created 17 Feb 2016). The latest release is 6.10.2 (26 Oct 2024). The repo has 3,624 stars and 143 open issues.
- **Caveats:**
  - Downloads count CI installs and transitive pulls, not projects or people.
  - `axe-core` is inflated by `lighthouse` (depends on `axe-core ^4.13.0`) and by `@axe-core/playwright` (`~4.14.0`).
  - `eslint-plugin-jsx-a11y` is inflated by `eslint-config-next` and `eslint-config-react-app`, which depend on it directly (4.16).
- **For the post:** jsx-a11y is installed nearly everywhere React is linted, mostly because a framework preset put it there.

### 4.16 What the popular presets actually turn on (package source, checked 15 Oct 2026). VERIFIED

- **`eslint-config-next@16.4.2`** (`dist/index.js` via unpkg): depends on `eslint-plugin-jsx-a11y ^6.10.0` and enables six rules, all `warn`. They are `alt-text` (elements `img`, plus `Image` mapped to img), `aria-props`, `aria-proptypes`, `aria-unsupported-elements`, `role-has-required-aria-props` and `role-supports-aria-props`.
- **`eslint-config-react-app@7.0.1`** (12 Apr 2022, the Create React App config): depends on `^6.5.1` and references about 17 jsx-a11y rules, all at `warn`.
- **`eslint-config-airbnb@19.0.4`:** peer dependency `^6.5.1`, extends `./rules/react-a11y`.
- **For the post:** most React developers who "have jsx-a11y" have a handful of warnings, not the recommended or strict set. Warnings are easy to ignore, and nothing has measured whether they are.

### 4.17 eslint-plugin-jsx-a11y README on its own limits and defaults (checked 15 Oct 2026). VERIFIED

- **Source:** https://github.com/jsx-eslint/eslint-plugin-jsx-a11y (README via `gh api`).
- **What it says:** it does "a static evaluation of the JSX." Because "it only catches errors in static code," pair it with `@axe-core/react` and "always test your apps with assistive technology."
- **Rule defaults relevant to ARIA misuse:**
  - `no-static-element-interactions` ("visible elements (such as `<div>`) that have click handlers use the role attribute") is in both recommended and strict.
  - `prefer-tag-over-role` ("Enforces using semantic DOM elements over the ARIA `role` property") is in neither.
- **For the post:** the plugin admits the "partial check" framing itself. Its default path for a clickable `<div>` accepts `role="button"` (plus the keyboard rules) rather than requiring `<button>`. That is worth comparing with Ultracite's AGENTS.md line about semantic elements, which 6.12 and the preset notes take up.

### 4.18 Calì, Fulcini, Coppola, Laudadio, Torchiano, "A Prototype VS Code Extension to Improve Web Accessible Development" (arXiv 2025). VERIFIED

- **Citation:** Politecnico di Torino. https://arxiv.org/abs/2503.09673 (12 Mar 2025, 6 pages; no venue listed).
- **What it says:** it uses jsx-a11y for detection and an LLM for fixes. The plugin "can successfully identify accessibility issues" but alone gives "trivial and non-context-dependent suggestions" and is better at "simpler problems." The evaluation is two use cases on one React component, judged qualitatively by the authors.
- **For the post:** the only academic paper found that uses jsx-a11y, and it measures nothing about the plugin. Don't cite it as evidence of effectiveness.

### 4.19 Android Lint API guide on placeholder fixes (Google, checked 15 Oct 2026). VERIFIED; Vendor

- **Source:** https://googlesamples.github.io/android-custom-lint-rules/api-guide.html
- **What it says:** the accessibility check's quick fix sets the content-description attribute to `TODO` and selects it for typing. Check authors should "deliberately not accept “TODO” as a valid value." So lint's accessibility check complains both when the attribute is missing and when it is `TODO`.
- **For the post:** a concrete design answer to the "silence the warning" behaviour in 4.9. A lint rule can refuse the obvious placeholder, but not a meaningless real word.

**What rule-based checkers miss**

### 4.20 Salehnamadi, Alshayban, Lin, Ahmed, Branham, Malek, "Latte: Use-Case and Assistive-Service Driven Automated Accessibility Testing Framework for Android" (CHI 2021). VERIFIED

- **Citation:** _CHI '21_, pp. 1–11. https://doi.org/10.1145/3411764.3445455. PDF: https://www.ics.uci.edu/~seal/projects/latte/2021_CHI_Latte.pdf.
- **What it found:**
  - It reuses functional GUI tests and replays each use case through TalkBack and SwitchAccess: 20 apps, 50 test cases. Across the use cases, 39 in 19 apps failed with TalkBack and 11 in 6 apps failed with SwitchAccess, at 100% precision after manual verification.
  - Scanner reported 1,716 issues (about 34 per use case), but "only 18 were relevant to the serious accessibility failures reported by Latte."
  - The authors say developers "tend to either not utilize or simply ignore the results" of existing tools because of warning volume. They cite Alshayban for this.
- **Caveats:** the PDF's two-column layout extracts badly. The SwitchAccess and TalkBack counts above come from a garbled passage, so re-check them against the published version before quoting. The 1,716 and 18 figures are clear.

### 4.21 Salehnamadi, Mehralian, Malek, "Groundhog: An Automated Accessibility Crawler for Mobile Apps" (ASE 2022). VERIFIED

- **Citation:** _ASE '22_, pp. 1–12. https://doi.org/10.1145/3551349.3556905. PDF: https://seal.ics.uci.edu/publications/2022_ASE_Groundhog.pdf.
- **What it found:**
  - 57 apps (20 with over 10M installs, 20 from AndroZoo, 17 from Latte). A 150-state subset was manually checked: 293 true issues at 86% precision, with two-thirds of apps having elements TalkBack couldn't reach. It recalled 10 of Latte's 12 known issues (83%).
  - Against Google's Scanner: "there is no intersection between the type of issues each of them detects."
  - Citing prior work (its ref. 40, not checked), it says guidelines miss "about %50" of the issues users meet.
- **For the post:** rule-based checks and interaction-based checks find disjoint problems. Lint sits firmly in the first group.

### 4.22 Bajammal, Mesbah, "Semantic Web Accessibility Testing via Hierarchical Visual Analysis" (ICSE 2021). VERIFIED

- **Citation:** Mohammad Bajammal, Ali Mesbah (UBC). _ICSE 2021_, pp. 1610–1621. https://doi.org/10.1109/ICSE43902.2021.00143. PDF: https://people.ece.ubc.ca/amesbah/resources/papers/axeray-icse21.pdf.
- **What it says:**
  - Existing web tools "most only perform rudimentary syntactical checks." The paper's motivating example is a nav bar built from `<div>`s with obfuscated classes and no `role="navigation"`, and "there is no syntactic check that can automate the conclusion."
  - AXERAY infers regions and roles visually: grouping F1 87% and role F1 90% on 10 sites. Fault injection on the 30-site set caught about 77.5% of 71 removed landmarks. Several sites, some of them in the top 100, had no landmark roles at all to remove.
- **Caveats:**
  - It cites the UK GDS tool audit as finding "only %26" of known barriers. The GDS page (4.23) shows a best tool at 40% and a worst at 13%; 26% is about the mean of the 13 tools (my arithmetic: 341/13 = 26.2%).
  - The paper frames missing landmark roles as failures. Native `<nav>` would satisfy it too.
- **For the post:** a direct statement of what static rules can't see: whether markup matches visual meaning.

### 4.23 UK Government Digital Service, "Accessibility tool audit" (last updated 13 Apr 2018). VERIFIED

- **Source:** https://alphagov.github.io/accessibility-tool-audit/ (checked 15 Oct 2026).
- **What it says:** 142 deliberate barriers on one page, run through 13 tools. The best (SortSite) fully found 40% and the worst (Nu Html Checker) 13%; aXe found 29%. Counting "potential barriers" for human review, the best reached 50% (FAE).
- **See also:** 2.1 and 2.2, which cover the GDS audit in depth.

### 4.24 Mateus, Silva, De Oliveira, Costa, Freire, "A Systematic Mapping of Accessibility Problems Encountered on Websites and Mobile Apps" (Journal on Interactive Systems 2021). VERIFIED (metadata + abstract)

- **Citation:** _JIS_ 12(1):145–171, 2021. https://doi.org/10.5753/jis.2021.1778 (diamond OA; full text not opened).
- **What it says:** a meta-analysis of 38 problem types from 38 studies (304 screened). Automated evaluation covered "less than 40% of the types of problems found on websites" and "less than 20% on mobile apps." Many problems were found only with users.
- **Caveats:** these are problem types, not issue instances. It's not a detection rate.

**ARIA misuse in the wild**

### 4.25 Martins, Duarte, "A large-scale web accessibility analysis considering technology adoption" (Universal Access in the Information Society 2024). VERIFIED

- **Citation:** Beatriz Martins, Carlos Duarte. _UAIS_ 23(4):1857–1872 (online 6 Jul 2023). https://doi.org/10.1007/s10209-023-01010-0 (open access). Read from the Wayback snapshot of 27 Sep 2026 of the Springer HTML, because the Springer PDF redirected to a login cookie wall.
- **What it found:**
  - 2,884,498 pages from 166,311 sites (Common Crawl, Nov–Dec 2020), evaluated with QualWeb (ACT rules). That gave 86,644,426 errors, about 30 per page, and only 15,963 pages (under 1%) had none.
  - Name, Role, Value was violated on 68% of pages, and links without accessible names on 52%.
  - Info and Relationships was violated on about 24%, "mainly" from "improper use of ARIA roles and properties" and missing table relationships.
  - Duplicate IDs appeared on about 31% of pages.
  - On frameworks: the "JavaScript Frameworks" and "UI Frameworks" categories were associated with _better_ A3 scores than pages without them. (A3 is lower-is-better.) The paper doesn't break out React, Vue or Angular.
- **For the post:** the best peer-reviewed number for ARIA misuse at web scale.

### 4.26 HTTP Archive, Web Almanac 2025, "Accessibility" chapter (published 15 Jan 2026). VERIFIED

- **Citation:** Bogdan Lazar, Mike Gifford (authors). Reviewed by Hidde de Vries, Aidan Tierney and Scott Davis; analysed by Mike Gifford and Barry Pollard. https://almanac.httparchive.org/en/2025/accessibility (checked 15 Oct 2026). Data: HTTP Archive crawl of about 17 million sites with Lighthouse.
- **What it says:**
  - `role="button"` is on 53.06% of desktop and 53.56% of mobile pages, up about 4 points. The authors read this as "applying roles like button to non-semantic elements such as <div>" or redundant roles on `<button>`.
  - `aria-label` is on 68–70% of pages (the chapter also says "Nearly 66%" elsewhere). Buttons named only by `aria-label` are rising.
  - About 8.5% of alt texts end in file extensions.
  - Overlays are on 2.1% of desktop pages (up from 1.0% in 2021) and 0.2% of the top 1,000 sites.
- **Caveats:** the `role="button"` interpretation isn't measured. The chapter counts pages with the role, not the elements carrying it.
- **For the post:** use it as context for how often custom-role widgets exist, not as a misuse rate. Pair it with 4.25 for misuse. Cross-reference the WebAIM Million (3.3) for the "pages with ARIA have more errors" correlation.

**Overlays (short)**

### 4.27 FTC, In the Matter of accessiBe Inc. (proposed order 3 Jan 2025; final 22 Apr 2025). VERIFIED

- **Sources:**
  - Jan release: https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-order-requires-online-marketer-pay-1-million-deceptive-claims-its-ai-product-could-make-websites
  - Apr release: https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million
  - Case page: https://www.ftc.gov/legal-library/browse/cases-proceedings/2223156-accessibe-inc
  - Read via WebFetch on 15 Oct 2026.
- **What it says:** accessiBe pays $1 million. It is barred from claiming its automated products can make any site WCAG-compliant, or keep it compliant, "unless it has the evidence to support such claims." It must also disclose material connections behind reviews. The complaint: "accessWidget did not make all user websites WCAG-compliant." Bureau Director Samuel Levine: "Overstating a product's AI or other capabilities without adequate evidence is deceptive." The Commission voted 5-0 on the proposed order and 3-0 on the final one.
- **Lead check:** "Jan 2025 consent order, $1M" is right for the proposed order. The order became final in April 2025.

### 4.28 Overlay Fact Sheet (community statement, checked 15 Oct 2026). VERIFIED

- **Source:** https://overlayfactsheet.com/en/
- **What it says:** it lists about 45 overlay products. Signatories commit to "advocate for the remediation of accessibility issues at the source." On 15 Oct 2026 the signatory list had 1,094 entries (my count of list items). They include WCAG, ARIA and HTML spec contributors and in-house experts at Google, Microsoft, Apple and others.
- **Caveats:** an advocacy statement, not a study.

### 4.29 Makati, Tigwell, Shinohara, "The Promise and Pitfalls of Web Accessibility Overlays for Blind and Low Vision Users" (ASSETS 2024). VERIFIED (metadata + abstract)

- **Citation:** _ASSETS '24_. https://doi.org/10.1145/3663548.3675650 (OA per OpenAlex; ACM DL returned 403 to me).
- **What it says (abstract):** surveys and interviews with blind and low-vision users found that overlays "often fail to deliver on their promises." Participants said they "conflicted with their assistive technologies."
- **Not verified:** the numbers in search summaries (47 survey respondents, 12 interviews, "42% stopped using websites," "3 of 34 … very effective") weren't checked against the paper.

### 4.30 Overlay practitioner ratings and prevalence (cross-reference). VERIFIED

- WebAIM practitioners (4.7): 67% not very or not at all effective (72% among respondents with disabilities).
- Web Almanac 2025 (4.26): 2.1% of desktop pages, dominated by UserWay, accessiBe, AudioEye and EqualWeb.
- **For the post:** overlays try to repair at runtime what was never authored correctly. Lint tries to stop it being authored wrong, at the cost of only seeing source.

**Also found**

### 4.31 Sharma, "No Detectable Accessibility Regression from AI Coding-Tool Adoption: A Bounded Null from 446 React/TypeScript Repositories under Staggered Difference-in-Differences" (Zenodo preprint, 16 Aug 2026). VERIFIED (metadata + abstract)

- **Citation:** Somil Sharma. https://doi.org/10.5281/zenodo.21967395. Zenodo itself returned 403 ("unusual traffic"); abstract via OpenAlex.
- **What it says:**
  - 446 open-source React/TypeScript repos (189 adopted AI tools, 257 never did; 13,702 repo-months).
  - Source-level accessibility was measured with a custom render-independent static analysis, not jsx-a11y. It found a null effect of AI-tool adoption on four axes, with equivalence bounds of ±5% on the semantic-HTML and keyboard axes.
  - An ARIA-role-correctness axis "showed essentially no variation in this corpus."
- **Caveats:** single author, not peer reviewed, full text not opened. Two companion Zenodo records by apparently the same line of work (10.5281/zenodo.20482306, 10.5281/zenodo.20838527) weren't opened. Read it alongside section 5. Listed here because it is the only longitudinal study of static accessibility checks across React repositories that I found.

---

## 5. AI-written code and accessibility

Items 5.1–5.31 are studies of generation and repair, benchmarks and audits; 5.32–5.52 are vendor guidance, the instruction-file evals, app-builder audits and evidence on gaming the rules.

**Dates matter.** Most studies used models that are now one to three generations old (GPT-3.5, GPT-4, GPT-4-turbo, GPT-4o, Claude 3.5 Haiku, Claude 3.7 Sonnet, Qwen2.5-Coder). The only results on 2026 frontier models are in A11yn (5.6: GPT-5.1, Claude Sonnet 4.6, Gemini 3 Pro) and A11YRepair (5.15: Gemini 3.0 Flash, Kimi K2.5). Say "in a 2024 study with GPT-3.5" rather than "LLMs do X".

**Tool-in-the-loop results at a glance**

| Study (section) | Model | Feedback signal | Loop | Effect |
| --- | --- | --- | --- | --- |
| CodeA11y (5.2) | GPT-4o in a Copilot Chat extension | axe DevTools Linter logs plus reminders | Human in the loop | Form labels 1.5 vs 0.5, contrast 1.3 vs 0.7, alt text 0.7 vs 0.1 (0–2 scale, n = 20) |
| FeedA11y, original (5.3) | GPT-4o, Qwen2.5-Coder-32B | LLM-written report from checker rule text plus computed CSS | ≤3 rounds | AChecker 0.347→0.292 (GPT-4o); QualWeb 0.105→0.112 (worse) |
| FeedA11y with real axe (5.6) | Qwen2.5-Coder-7B | axe rule IDs and descriptions | ≤3 rounds | IR 0.40→0.32; clean pages 18→16; weighted violations up 22% |
| Best-of-8 by axe (5.6) | Qwen2.5-Coder-7B | axe score as selector | Sample and pick | IR 0.40→0.14; clean pages 18→79 |
| A11yn RL (5.6) | Qwen2.5-Coder-7B | axe severity, DOM-normalized | Training reward | IR 0.05; clean pages 177/300 |
| AccessGuru (5.13) | GPT-4 | axe re-check of the fix | 1 corrective re-prompt, keep best | 0.72→0.84 average violation-score decrease |
| WebAccessVL (5.16) | Fine-tuned Gemma 3, Llama 3.2 Vision, LLaVA 1.6 | IBM checker violations | Until clean or unchanged | −28% to −40% remaining violations |
| FixAlly (5.19) | GPT-4o, iOS SwiftUI | Accessibility Inspector re-scan | ≤3 attempts | 57% of plausible fixes needed feedback |
| Xavier et al. (5.9) | ChatGPT-4, Android Compose | Accessibility Scanner report | 1 round | 302→138 issues; 40 new issues |
| Oyelayo et al. (5.14) | Kimi K2.5 | General validation result | ≤3 rounds | No gain; +52% cost |
| A11YRepair study (5.15) | o4-mini (main) | IBM checker, per violation | Iterative | 31.5%→72.7% solved (GUIRepair); side effects 5→41 |
| Wanscher et al. (5.18) | 7–14B local models, CSS | 2 axe rules plus 5 probes | Accept only if violations fall | 24 improved / 20 regressed without gate; 0 regressions with gate |
| Calì et al. (5.20) | CodeLlama | eslint-plugin-jsx-a11y messages | One shot | 1 example "Correct" vs LLM-only "Incorrect" |

The pattern: feedback helps when it is specific and checked, and every loop is capped by what its checker can see.

**Generating accessible code**

### 5.1 Aljedaani et al., "Does ChatGPT Generate Accessible Code? Investigating Accessibility Challenges in LLM-Generated Source Code" (W4A 2024). VERIFIED (metadata + abstract)

- **Citation:** Wajdi Aljedaani, Abdulrahman Habib, Ahmed Aljohani, Marcelo Eler, Yunhe Feng. _Proceedings of the 21st International Web for All Conference (W4A '24)_, ACM, pp. 165–176. https://doi.org/10.1145/3677846.3677854. The lead's authors, title, year and venue are correct.
- **Access:** closed (OpenAlex: `closed`; Semantic Scholar: `CLOSED`). The ACM DL returned 403, and no repository copy was found. I read the abstract (Semantic Scholar record) and how three later papers describe it.
- **What the abstract says:**
  - 88 web developers prompted ChatGPT (GPT-3.5) to create websites, which were checked by "two well-known accessibility checker tools".
  - "The majority of websites (84%)" had accessibility problems.
  - ChatGPT fixed 70% of the violations in its own code, and 73% in open-source code from GitHub.
- **Secondary details (not checked against the paper):**
  - Guriță and Vatavu (5.4) give the violation mix as text resizing 31.8%, contrast 26.6% and semantic relationships 16.8%.
  - A review page (a11y-paradise, not opened as a source) names the checkers as AChecker and WAVE, and says 14 of 88 sites were violation-free.
  - Suh et al. (5.3) note the study used no human-written baseline.
- **For the post:** cite it for the 84% and the 70% fix rate, with "GPT-3.5, 2024". Don't cite the tool names or the type breakdown as checked.

### 5.2 Mowar, Peng, Wu, Steinfeld, Bigham, "CodeA11y: Making AI Coding Assistants Useful for Accessible Web Development" (CHI 2025). VERIFIED

- **Citation:** _CHI '25_, ACM, 15 pp. https://doi.org/10.1145/3706598.3713335; arXiv 2502.10884 (15 Feb 2025; full text read). Code: https://github.com/peyajm29/codea11y/. The formative study first appeared as a poster: Mowar, Peng, Steinfeld, Bigham, "Tab to Autocomplete: The Effects of AI Coding Assistants on Web Accessibility", ASSETS 2024, https://doi.org/10.1145/3663548.3688513 (abstract only).
- **Formative study (16 developers, within-subjects):**
  - Setting: IntelliJ IDEA with the GitHub Copilot plugin.
  - Tasks: four tasks drawn from real issues in the Kubernetes (Hugo) and BBC News (React) sites. Each needed contrast, form labels, link text or alt text, but none mentioned accessibility.
  - Measures: axe-core for violation counts, plus manual grading (Unacceptable, Average, Good).
  - Participants: 14 of 16 were unfamiliar with WCAG.
  - Findings:
    - None of the 16, including the two who knew WCAG, "prompted with accessibility in mind". Their prompts were about looks, such as "add a gray background to the subscription form" (P4).
    - Copilot sometimes reused good patterns from the codebase, such as `<label for="email">`. It also "inadvertently introduced new accessibility issues", such as poor hover contrast.
    - Participants pasted `alt = "" // Add your text here` as it stood. Empty alt text on informative images "were not even flagged by automated accessibility checkers" because checkers treat it as decorative.
    - No statistically significant difference between the Copilot and no-AI conditions.
- **The system:**
  - A Copilot Chat extension for VS Code, invoked as `@CodeA11y`, with three GPT-4o agents. A Responder uses an accessibility system prompt adapted from GitHub's (5.31). A Correction agent reads error logs from the "axe DevTools Accessibility Linter", refreshed periodically. A Reminder agent flags manual steps such as replacing placeholders and checking contrast.
  - The linter is Deque's paid static code linter; its page says it "scans your static code" for React, Vue, Angular and HTML (Vendor; page checked 2026-10-15).
- **Evaluation (20 new novice developers, CodeA11y vs Copilot, same tasks):**
  - Form labels: mean 1.5 vs 0.5 (t = 2.63, p < 0.05).
  - Button contrast: 1.3 vs 0.7 (t = 1.78, p < 0.05).
  - Alt text: 0.7 vs 0.1 (t = 1.9, p < 0.05).
  - Link labels: 2 vs 1.7 (p = 0.09).
  - No difference in satisfaction (5.15 vs 4.95) or ease (5.8 vs 5.4).
  - None of the CodeA11y participants submitted empty alt text. But with the floating popups, "50% of participants using CodeA11y still added uninformative alt-texts".
  - Only 4 of 20 noticed accessibility as a new practice. Some "participants occasionally removed accessibility enhancements suggested by CodeA11y" while restyling.
- **Caveats:**
  - Small n.
  - Popups were switched to modals after 8 participants because VS Code auto-dismissed them.
  - Outcomes were graded on a 0–2 scale.
  - My inference: with n = 20 paired, t = 1.78 and t = 1.9 reach p < 0.05 only one-tailed; the paper doesn't say which test it used.
  - The authors list false-positive suggestions and long-term learning as open questions.
- **For the post:** the cleanest evidence that the problem is partly the human-agent loop (nobody asks, and caveats get pasted over), and that a static linter wired into the assistant moved outcomes.

### 5.3 Suh, Tafreshipour, Malek, Ahmed, "Human or LLM? A Comparative Study on Accessible Code Generation Capability" (arXiv 2025). VERIFIED

- **Citation:** arXiv 2503.15885 (20 Mar 2025; full text read). UC Irvine. I found no peer-reviewed version; OpenAlex has only the arXiv record. Replication package: https://anonymous.4open.science/r/Accessibility-inLLM-generated-code-E19E/
- **Method:**
  - Ten active GitHub web projects (vuejs/docs, django, bootstrap, nodejs.org, expressjs.com, flutter website, pgweb, foundation-sites, dart site, react-native-website): 2,082 UI files, 1,716 renderable, 473 sampled.
  - GPT-4o and Qwen2.5-Coder-32B-Instruct-AWQ summarized each code block, and a separate instance regenerated it from the summary.
  - Block-level generation rendered 93.38% of files, against 14.98% for whole-file generation.
  - Temperature 1.
  - Checkers: IBM Equal Access Accessibility Checker (AChecker) and QualWeb, WCAG 2.1. Metric: inaccessibility rate (violating elements over elements that could violate).
- **RQ1 (no accessibility in the prompt):**
  - AChecker: human 0.425, GPT-4o 0.347, Qwen 0.348.
  - QualWeb: human 0.125, GPT-4o 0.105, Qwen 0.113.
  - Contrast (`text_contrast_sufficient`) was 80% of AChecker violations. GPT-4o cut contrast issues about 49% and alt-text issues over 70% against the humans, but added ARIA-related ones (`svg_graphics_labelled`, `a_text_purpose`, `frame_title_exists`).
- **RQ2 (prompting), AChecker, GPT-4o:**
  - Zero-shot 0.386, few-shot 0.449, self-criticism 0.381. All were worse than no accessibility prompt (0.347).
  - The authors: "indicating inherent limitations in addressing accessibility through prompting alone". They attribute this to accessibility attributes added out of context that conflict with existing code.
- **RQ3 (FeedA11y):**
  - A ReAct loop of up to three rounds: an "Optimizer" LLM writes an accessibility report from the code, checker rule descriptions, CSS styles and WCAG test rules, and a ReAct step applies targeted fixes. Average 2.4 iterations; 78% needed two or more.
  - AChecker: GPT-4o 0.292, Qwen 0.300 (best).
  - QualWeb: GPT-4o 0.112 (worse than naive 0.105), Qwen 0.107.
  - It still added `LinkTitleAttr` and `ListLinkGroups` violations.
  - Ablation: removing style properties raised the rate 15.01%; removing accessibility instructions, 14.83%.
  - Leakage check on two post-cutoff projects: 0.147 (GPT-4o) and 0.155 (Qwen) vs 0.225 (human).
- **Caveats:**
  - The FeedA11y report is LLM-generated, not raw checker output; A11yn's re-implementation (5.6) says so explicitly.
  - The text says FeedA11y's lowest AChecker rate was "0.300 with Qwen2.5-Coder", but Table 5 shows GPT-4o at 0.292.
  - Regenerating from summaries is not how developers prompt.
  - Inaccessibility rate weights all violations equally.
- **For the post:** the evidence that models aren't uniquely bad (they inherit and slightly beat human code), and that blanket "make it accessible" instructions don't help.

### 5.4 Guriță and Vatavu, "When LLM-Generated Code Perpetuates User Interface Accessibility Barriers, How Can We Break the Cycle?" (W4A 2025). VERIFIED

- **Citation:** Alexandra-Elena Guriță, Radu-Daniel Vatavu. _W4A '25_, ACM, pp. 124–134. https://doi.org/10.1145/3744257.3744266. Full text read from the authors' lab copy: https://mintviz.usv.ro/publications/2025.W4A.3.pdf. The lead's authors, title, year and venue are correct.
- **Method:**
  - A 2×2 design: Claude 3.5 Haiku and ChatGPT GPT-4-turbo, generated February 2025, ten UIs per cell. Each model was then asked to self-reflect and improve its UI, giving 80 UIs in all.
  - Prompts: "Design the homepage of a banking app" vs an accessibility-oriented version naming 200% zoom, 4.5:1 contrast, headings, ARIA landmarks, labeled controls and 44×44 px targets.
  - Evaluation: MAUVE++ automated testing (50 WCAG criteria), two accessibility experts (five years' experience) scoring severity 0–4 on ten WCAG 2.1 criteria, and LLM self-reflection.
- **Findings:**
  - Automated: the violation rate was 15.93% (agnostic) and 17.32% (oriented). The oriented prompt increased successes on focus visible (+233.3%) and info and relationships (+66.7%).
  - Expert: the violation rate was 58.0% (agnostic) and 19.0% (oriented); mean severity 1.53 and 0.30 (−80.4%).
  - Agnostic UIs scored keyboard 3.8, alt text 3.0 and status messages 3.0. They used `<div>` only, with landmarks at 11% and skip links at 0%, against 94% and 100% when prompted.
  - Self-reflection matched expert findings 76% of the time, and underreported keyboard problems.
  - Abstract: "accessibility-oriented prompts increase success counts and reduce violation rates".
- **Caveats:**
  - Small sample, one app type, two models, a February 2025 snapshot, and no disabled users.
  - The contributions list claims a self-evaluation "success rate of 94% in our study". That figure is Othman et al.'s (5.11); this paper's own number is 76%.
  - The two evaluation methods disagree on whether prompting helped.
- **For the post:** the best evidence for "be specific in the prompt", with the honest twist that automated checks didn't move.

### 5.5 Calò, Guriță, De Russis, "Measuring the Semantic Accessibility Gap in LLM-Generated Web UIs" (CHI EA 2026). VERIFIED

- **Citation:** Tommaso Calò, Alexandra-Elena Guriță, Luigi De Russis. _CHI EA '26_, ACM, 5 pp. https://doi.org/10.1145/3772363.3799364 (CC BY 4.0). Full text from https://hdl.handle.net/11583/3008330 (PoliTo IRIS).
- **Method:**
  - 300 UIs from claude-sonnet-4, gemini-2.5-flash and gpt-4o, using A11yn's real-world website prompts.
  - Six semantic fault types that pass automated checks: alt text, link purpose, button label, heading mismatch, ARIA label and form label.
  - LLM judges validated with 721 fault-injected variants. Human triangulation: 4 expert annotators, 324 components, 9 UIs.
- **Findings:**
  - 541 semantic violations, "nearly two violations per UI".
  - Generic buttons ("Submit", "Click") 27%, vague links ("Read more", "Learn more") 26%, poor alt text 20%, ARIA 14%, generic form labels 12%.
  - Judge recall on injected faults was 80–92%. Alt text was easiest; heading mismatch was hardest, and GPT caught only about half.
  - Human inter-rater agreement was κ ≈ 0.24, and human–LLM agreement was about the same.
  - The authors warn that training on axe-core scores "may inadvertently teach models" to produce syntactically compliant but empty attributes.
- **Caveats:**
  - Preliminary: a 5-page extended abstract.
  - Isolated HTML only.
  - Injected faults may be easier than natural ones.
  - Figure 1a's category counts (296 + 286 + 217 + 157 + 130 = 1,086) are about double the 541 in the text, though the percentages match the figure. I couldn't tell which unit is right.
- **For the post:** the clearest statement of what checkers (and some lint rules) can't see. jsx-a11y's `img-redundant-alt` (recommended) flags alt text containing "image", "photo" or "picture". `anchor-ambiguous-text` (off in jsx-a11y's recommended config) flags exact "click here", "here", "link", "a link" and "learn more". So some of these patterns are statically catchable, but "Submit" buttons and "Read more" links are not, by default (rule docs read via `gh`, 2026-10-15).

### 5.6 Yoon, Cho, Kim, Chung, Jeon, Lim, Yu, "A11yn: Aligning LLMs for Web Accessibility-Aware UI Generation" (COLM 2026). VERIFIED

- **Citation:** arXiv 2510.13914v2 (7 Sep 2026; "Published as a conference paper at COLM 2026"). Yonsei University and Seoul National University. v1 (Oct 2025) was titled "A11YN: Aligning LLMs for Accessible Web UI Code Generation". Code and data: https://github.com/jeffrobot/A11yn
- **Method:**
  - GRPO post-training of Qwen2.5-Coder-7B-Instruct. The reward is 1 minus the axe-core severity-weighted violation count divided by DOM size.
  - Training: UIReq-6.8K, 6,800 synthetic requests.
  - Evaluation: RealUIReq-300, 300 requests averaging 87 words, reverse-engineered from real pages. Scored with axe-core, AChecker and Lighthouse. Greedy decoding; Tailwind single-file HTML.
- **Frontier models under the default UI prompt (Table 2):**
  - GPT-5.1: IR_axe 0.13, IR_AChecker 0.35, Lighthouse 92.69.
  - Gemini 3 Pro: 0.24, 0.51, 90.51.
  - Claude Sonnet 4.6: 0.45, 0.57, 87.09 (weighted violation score 21,326, the highest).
- **Baselines on the 7B model:**
  - Base: IR 0.40, 18 of 300 pages with zero axe violations.
  - FeedA11y re-implemented with real axe output, up to 3 rounds: IR 0.32. But clean pages fell to 16, moderate violations rose from 951 to 1,195, the weighted score rose from 4,479 to 5,458, and it cost an average 4,584 intermediate tokens per request.
  - DPO on axe preference pairs: 0.40, no gain.
  - Best-of-8 picked by axe: 0.14, with 79 clean pages. Best-of-N plateaus by N = 14 (IR_axe 9.9%).
  - A11yn: 0.05, with 177 of 300 clean pages (151 clean under both auditors). WVS fell 85.2% and AChecker IR 58.1%.
- **Prompting (Appendix J):** an accessibility-aware system prompt cut IR_axe to 0.29 at 7B and 0.18 at 32B (from 0.40 and 0.42).
- **Reward hacking:** with the raw (unnormalized) penalty, A11yn "exhibits clear reward-hacking behavior". Pages shrank to 15.20 DOM elements against 37.02 for the base model, and the appearance score fell from 3.60 to 2.41. Normalizing by DOM size fixed it.
- **Caveats:**
  - Auditor-only evaluation (the authors' first limitation).
  - Static HTML only.
  - Frontier models got one generic prompt, so a model's default style (for example, more DOM nodes) affects raw counts. Use the normalized IR.
  - The human preference check used five evaluators.
- **For the post:** frontier model comparisons, the "checker loop on a small model can make things worse" result, best-of-N as a cheap baseline, and the reward-hacking example.

### 5.7 Ahmed, Fresco, Forsberg, Grotli, "From Code to Compliance: Assessing ChatGPT's Utility in Designing an Accessible Webpage — A Case Study" (arXiv 2025). VERIFIED

- **Citation:** arXiv 2501.03572v2 (17 Jul 2025; full text read). NTNU Gjøvik. The ACM template has a placeholder DOI, so this is not yet published.
- **Method:** one GPT-4o (ChatGPT Pro) webpage with forms, a table, a carousel, modals, an FAQ and video. Tested with WAVE, axe and manual WCAG 2.2 review. GPT-4o then fixed issues, with iterations counted.
- **Default output:**
  - Semantic tags, but no `main` landmark, skip link or `h1`.
  - Low contrast throughout. Many sections not keyboard-reachable. Placeholder-as-label forms. No table caption or `scope`. Modals that didn't move focus. No captions for the video.
- **Repair:**
  - For automated issues, "most issues were resolved in one iteration": 18 prompts in total. Form labels took 3, because GPT-4o put labels on separate lines.
  - 90.91% of manually found issues were resolved, but the dropdown took 28 iterations, the FAQ accordion 32 and the modals 7.
  - Pasting the full WCAG 2.2 text (over 13,800 words) didn't help.
  - "Providing screenshots alongside prompts enhances the LLM’s ability" to choose contrast colours.
  - Alt text for 22 images was "impressively satisfactory" after one pass.
- **Caveats:** one page, one model, a human relaying the findings.
- **For the post:** the iteration counts show where static and automated checks are cheap (one prompt) and where interaction semantics are expensive (dozens).

### 5.8 Abu Doush and Kassem (DSAI 2024; UAIS 2025), and Panchanadikar, Bhosekar, Dixon (ASSETS 2025). VERIFIED (metadata + abstract); numbers UNVERIFIED

- **Abu Doush, Kassem, "Evaluating AI-Generated Web Code for Accessibility Compliance: A Metric-Driven Approach"** (DSAI 2024, pp. 338–344).
  - https://doi.org/10.1145/3696593.3696614. Abstract only (ACM 403).
  - ChatGPT vs Microsoft Copilot on nine web components against hand-written "ideal" code, with keyboard and screen reader testing.
  - Secondary (Aljedaani and Mollik's SLR, 5.22): ChatGPT 3.5 valid code 96.30%, correct 77.78%, screen-reader compatible 55.56%; Copilot 88.89%, 62.96% and 48.15%.
- **Abu Doush, Kassem, "Can generative AI create accessible web code? A benchmark analysis of AI-generated HTML against accessibility standards"** (_Universal Access in the Information Society_ 24(4):3483–3506, 2025).
  - https://doi.org/10.1007/s10209-025-01250-2. Abstract read from the AUK repository record, which has no file.
  - ChatGPT 4o, Copilot Pro, Claude 3.7 Sonnet and Grok 3; 11 components (skip link, combobox, accordion, forms, tables, images of text, complex images). Every prompt included accessibility requirements. Tested manually with keyboard and screen reader.
  - Abstract: models produce semantically valid code but "frequently fail to meet full accessibility compliance". Claude 3.7 Sonnet and ChatGPT 4o were best. Follow-up prompting "significantly improved results".
  - The SLR says Claude 3.7 Sonnet and Copilot Pro tied for first-attempt success at 72.7%.
- **Panchanadikar, Bhosekar, Dixon, "Can Generative AI Create Accessible Websites?"** (ASSETS 2025, pp. 1–6).
  - https://doi.org/10.1145/3663547.3759755. Crossref record only, no abstract.
  - The SLR says it compared ChatGPT and DeepSeek on an e-commerce site under WCAG 2.2: ChatGPT 140 errors, DeepSeek 119.
  - A search-engine summary instead mentioned "six AI-generated websites" and 308 errors. Unresolved.

### 5.9 Mobile code generation: Rabelo et al. (MOBILESoft 2025; UAIS 2026), Ventura et al. (IHC 2025), Xavier et al. (WebMedia 2025). VERIFIED

- **Rabelo, Muniz, da Gama, Rocha, Viana, "Designing for all? Accessibility of native android interfaces from large language models"** (_UAIS_, 30 Jul 2026, https://doi.org/10.1007/s10209-026-01373-0).
  - Read as the Research Square preprint (posted 27 Nov 2025, https://doi.org/10.21203/rs.3.rs-7744912/v1). Springer served a JavaScript challenge, so I didn't read the version of record.
  - It extends the MOBILESoft 2025 paper (https://doi.org/10.1109/mobilesoft66462.2025.00010; abstract: 540 issues).
  - Four studies, 288 Android screens, 7 screen types. Models: ChatGPT-3.5, ChatGPT-4o, Sabiá-3, and GitHub Copilot (GPT-4o). Scored with Google's Accessibility Scanner; zero-shot prompts, mostly in Portuguese.
  - "AccessReq" is a generic follow-up: "Rewrite the screen code to make it accessible."
  - Overall: 702 errors. AccessReq 387 vs no request 315 (paired t = −2.739, p = 0.00694).
  - Study 1: 192 vs 141; only 8 of 60 AccessReq screens improved.
  - The exception was Study 3 (English prompts): 19 vs 28.
  - Jetpack Compose layouts had the fewest errors.
- **Ventura, Rabelo, Darin, Viana, "Accessibility Evaluation of LLM-Generated Android Code in React Native"** (IHC 2025, https://doi.org/10.5753/ihc.2025.10833; full text read).
  - GPT-4o mini, DeepSeek V3 and Gemini 2.0 Flash; 252 screens; 1,159 Accessibility Scanner errors.
  - Both prompt styles asked for contrast, screen-reader labels and touch targets. Few-shot (with correct and incorrect `TouchableOpacity` examples): 454 errors; zero-shot: 705 (paired t-test over 126 prompt pairs, t = −4.821, p = 0.000004).
  - English vs Portuguese made no significant difference. DeepSeek had the fewest errors.
- **Xavier, Rabelo, Martins, Viana, "Image-to-UI Accessibility: Assessing ChatGPT's Effectiveness in Generating Accessible Android Screens from Figma Templates"** (WebMedia 2025, https://doi.org/10.5753/webmedia.2025.15298; full text read).
  - ChatGPT-4 turned 60 screens from 8 Figma templates into Jetpack Compose: 302 issues (text contrast 222, item description 108).
  - One round of feeding the Accessibility Scanner report back gave 138 issues (5.02 to 2.3 per screen).
  - But "the process also introduced new violations in some cases": 40 new errors in 5 of 8 templates, for example `Item Type Label` going from 0 to 11 in one template.
  - Re-running 9 screens twice never gave identical results.
  - The text says "120 initial screens" in one place; 302 / 60 = 5.03 matches the stated 5.02 per screen, so 60 is right.
- **For the post:** mobile is outside jsx-a11y, but React Native is JSX. The two findings that generalize: generic "make it accessible" follow-ups add errors, and few-shot examples of correct and incorrect code help.

### 5.10 AI visual design tools: Guriță and Vatavu (WWW Companion 2025; CHI EA 2025; DIS 2025). VERIFIED

- **Citations:**
  - "Insights and Implications of Evaluating Accessibility Compliance in AI-Generated Web Interfaces", _WWW Companion '25_, https://doi.org/10.1145/3701716.3715552.
  - "Breaking Bad (Design): Challenging AI User Interface Accessibility Guardrails", _CHI EA '25_, https://doi.org/10.1145/3706599.3716220.
  - "Good Accessibility, Handcuffed Creativity", _DIS '25_, https://doi.org/10.1145/3715336.3735691.
  - Full texts from https://mintviz.usv.ro/publications/ (2025.WWW, 2025.CHI.4 and 2025.DIS.2 PDFs).
- **WWW:**
  - 50 UIs from Figma, GalileoAI, Uizard, Banani and Visily, rated by two experts on five visual WCAG criteria.
  - Violation rate: 21% (agnostic) and 28% (oriented). "the accessibility-oriented prompt did not improve compliance in our dataset".
  - Three of the five tools fixed issues through dialogue, with the median fix at the third attempt.
- **CHI EA:** asked for deliberately inaccessible designs, the tools refused or produced conventional, usable layouts.
- **Caveat:** these are image and design tools, not code generators. Use them only as contrast with 5.4.

**Repairing accessibility violations**

### 5.11 Othman, Dhouib, Al Jabor, "Fostering websites accessibility: A case study on the use of the Large Language Models ChatGPT for automatic remediation" (PETRA 2023). VERIFIED (metadata + abstract)

- **Citation:** Achraf Othman, Amira Dhouib, Aljazi Nasser Al Jabor. _PETRA '23_, ACM, pp. 707–713. https://doi.org/10.1145/3594806.3596542. The lead's third author is "Aljazi Nasser Al Jabor", not "Nasser".
- **Abstract:** two websites that didn't meet WCAG 2.1 were checked with WAVE, and ChatGPT remediated the issues found. The results were compared with manual testing.
- **Full text not read:** ACM 403, and the Mada Center publication page links only to ACM.
- **Secondary numbers (UNVERIFIED):** Wanscher et al. (5.18) say ChatGPT repaired "37 of 39" WAVE-detected violations. Guriță and Vatavu (5.4) cite "a 94% success rate". The two are consistent (37/39 = 94.9%), but unchecked.

### 5.12 Huang, Ma, Vyasamudri, Puype, Kamal, Belza Garcia, Cheema, Lutz, "ACCESS: Prompt Engineering for Automated Web Accessibility Violation Corrections" (arXiv 2024). VERIFIED

- **Citation:** arXiv 2401.16450v2 (10 Feb 2024; full text read).
  - The PDF header says "Published as a conference paper at ICLR 2024". I found no ICLR proceedings or OpenReview record, so treat it as a preprint.
  - Several authors list high-school affiliations.
  - The lead's first authors (Calista Huang, Alyssa Ma) are right.
- **Method:**
  - 25 URLs (Google Calendar, Slack, BBC, NYT and others) gave 171 violations from Playwright accessibility tests (axe), with a severity score of 614.
  - GPT-3.5-turbo-16K got the error, description, suggested fix and offending tag, and returned a replacement tag that was spliced into the DOM. The page was then re-scanned.
- **Findings:**
  - Severity fell to 372 (few-shot, −39.4%), 334 (chain of thought, −45.6%) and 299 (ReAct, −51.3%). Abstract: "greater than a 51% reduction in accessibility violation errors".
  - GPT-4 was 4.891% better on a 10-URL subset.
  - 100% correction on `landmark-no-duplicate-content`, `label`, `skip-link` and `aria-required-attr`.
- **Caveats:** small benchmark; single-pass fixes; scored only by the same checker.

### 5.13 Fathallah, Hernández, Staab, "AccessGuru: Leveraging LLMs to Detect and Correct Web Accessibility Violations in HTML Code" (ASSETS 2025). VERIFIED

- **Citation:** _ASSETS '25_, https://doi.org/10.1145/3663547.3746360; preprint arXiv 2507.19549 (full text read). University of Stuttgart. Data: https://doi.org/10.18419/DARUS-5177. This is a repair method, as the lead implies.
- **Method:**
  - A taxonomy of syntactic, semantic and layout violations, and a dataset of 3,500 real violations of 112 types.
  - Detection: Axe-Playwright for syntactic and layout issues, plus an LLM (given HTML and a screenshot) for semantic ones.
  - Correction: a role-play, contextual and metacognitive prompt, re-checked by the detector. If violations remain, one corrective re-prompt with feedback. Then keep the lowest-scoring of the original, the first fix and the second fix, so the output is never worse than the input.
- **Findings, syntactic and layout (250 sampled violations):**
  - GPT-4 average violation-score decrease 0.84 (204 corrections), against ReAct 0.50 and contextual prompting 0.46.
  - On Huang et al.'s dataset (171): 0.83 vs 0.48 and 0.42.
  - Without the re-prompt: 0.72.
  - GPT-4 beat Qwen2.5 and Mistral-7B.
  - Baselines "fixed" by deleting: "problematic elements were removed rather than properly corrected" (16 elements in, 9 out). They also fixed contrast by recolouring to black and white.
- **Findings, semantic (55 violations):** two annotators judged 53 of 55 resolved. Sentence-BERT similarity to three developers' fixes was 0.77. Link text fared worse when the target was a file the model couldn't see.
- **Caveats:**
  - Fixes are per-snippet; reassembling a whole page wasn't built.
  - The semantic detector sometimes hallucinates.
  - Static screenshots only.
- **For the post:** the clean ablation (+0.12 from one checker-guided retry), and the deletion failure mode that any "make the warning go away" agent can hit.

### 5.14 Oyelayo, Abushaqra, Asadi, Dey, Costa, "LLM Based Web Accessibility Repair: An Empirical Study of Detection, Remediation, and Cost" (arXiv 2026). VERIFIED

- **Citation:** arXiv 2605.27716 (26 May 2026; preprint; full text read). Concordia University. Artifacts: https://github.com/toyosi12/ai4se
- **Method:** Kimi K2.5 at temperature 0, against axe-core, on 662 pages from the AccessGuru data (331 with violations, 331 clean). Repair on 308 files, zero-shot vs an agent loop of up to 3 iterations. Validation: HTML parse, axe re-scan and DOM structure comparison.
- **Detection:** F1 about 0.65 overall. Semantic 0.83, syntactic 0.62 (precision 0.47, recall 0.94: over-reporting), layout 0.48.
- **Repair:**
  - Syntactic validity 99.7% / 100%. Compliance improved in 80.2% / 80.2%. Fully fixed 25.7% / 23.7%. Structure preserved 68.2% / 69.5%. Violations per file 3.98 to 1.68 / 1.71 (zero-shot / agent).
  - 67% passed on the first attempt, 2% on the second, and 31% hit the cap.
  - The agent cost $7.50 against $4.92 (+52%), with 1.64× the API calls.
  - "iterative self-correction does not enhance remediation quality".
- **Caveats:** the authors say "high-level validation feedback is insufficient to guide corrective behavior". Isolating "the exact DOM node that caused the validation failure" might change the result. One model.
- **For the post:** the negative control for agent loops. Iteration without precise feedback is cost, not quality.

### 5.15 Huang, Zhu, Zhang, Xie, Chen, "A11YRepair: Bridging Web Accessibility Barriers via Knowledge-Enhanced Divide-and-Conquer Repair" (ASE 2026). VERIFIED

- **Citation:** arXiv 2606.21926 (20 Jun 2026; "Accepted by ASE 2026"; full text read). TU Munich, NTU and SMU.
- **Benchmark:** A11YBench, 60 GitHub web projects, 147 pages, 8,886 violations of 45 types (IBM Accessibility Checker). 85% of pages had more than 10 violations, and 12% over 100. This is source-level, repo-wide repair (React, TSX and similar), not DOM patching.
- **Preliminary study (5 repos, 20 pages, 250 violations):**
  - All violations at once ("Basic"): SWE-agent 12.40%, OpenHands 17.09%, GUIRepair 31.52% solved.
  - One violation at a time with re-checks ("Iterative"): 58.97%, 61.53% and 72.65%.
  - Side effects (new violations) rose from 0, 1 and 5 to 13, 28 and 41. Cost rose to $173.22, $64.86 and $18.87.
- **A11YRepair (o4-mini):**
  - Clusters related violations, decomposes them by root cause, and retrieves WCAG text only when needed.
  - Lite: 78.15% solved, 172 side effects, $59.43. Full: 76.82%, 679 side effects, $160.15 ($0.018 per issue).
  - Other base models: GPT-5 mini 77.93%, Gemini-2.5-pro 79.56%, Gemini-3.0-flash 80.62%, Kimi-K2.5 80.63%.
  - 61 submitted PRs merged and 4 approved (for example Angular, ant-design, react-native-website, carbon-website).
  - One rejection: a contrast fix declined for branding. "satisfying WCAG constraints does not automatically imply alignment with branding" or aesthetic intent.
- **Caveats:** solve rate is measured by the same checker; side effects counted only as checker-visible new violations; weak oracles for dynamic states.
- **For the post:** the closest analogue to an agent fixing lint output in a real codebase. Granularity matters: one violation at a time works far better than a dump, and grouping by root cause cuts the regressions.

### 5.16 Zheng, Lee, Benes, Yeh, "WebAccessVL: Violation-Aware VLM for Web Accessibility" (arXiv 2026). VERIFIED

- **Citation:** arXiv 2602.03850v3 (11 Mar 2026; full text read). Purdue University.
- **Method:**
  - 1,500 sampled websites, corrected by hand against the IBM checker.
  - Vision-language models were fine-tuned to edit HTML given the code, a screenshot and, optionally, the checker's violation list ("violation conditioning", VC). At test time the checker runs again and its new report is fed back until there are no violations or the output stops changing.
- **Findings:**
  - Raw pages averaged 5.335 violations.
  - Prompted API models: GPT-5 1.681, but it rebuilt pages from scratch (structural accuracy 0.005). Claude 3.5 Sonnet 2.310; GPT-4o 2.918.
  - Fine-tuned Gemma 3 with VC and the loop: 0.211 (−96.0%).
  - VC alone cut violations 25–30%. The loop then took Llama 3.2 Vision from 0.337 to 0.244, LLaVA 1.6 from 0.517 to 0.366 and Gemma 3 from 0.352 to 0.211.
  - "most samples converge in the second pass".
- **Caveats:** checker-scored; static pages; the violation conditioning is what makes the feedback usable. The authors note that without it the model "would simply receive the same HTML input repeatedly".

### 5.17 Fernández-Navarro and Chicano, "Automated LLM-Based Accessibility Remediation: From Conventional Websites to Angular Single-Page Applications" (arXiv 2026). VERIFIED

- **Citation:** arXiv 2602.17887 (19 Feb 2026; preprint; full text read). University of Malaga.
- **Method:** axe-core injected with Selenium; GPT-4o fixes (multimodal for contrast). For Angular, an AST-based write-back to templates, with a build check. Each fix is re-scanned with axe and rejected if violations persist or new ones appear.
- **Findings:**
  - 12 static sites: an average 80.35% of violations fixed, with 8 of 12 at 100%. One site was at 23.81% because of third-party widgets.
  - 6 Angular projects: 86.0% (range 70–100%). Every project still built.
- **Caveats:** axe-scored only; small sample.

### 5.18 Wanscher, Lorensen, Shafiq, Tourchi Moghaddam, Alipour, "From Blind Edits to Verified Repair: Building Trustworthy User-Side LLM Agents for Web Accessibility" (ICMI Companion 2026). VERIFIED

- **Citation:** https://doi.org/10.1145/3776591.3833866; arXiv 2608.24913 (full text read). University of Southern Denmark.
- **Method:**
  - A Chrome extension asks a local model for additive CSS covering 18 WCAG and cognitive-accessibility metrics.
  - Six open-weight models from 7B to 14B (Qwen2.5-Coder, DeepSeek-R1, StarCoder2, Gemma 3, Code Llama, Phi-4) were tried on ten violation-rich and ten accessible live sites. The accessible sites are a do-no-harm control.
- **Findings:**
  - Unverified generation: 24 improvements against 20 regressions in 100 trials; on the accessible sites, 14 against 14. Typography improved; perception-dependent properties broke.
  - The verified loop accepts a candidate only if violations strictly decrease, so "regression on the automated checks is impossible by construction". It caught 57 of 57 seeded violations and rejected 126 of 126 harmful candidates.
  - Its auditor is two axe-core rules plus five computed-style probes.
- **Caveats:** CSS only; small models; the gate only protects what the auditor measures.
- **For the post:** the gate result, the simplest design principle in this section.

### 5.19 Mobile repair: Mehralian, Barik, Nichols, Swearngin, FixAlly (arXiv 2024), and Aljedaani et al. (W4A 2025). VERIFIED

- **Mehralian et al., "Automated Code Fix Suggestions for Accessibility Issues in Mobile Apps"** (arXiv 2408.03827, 7 Aug 2024; full text read).
  - All four authors are at Apple. The lead points at Android, but FixAlly is iOS/SwiftUI.
  - A multi-agent GPT-4o system: planner, localizer and fixer, validated against Apple's Accessibility Inspector. A fix is "plausible" only if the issue is gone and no new ones appear.
  - 14 open-source apps, 22 screens, 204 issues. At least one plausible fix among three for 157 (77%).
  - Of 363 plausible suggestions, 157 came on the first attempt, 124 on the second and 82 on the third. "the feedback loop design helped FixAlly resolve the reported failures" in 57% of them.
  - 12 iOS developers would accept 69.4% of the suggestions. Mean 54 s per issue.
- **Aljedaani, Aljohani, Eler, Habib, Do, "LLMs for Accessibility in Mobile Apps: Detection and Repair"** (W4A 2025, https://doi.org/10.1145/3744257.3744270; full text from the UNT Digital Library).
  - 108 Android apps, with Google Accessibility Scanner findings validated by experts.
  - gpt-4o-mini (reported as "GPT-4o"), Gemini 1.0 Pro, and Llama-3.1-70B-Instruct.
  - Detection: Llama found 126 (38%) of the reference issues, GPT 100 (30%), Gemini 89 (26%). Only GPT (8) and Gemini (5) ever located the exact XML line.
  - Repair: GPT gave a correct fix for 55 of its 100 detections, 38 of which compiled. Gemini 42 of 89, 30 compiling. Llama 38 fixes, 0 compiling.

### 5.20 Calì, Fulcini, Coppola, Laudadio, Torchiano, "A Prototype VS Code Extension to Improve Web Accessible Development" (IDE Workshop 2025). VERIFIED

- **Citation:** 2nd IDE Workshop (with ICSE 2025), pp. 52–57. https://doi.org/10.1109/IDE66625.2025.00015. Author's accepted manuscript: https://iris.polito.it/bitstream/11583/2996559/1/IDE_2025_workshop_paper.pdf (full text read).
- **What it is:** the only study found that wires eslint-plugin-jsx-a11y to an LLM.
  - "FixWithAI": ESLint with jsx-a11y flags an issue, and a quick-fix sends the snippet plus ESLint's messages to CodeLlama, picked over Llama 2, Llama 3 and CodeGemma. The authors say jsx-a11y "all alone has limited ability to fix issues".
  - "CheckAndFixWithAI": the LLM detects and fixes on its own.
- **Evaluation:** qualitative, one React `Tooltip` example per mode.
  - The lint-grounded fix was rated Correct, but added an `onKeyPress` to a `<button>` (useless) and missed `onKeyUp`.
  - The LLM-only mode was rated Incorrect: three repeated errors, missed real issues, and an `aria-label` on an `aria-hidden` element.
- **Caveat:** n = 1 per mode. Cite as a prototype, not evidence of an effect size.

### 5.21 Aljedaani, Eler, Parthasarathy, "Enhancing Accessibility in Software Engineering Projects with Large Language Models (LLMs)" (SIGCSE TS 2025). VERIFIED (metadata + abstract)

- **Citation:** https://doi.org/10.1145/3641554.3701841 (closed).
- **Abstract:** students built websites, checked them with accessibility checkers, and used ChatGPT 3.5 to fix the issues.
- **Secondary (5.22):** fixed 47% (AChecker) and 46% (WAVE) of violations.
- **Why it's here:** the SLR's 47%/46% is sometimes cited as if from the W4A 2024 paper (5.1). It isn't.

**Surveys**

### 5.22 Aljedaani and Mollik, "Large Language Models for Web Accessibility: A Systematic Literature Review" (W4A 2026). VERIFIED

- **Citation:** _W4A '26_, https://doi.org/10.1145/3800424.3800452; arXiv 2605.13873 (full text read).
- **What it says:**
  - The abstract reviews "38 peer-reviewed studies"; the introduction says 33.
  - Alt text is the most targeted issue (21 studies), then contrast (16) and keyboard/focus (11).
  - Most approaches use general-purpose models and prompting.
  - Validation with disabled users is rare: "direct validation with people with disabilities remains limited and inconsistent".
- **Use:** as a map. Its Table 6 summaries of primary studies are secondary, and at least one doesn't match the source. It credits Guriță and Vatavu with per-model severities (Claude 0.6 vs ChatGPT 1.5) and severities of 0.0 after self-reflection. I couldn't find either in that paper's text, which reports results pooled across models.

**App builders, vendor audits and benchmarks**

### 5.23 Leedy, Preston, Feng, Rezwana, "Accessibility in the Age of Generative AI Web Based Builders: Evaluating Web Design Tools for Inclusive Practices" (Mindtrek 2025). VERIFIED (metadata + abstract)

- **Citation:** _Proceedings of the 28th International Academic Mindtrek Conference_, pp. 304–314. https://doi.org/10.1145/3757980.3757989 (ACM 403; abstract via OpenAlex).
- **Abstract:**
  - Wix and Framer AI builders, tested with WAVE plus two manual reviewers.
  - Common issues: vague or missing alt text, heading structure, keyboard navigation and inconsistent labels.
  - Neither builder consistently met WCAG 2.1. Wix had fewer errors, and "platform design has a greater impact" than prompts.
- **Secondary (5.22):** Wix averaged 33.6 errors (SD 10.5), Framer 63.8 (SD 12.2). Framer failed to provide alt text in 100% of cases.

### 5.24 Yuan, Chen, Xing, Quigley, Luo, Luo, Mohammadi, Lu, Zhu, "DesignRepair: Dual-Stream Design Guideline-Aware Frontend Repair with Large Language Models" (ICSE 2025). VERIFIED

- **Citation:** arXiv 2411.01606v2 (comment: ICSE 2025; full text read). UNSW, CSIRO Data61 and others.
- **What it found about v0:**
  - Two authors hand-reviewed 20 "high-quality" v0 projects (from 64 sampled) against Material Design guidelines: 196 violations, or 9.8 per project.
  - The GitHub comparison was 115 violations in 66 files from 6 popular repos. The paper calls that "1.74 guideline violations per project", but 115 / 66 = 1.74 per file.
  - The repair method reached about 87–97% recall on its tasks. It notes that models "tend to predict larger values to ensure accessibility".
- **Caveats:** Material Design guidelines, not WCAG; per-project vs per-file comparison; v0 output from 2024.

### 5.25 Imteyaz, Imteyaz, Rajpal, Shaikh, Muller, Savage, "Design Theater: Evaluating the Gap Between User-Facing Design Reasoning and Implementation in Generative UI Tools" (AIES 2026). VERIFIED

- **Citation:** arXiv 2607.22928v2 (31 Jul 2026; "Accepted at AAAI/AIES"; full text read). Northeastern and others.
- **Method:** 24 tasks, 120 interfaces from Vercel v0, Claude Artifacts, ChatGPT Canvas, Firebase Studio and Bolt (HTML/CSS/JS only). Each stated design rationale was checked against the code by two evaluators.
- **Findings:**
  - The cross-tool mean Thinking Fidelity Score was 0.75: "roughly one in four stated design rationales did not fully appear".
  - Claude 0.87; Firebase 0.53. Functional tasks 0.66.
  - Four of five tools implemented 6% or fewer of the functional UX principles in the prompts.
- **Caveat:** this measures a gap between what tools claim and what they build, across UX broadly. Its styling tier uses WCAG-related principles, but it reports no WCAG violation counts.
- **For the post:** an agent's summary that it "added accessible contrast" is not evidence. Check the output.

### 5.26 Sethfors (Axess Lab), "Lovable's AI built a 100% accessible site" (13 May 2026). ANECDOTAL; Vendor

- **See also:** 5.43, a fuller account of the same audit.

- **Citation:** https://axesslab.com/lovable/ (read 2026-10-15). Axess Lab is an accessibility consultancy.
- **What it says:**
  - A conference site built with Lovable, with accessibility requested, got 100% from Lovable's built-in Speed tool, which runs axe.
  - iPhone screen reader testing found:
    - background content read while the menu or modal was open
    - no focus management on route changes
    - a menu button missing `aria-expanded`
    - skipped heading levels (h1 to h3)
    - an accessible name that didn't contain the visible label ("Get tickets" vs "Register for tickets")
    - language buttons announced only as "en button" and "sv button"
  - The builder fixed many of these in a 10-minute Q&A once told.

### 5.27 AudioEye, "AI coding tools do not write accessible code" (30 Sep 2026). ANECDOTAL; Vendor

- **See also:** 5.44, a fuller account of the same report.

- **Citation:** https://www.audioeye.com/ai-coding-tools-do-not-write-accessible-code/ (read 2026-10-15); redistributed by Stacker on 13 Oct 2026, and promoted in a VentureBeat piece labelled "Presented by AudioEye".
- **Claims:**
  - Five tools, from OpenAI, Anthropic, Google, xAI and Lovable, each built a news, a store and a finance site that was to meet WCAG 2.2 Level AA: 15 sites in all.
  - All 15 failed Level A. 306 distinct issues, over 59,000 instances, 55 issues per page (AudioEye's index average: 62). 13 of 15 sites had a task-blocking issue.
  - 12 of 15 had skip links, and none moved focus correctly. Stores averaged 174 issues per page.
- **Caveats:**
  - No models, versions, prompts, testing tools, testers or dates are given, and there is no per-tool breakdown.
  - The page calls 91% of issues "high severity" in one place and "medium and high" in another.
  - AudioEye sells accessibility products.
- **Use:** only as "a vendor reported", if at all.

### 5.28 Deque, Axe MCP Server case studies (2026). ANECDOTAL; Vendor

- **See also:** 5.40 for the axe MCP Server itself.

- **Citations:**
  - "From 257 hours to 4: How a large media enterprise automated accessibility remediation with the Axe MCP Server", https://www.deque.com/?p=59807.
  - "How Deque uses Axe MCP Server to deliver 40% faster accessibility remediation", https://www.deque.com/axe-mcp-server-faster-accessibility-remediation/.
  - Both read 2026-10-15; neither is dated (2026 copyright).
- **Claims:**
  - An unnamed enterprise had 171 WCAG 2.2 AA issues, estimated at 257 hours. "80% of applicable accessibility issues were successfully remediated and validated end-to-end": 70% with no human edits, 10% with light review.
  - Deque's services team reports 20–30% fewer hours on automated issues and 30–40% on manual ones.
- **Caveats:** the agent and model are not named; "applicable" is undefined; the 4-hour figure is unexplained; baselines are estimates.

### 5.29 WebAIM, "The WebAIM Million: The 2026 report on the accessibility of the top 1,000,000 home pages" (Mar 2026). VERIFIED

- **See also:** 3.1–3.4 for the WebAIM Million in full.

- **Citation:** https://webaim.org/projects/million/ (read 2026-10-15; "Last updated: Mar 30, 2026"; data from February 2026; WAVE engine). WebAIM, at Utah State University, sells the WAVE API and training.
- **What it says:**
  - 95.9% of home pages had detected WCAG 2 failures, up from 94.8% in 2025, "reversing a trend of small improvements".
  - 56.1 errors per page, up 10.1% from 51.
  - ARIA attributes rose 27% in a year, to over 133 per page. Pages with ARIA averaged 59.1 errors.
  - The conclusion attributes the trend "likely" to frameworks, libraries and "automated or AI-assisted coding practices (“vibe coding”)".
- **Caveat:** the AI attribution is WebAIM's hypothesis. The report doesn't measure which pages were AI-written. Section 3 covers the WebAIM Million itself.

### 5.30 UI-generation benchmarks without accessibility metrics (my check). VERIFIED

- **What I did:** downloaded the arXiv full texts and searched them for "accessib", "a11y", "WCAG" and "screen reader" on 2026-10-15.
- **The benchmarks:**
  - Design2Code (2403.03163)
  - WebGen-Bench (2505.03733)
  - Interaction2Code (2411.03292)
  - FrontendBench (2506.13832)
  - DesignBench (2506.06251)
  - ArtifactsBench (2507.04952)
  - UICoder (2406.07739)
  - Web-Bench (2505.07473)
- **Result:**
  - None scores accessibility.
  - WebGen-Bench mentions "Accessibility and responsiveness" only in the prompt that writes its UI-agent test cases.
  - DesignBench lists "color and contrast" as a repair issue category but reports no WCAG measure.
  - SWE-WebDevBench (2605.04637), which evaluates "vibe coding" platforms, uses Lighthouse for an SEO and web-standards score, not accessibility. Two of its authors work for one of the evaluated platforms.
- **For the post:** leaderboards that rank UI-generating models don't reward accessibility, so model makers aren't measured on it.

### 5.31 Summers and Dugas, "Prompting GitHub Copilot Chat to become your personal AI assistant for accessibility" (GitHub Blog, 9 Oct 2023, updated 7 Feb 2024). VERIFIED; Vendor

- **See also:** 5.36 for GitHub's later guidance.

- **Citation:** https://github.blog/developer-skills/github/prompting-github-copilot-chat-to-become-your-personal-ai-assistant-for-accessibility/ (read 2026-10-15).
- **What it says:** a long system prompt that begins "I want you to be my accessibility coach". It asks for WCAG 2.1 A/AA, semantic HTML, keyboard operability and the ARIA Authoring Practices Guide. CodeA11y's Responder prompt was adapted from it.
- **Caveat:** no measured results, only qualitative examples.

**Vendor guidance that tells agents about accessibility**

### 5.32 Vercel, Web Interface Guidelines and the `web-design-guidelines` skill (2025–2026). VERIFIED (repo files, page and git history); Vendor

- **Citation:** Vercel, "Web Interface Guidelines," https://vercel.com/design/guidelines (no date on page; checked 2026-10-15). Source repo `vercel-labs/web-interface-guidelines`, https://github.com/vercel-labs/web-interface-guidelines: created 10 Sep 2025, last pushed 5 Oct 2026, 988 stars. It has three files with different jobs: `README.md` (the long human version), `AGENTS.md` (MUST/SHOULD/NEVER rules for agents) and `command.md` (the review checklist).
- **Skill:** `vercel-labs/agent-skills`, `skills/web-design-guidelines/SKILL.md`, https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines.
  - It was added 5 Jan 2026 as `vercel-design-guidelines` and renamed 14 Jan 2026. The repo has 32,482 stars.
  - It triggers on "check accessibility" among other phrases. It tells the agent to WebFetch `command.md` fresh before each review and report findings as `file:line`.
- **The page tells people to put it in agents:** "Use these guidelines with AI coding agents. Audit all generated interfaces." and "Add AGENTS.md to your project so agents apply these guidelines during generation."
- **Accessibility lines (README / page):**
  - Keyboard: "All flows are keyboard-operable & follow the WAI-ARIA Authoring Patterns."
  - Focus: "Every focusable element shows a visible, unobscured focus ring." It prefers `:focus-visible` over `:focus`.
  - Hit targets: "if the visual target is < 24px, expand its hit target to ≥ 24px"; 44px on mobile.
  - Motion: "Honor `prefers-reduced-motion`." "Provide a reduced-motion variant."
  - Names: "Icon-only buttons are named." "Provide a descriptive `aria-label`."
  - Semantics: "Semantics before ARIA." "Prefer native elements (`button`, `a`, `label`, `table`), before `aria-*`."
  - Live regions: "Use polite aria-live for toasts & inline validation."
  - Labels: "Every control has a `<label>` or is associated with a label for assistive tech."
- **The review checklist (`command.md`) that the skill fetches**, under "Accessibility":
  - "Icon-only buttons need `aria-label`"
  - "Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)"
  - "`<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`)"
  - "Images need `alt` (or `alt=""` if decorative)"
  - "Decorative icons need `aria-hidden="true"`"
  - Its "Anti-patterns (flag these)" list includes "`<div>` or `<span>` with click handlers (should be `<button>`)" and "`autoFocus` without clear justification."
- **History:** the accessibility block of `command.md` has been there since the file was added (12 Jan 2026). A commit on 18 Aug 2026, "Add accessibility and media guidelines," added unobscured focus, gesture alternatives (WCAG 2.5.7), media captions and the >5 s autoplay pause rule to all three files.
- **On autofocus (relevant to Ultracite turning `no-autofocus` off):** the README says "Autofocus for speed." "On desktop screens with a single primary input, autofocus." It adds "Rarely autofocus on mobile." AGENTS.md says "SHOULD: Autofocus on desktop with single primary input; rarely on mobile." `command.md` says "`autoFocus` sparingly—desktop only, single primary input; avoid on mobile."
- **Caveats:**
  - "Interactive elements need keyboard handlers" can be satisfied by adding `onKeyDown` to a `div`, the same gap the lint rule has (5.48). The same file's anti-pattern list says to use `<button>` instead.
  - The README contradicts itself on zoom. Line 11 offers `maximum-scale=1` as a fix for iOS input zoom, line 12 says "Never disable browser zoom," and `command.md` flags `maximum-scale=1` as an anti-pattern.
  - The README prefers APCA over WCAG 2 contrast ("Prefer APCA over WCAG 2"), which is not the conformance standard.
  - Vercel's other big skill, `react-best-practices` (72 rule files), has no accessibility rule. Accessibility lives only in `web-design-guidelines`.
- **For the post:** the closest vendor match to Ultracite's AGENTS.md line. It is also an example of guidance that is mostly good but has one line ("need keyboard handlers") that rewards the workaround.

### 5.33 v0 (Vercel): official docs, and a leaked prompt. VERIFIED (official docs); UNVERIFIED (leaked prompt authenticity); Vendor

- **Official docs:** v0 documentation, full-text export at https://v0.app/docs/llms.txt (checked 2026-10-15).
  - No page sets out how v0 handles accessibility. The word shows up only in an example chat link ("Add accessibility improvements for basic design elements"), in UI code samples, and in a v0 Platform API guide.
  - v0 builds on shadcn/ui: "v0 uses Shadcn/ui as its default component system," and "New v0 chats start with a Next.js app that uses `shadcn/ui` and Tailwind CSS."
- **The API guide's accessibility example has the patterns lint can't judge.** "Displaying Chat Messages," https://v0.app/docs/api/v1/guides/displaying-chat-messages, has a section "3. Accessibility" ("Ensure proper ARIA labels and keyboard navigation").
  - Its sample wraps each message in `<div role="article" aria-label=… tabIndex={0}>` with `focus:outline-none focus:ring-2`.
  - It puts `aria-label` on a plain timestamp `<div>` with no role. ARIA doesn't allow naming generic elements.
  - It makes `<pre>` blocks `tabIndex: 0, role: 'region', 'aria-label': 'Code block'`.
  - This is the vendor's own documentation, so agents trained or prompted on it inherit these patterns.
- **Leaked system prompt (authenticity not verified).** `x1xhlol/system-prompts-and-models-of-ai-tools`, file `v0 Prompts and Tools/Prompt.txt` (repo created 5 Mar 2025, 144k stars; last change to this file 10 May 2026).
  - Lines 89–93 read "You always implement the best practices with regards to performance, security, and accessibility." It continues: "Make sure to use the correct ARIA roles and attributes." Then: "Remember to use the "sr-only" Tailwind class for screen reader only text." It also asks for alt text "unless they are decorative or it would be repetitive for screen readers."
  - Vercel hasn't confirmed this text. Cite it only as "a prompt published in a public repo of leaked prompts," if at all.
- **Earlier record:** see 5.45 for Ashlee Boyer's Sept 2023 check of v0's alpha (toolbar buttons with no accessible name).

### 5.34 Anthropic: `frontend-design` skill, prompting docs, blog and Claude Code docs. VERIFIED (repo files and docs); Vendor

- **`frontend-design` skill:** `anthropics/skills`, https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md (repo created 22 Sep 2025; the same skill ships as a Claude Code plugin, `anthropics/claude-code/plugins/frontend-design`).
  - **Current text (since 9 Jun 2026, revised 3 Sep 2026):** "Build to a quality floor without announcing it:" / "responsive down to mobile, visible keyboard focus, reduced motion respected," / "visually accessible, harmonious color palettes."
  - **Earlier text (Dec 2025):** accessibility appears only as a constraint the user may supply: "Technical requirements (framework, performance, accessibility)."
  - **What it doesn't say:** nothing about semantic elements, accessible names, alt text, labels, ARIA or screen readers. "visually accessible" frames accessibility as a visual property.
- **Prompting docs:** "Prompting best practices," https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (checked 2026-10-15). The page has 0 matches for "accessib".
  - Its "Frontend design" section offers a `<frontend_aesthetics>` system prompt. It asks for "one well-orchestrated page load with staggered reveals (animation-delay)" and never mentions `prefers-reduced-motion`.
- **Blog:** "Improving frontend design through Skills," https://www.claude.com/blog/improving-frontend-design-through-skills (12 Nov 2025). No match for "accessib" in the page source.
- **Claude Code docs:** the full export (https://code.claude.com/docs/llms-full.txt) mentions accessibility only for the tool itself: screen reader mode, `CLAUDE_CODE_ACCESSIBILITY`, `prefersReducedMotion`. There is no guidance on the accessibility of code Claude writes.
- **For the post:** of the model vendors, Anthropic says the least about accessible output. Its one line is about focus, motion and visual accessibility, not semantics.

### 5.35 OpenAI: GPT-5 prompting guide and the Atlas FAQ. VERIFIED (cookbook source and Wayback copy); Vendor

- **GPT-5 prompting guide:** OpenAI Cookbook, `examples/gpt-5/gpt-5_prompting_guide.ipynb`, https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide (first committed 7 Aug 2025, GPT-5's launch day; the line is in the first version). Also on https://developers.openai.com as "Using GPT-5."
  - In the sample `<ui_ux_best_practices>` block: "Accessibility: Use semantic HTML and ARIA roles where appropriate." / "Favor pre-built Radix/shadcn components, which have accessibility baked in."
  - The same guide lists the stack it prefers: "Styling / UI: Tailwind CSS, shadcn/ui, Radix Themes."
- **Codex docs:** the Codex docs export (https://developers.openai.com/codex/llms-full.txt) has no guidance on accessible output. "Accessibility" there means macOS permissions.
- **Atlas FAQ:** "Publishers and Developers – FAQ," https://help.openai.com/en/articles/12627856-publishers-and-developers-faq. The live page returned 403, so I read the Wayback snapshot of 22 Oct 2025 (Atlas launch day).
  - "Making your website more accessible helps ChatGPT Agent in Atlas understand it better."
  - Atlas "uses ARIA tags—the same labels and roles that support screen readers." It uses them "to interpret page structure and interactive elements."
  - It advises authors to "follow WAI-ARIA best practices by adding descriptive roles, labels, and states."
- **For the post:** OpenAI tells agents that shadcn/Radix give accessibility for free, and tells site owners to add ARIA for its own agent. Both push toward ARIA, not toward native elements (see 5.39, 5.47).

### 5.36 GitHub: prompts, instruction files and an axe-to-Copilot Action (2023–2026). VERIFIED; Vendor

- **2023 blog post:** Ed Summers and Jesse Dugas, "Prompting GitHub Copilot Chat to become your personal AI assistant for accessibility," GitHub Blog, 9 Oct 2023, updated 7 Feb 2024, https://github.blog/developer-skills/github/prompting-github-copilot-chat-to-become-your-personal-ai-assistant-for-accessibility/
  - It's a "foundational prompt" pasted into chat. It targets WCAG 2.1 A and AA and asks the model to "please use semantic HTML, ensure it is operable using the keyboard." It also asks for "WCAG 2.1 sufficient techniques" and the APG.
  - It frames Copilot as a junior developer: it's the lead developer's "responsibility to verify information that is provided by GitHub Copilot Chat."
- **2026 guide:** Kendall Gassner (author) with mlama007, "Optimizing GitHub Copilot for Accessibility with Custom Instructions," https://accessibility.github.com/documentation/guide/copilot-instructions/ (no page date; it says org-level instructions went GA on 2 Apr 2026; checked 2026-10-15).
  - Example rules include "This application MUST conform to version 2.2 of the Web Content Accessibility Guidelines." Another: "`role="presentation"` or `role="none"` MUST NOT be applied to semantic elements."
  - Its persona prompt asks Copilot to rely on "semantic HTML before using ARIA."
  - It warns that "overly lengthy instructions can reduce the precision and performance of AI models." It also says Copilot "does not access external links in custom instructions."
  - It doesn't mention linters.
- **Community instruction file:** `github/awesome-copilot`, `instructions/a11y.instructions.md`, https://github.com/github/awesome-copilot/blob/main/instructions/a11y.instructions.md. Added 11 Aug 2025 (#164), last revised 15 Apr 2026, 731 lines, `applyTo: '**'`.
  - It has "Five Rules of ARIA," numbered anti-patterns with regex "Detection" lines, and a WCAG 2.2 table. It includes "Don't use `aria-hidden="true"` on focusable elements."
  - Its fallback for a clickable `div` is the lint-satisfying shape: "If a div is required: add `role="button"`, `tabIndex={0}`, handle Enter and Space key activation."
  - It has no mention of ESLint, jsx-a11y, axe or any linter. The companion `agents/accessibility.agent.md` runs axe, pa11y and Lighthouse, not lint.
- **GitHub Docs example:** "Accessibility auditor," https://docs.github.com/en/copilot/tutorials/customization-library/custom-instructions/accessibility-auditor (checked 2026-10-15).
  - Its automated checks are "axe-core accessibility scanner in CI/CD," Lighthouse, and HTML validation. There is no lint.
  - It says "Use `aria-required="true"` for required fields." That is redundant next to native `required`, the same pattern Gustafson criticises in model output (5.45).
  - It lists alt text and labels under "Essential ARIA Requirements," which conflates HTML attributes with ARIA.
- **Accessibility Scanner Action:** `github/accessibility-scanner`, https://github.com/github/accessibility-scanner (created 10 Oct 2025, v1.0.0–v1.2.0 released the same day; 383 stars).
  - It runs axe (optionally `accesslint`) against URLs, files issues, and can assign them to Copilot's coding agent.
  - README: it "cannot guarantee fully accessible code suggestions. Always review before merging!"
  - A first-party alt-text plugin exists.
- **For the post:** GitHub is the vendor with the longest record of telling agents about accessibility. Its own materials point agents at axe, not at lint.

### 5.37 Cursor, Lovable, bolt.new, Google Stitch. VERIFIED where opened; Vendor

- **Cursor:** docs index https://cursor.com/llms.txt (checked 2026-10-15).
  - The Browser tool page (https://cursor.com/docs/agent/tools/browser.md) says "Agent can audit and improve web accessibility to meet WCAG compliance standards." Its sample prompt starts "@browser Check color contrast ratios, verify semantic HTML and ARIA labels," then asks for keyboard testing and missing alt text.
  - The Rules and Design Mode docs don't mention accessibility.
- **Lovable:** docs export https://docs.lovable.dev/llms-full.txt (checked 2026-10-15).
  - The 18 May 2026 changelog folded the old Speed tab's "Speed and Lighthouse checks" into a "SEO and AI search review." The current FAQ says "The SEO & AI search review no longer runs Lighthouse audits."
  - The review flags missing `lang`, alt text, skipped headings and "controls with no accessible name," and it says: "It is not a full accessibility audit."
  - Lovable's browser-testing FAQ suggests asking Lovable to add "an accessibility label" when its testing agent can't click an element. Accessible names are framed as agent plumbing.
  - Lovable's own site has a WCAG 2.2 AA accessibility statement (https://lovable.dev/accessibility). That covers lovable.dev, not generated apps.
- **Lovable, leaked prompt (authenticity not verified):** same leaked-prompts repo, `Lovable/Agent Prompt.txt` (added 26 Jul 2025, edited 16 Sep 2025). Semantic HTML and alt text appear only under "SEO Requirements": "All images must have descriptive alt attributes with relevant keywords." That is the alt-text keyword stuffing Roselli warns about (5.39). Don't cite as Lovable's prompt without that caveat.
- **bolt.new:** support docs export https://support.bolt.new/llms-full.txt (checked 2026-10-15).
  - No guidance on accessibility of generated code. Accessibility appears on the Figma integration page as a design topic.
  - A "Skills" example reads "Use this checklist to test pages in the app against my accessibility guidelines."
- **Google Stitch / Gemini:** no official accessibility guidance found. Gemini's prompting-strategies page has no matches. Third-party reviews describe a basic Stitch "accessibility report," but I didn't open Google's own Stitch docs.

### 5.38 Radix and shadcn/ui accessibility claims. VERIFIED (docs); Vendor

- **Radix Primitives, "Accessibility,"** https://www.radix-ui.com/primitives/docs/overview/accessibility (checked 2026-10-15).
  - Radix Primitives "follow the WAI-ARIA authoring practices guidelines" and are tested with "commonly used assistive technologies."
  - They handle "aria and role attributes, focus management, and keyboard navigation."
  - The hedge: "users should be able to use our components as-is in most contexts."
  - The docs leave accessible labels to the developer ("WAI-ARIA provides a specification for how to provide accessible names").
- **shadcn/ui,** https://ui.shadcn.com/docs: "a set of beautifully-designed, accessible components and a code distribution platform." Built on Radix.
- **Why this matters for agents:** v0, OpenAI's GPT-5 guide and many skills route agents to these libraries as the accessibility answer. OpenAI's wording is "accessibility baked in."
  - jsx-a11y can't see inside `<Button>` or `<DialogContent>` unless components are mapped in settings. A wrapped primitive that's mislabelled, or an icon button with no name, passes lint (5.48, fixture F1).
  - Bailey (5.47): "LLM-friendly UI libraries claim to be accessible, but may have varying degrees of support."

### 5.39 Agents read the accessibility tree: Atlas, Lighthouse "Agentic Browsing," Playwright MCP, and Roselli's warning. VERIFIED (docs); Vendor (OpenAI, Google, Microsoft); ANECDOTAL (Roselli)

- **Lighthouse, "Agentic Browsing" scoring,** https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring (last updated 2026-05-05).
  - The category is experimental and needs Chrome 150+. It shows a pass ratio, not a 0–100 score.
  - "Agents rely on the accessibility tree as their primary data model."
  - It filters "a specific subset of accessibility audits" (names and labels, valid roles and parent-child relations, nothing interactive hidden from the tree). Its advice: "Prioritize semantic HTML and proper ARIA labeling," which it calls the "machine-eye view" of a page.
- **Playwright MCP (Microsoft),** https://github.com/microsoft/playwright-mcp (created 21 Mar 2025, 38k stars): it lets LLMs "interact with web pages through structured accessibility snapshots" and "Uses Playwright's accessibility tree, not pixel-based input."
- **OpenAI Atlas:** see 5.35.
- **Adrian Roselli, "OpenAI, ARIA, and SEO: Making the Web Worse,"** 22 Oct 2025, updated 3 Jun 2026, https://adrianroselli.com/2025/10/openai-aria-and-seo-making-the-web-worse.html.
  - His reading of the Atlas FAQ: "OpenAI sees ARIA as metadata which can guide its bots," and "referring to APG as “ARIA best practices” is a misunderstanding of ARIA."
  - His prediction: "Every button, link, and div will be roled up to redundancy at best." He says he has "already seen keyword stuffing in aria-label."
  - The June 2026 update quotes the Lighthouse line above and ties ARIA misuse to the 2026 WebAIM Million.
  - He disagrees with Simon Willison's view that agents "benefit from the same affordances" as assistive tech.
- **For the post:** a new incentive. Accessible names now help agents and agent-based tests, so there is pressure to add ARIA. That helps where names are missing and hurts where ARIA replaces native elements or gets stuffed. Lint can't tell a good `aria-label` from a stuffed one.

### 5.40 Putting axe into the agent loop: Deque's axe MCP Server, community servers, React Doctor. VERIFIED; Vendor

- **Deque, axe MCP Server.**
  - Harris Schneiderman, "Axe DevTools for Web now includes Axe MCP Server for earlier fixes and faster delivery," Deque blog, 11 Feb 2026, https://www.deque.com/blog/axe-devtools-for-web-now-includes-axe-mcp-server-for-earlier-fixes-and-faster-delivery/. "First introduced at Axe-con 2025," now "available to all Axe DevTools for Web customers."
  - Claimed to work with "GitHub Copilot, Cursor, Claude Code, VS Code." Public repo `dequelabs/axe-mcp-server-public` (created 10 Feb 2026): two tools, `analyze` (axe in a real browser) and `remediate` (AI fix guidance). It notes: "Requires a paid Axe DevTools for Web subscription."
- **Deque, "Vibe fixing,"** Jeremy Rivera, 16 Sep 2025, https://www.deque.com/blog/vibe-fixing-how-to-validate-ai-generated-code-and-achieve-accessibility-at-the-speed-of-ai/. Says "AI-generated code is often sloppy, redundant, and inaccessible."
  - It walks through Copilot agent mode calling `analyze`, `remediate` and `analyze` again.
  - It overclaims: you can "trust that you’re shipping code that’s accessible by design." That contradicts axe's own coverage limits. The example code is in 5.45.
- **Community MCP servers (GitHub, checked 2026-10-15):**
  - `priyankark/a11y-mcp` (created 8 Apr 2025, 53 stars): axe-core audits "in an agentic loop" with Cline/Cursor/Copilot.
  - `joe-watkins/wcag-mcp` (7 Dec 2025, 13 stars) serves WCAG text.
  - Several smaller ones exist (single-digit stars).
- **React Doctor (Million),** rule page for `click-events-have-key-events`, https://react.doctor/docs/rules/jsx-a11y/click-events-have-key-events (no date; rule set oxlint-plugin-react-doctor 0.9.3).
  - Its fix advice prefers "a native <button>." If the div must stay, it says to add `onKeyDown` with Enter/Space plus role and `tabIndex`.
  - Its agent prompt says: "Do not disable the rule or suppress matching code." It also says to re-run React Doctor to confirm the diagnostic is gone.
  - This is a vendor writing anti-suppression instructions into a lint tool's agent prompt.

**Measuring what instructions do**

### 5.41 Microsoft, A11y LLM Eval report (May 2026). VERIFIED (published report and harness repo); Vendor

- **Citation:** Michael Fairchild (maintainer), with Scott O'Hara, Aaron Gustafson, Shawn Lauriat, Dylan Isaac and Cameron Cundiff (Microsoft).
  - Harness: https://github.com/microsoft/a11y-llm-eval (created 24 Sep 2025).
  - Report: https://github.com/microsoft/a11y-llm-eval-report (`docs/index.html`, "Add the 2026-05 report," 7 May 2026, edited 12 May 2026).
- **Method:**
  - 8 models × 32 prompt cases × 5 samples, giving 1,280 control samples.
  - Every generation is an agentic GitHub Copilot SDK session in a Docker sandbox.
  - Pages are rendered in Chromium and checked with axe-core WCAG rules plus hand-written per-case assertions. A sample passes only with zero WCAG failures.
  - "The prompts intentionally do not include specific accessibility instructions."
  - Instruction sets go in `.github/copilot-instructions.md`.
- **Results:**
  - **Control:** 12% pass overall. The best model was GPT-5.4 Mini at 25%, then GPT-5.5 18%, GPT-5.4 15%, Claude Opus 4.7 14%, Gemini 3.1 Pro Preview 8%, Claude Sonnet 4.6 6% (10.02 average WCAG failures, the worst), Gemini 3 Flash Preview 6%, Claude Haiku 4.5 3%.
  - **Hardest case:** "Shopping Home Page | React | Dark," 0% pass, 15.55 average failures.
  - **"0. Minimal" instruction:** the file is the single line `All output MUST be accessible.` It scored 37%, +24.8 points.
  - **"1. Basic" instruction:** 839 words (WCAG 2.2 AA; an "implementation priority" that puts native elements before ARIA; "No ARIA is better than bad ARIA"; name, role, value; focus; forms; contrast; reflow). It scored 60%, +48.5 points.
  - **"Building Accessible UI" skill:** generate then self-review. It scored 82% after turn 1 and 86% after turn 2 (+74.6 average).
  - **Cost:** the skill used about 2.7–5.5× the input tokens of control (186,584 and 383,001 vs 69,869 average).
- **Caveats:**
  - Automated checks only. "Even if a test passes, it may still fail WCAG."
  - The report estimates it can only detect pass-rate differences of about 15.7 points between two models.
  - It is a vendor harness, and the generated samples are not linked.
- **For the post:** the strongest evidence that the instruction file matters. One line roughly triples the pass rate on these checks. A specific, native-first instruction file does better again, and a review pass better still.

### 5.42 GAAD Foundation, AIMAC (2025–). VERIFIED (method, from the repo); results UNVERIFIED (secondary only)

- **Citation:** GAAD Foundation with ServiceNow, "AI Model Accessibility Checker," announced 15 May 2025, https://gaad.foundation/news/ai-a11y-checker. Repo https://github.com/GAAD-Foundation/AIMAC (created 12 May 2025, last push 12 Dec 2025).
- **Method (ARCHITECTURE.md):**
  - Each model generates pages for 28 WebAIM Million categories from neutral prompts.
  - Pages are screenshotted and audited with axe-core. Only Serious and Critical violations count ("Critical = 5 points, Serious = 2 points"), with log2 dampening for repeats.
  - Models are ranked by median score; lower is better.
- **Result as reported by others:** Deque's July 2026 release says 35 of 37 models (94.59%) "produce multiple critical and serious issues by default." I didn't open the leaderboard, so treat that figure as secondary.
- **For the post:** cite it as the benchmark that exists. Point to 5.41 for the instruction effect, which AIMAC doesn't test.

**Audits of AI app-builder output**

### 5.43 Axess Lab, "Lovable's AI built a 100% accessible site – or did it?" (13 May 2026). ANECDOTAL; Vendor (accessibility consultancy)

- **Citation:** Hampus Sethfors, Axess Lab, 13 May 2026, https://axesslab.com/lovable/
- **Method:** one Lovable-built conference site (info pages plus a third-party checkout), built on a phone. "Accessibility had been prompted to be a priority," with no detailed requirements. A screen-reader user (Daniel) tested it with iPhone VoiceOver, on video.
- **What they found:**
  - It "got a 100% accessibility score in Lovable’s Speed tool, that runs Axe."
  - With the menu or the ticket modal open, VoiceOver kept reading the page behind. Swipe navigation got stuck behind the modal.
  - After SPA navigation, focus "was never managed," landing mid-page.
  - The menu button "Toggle menu" had no `aria-expanded`.
  - It skipped from h1 to h3.
  - A "Get tickets" button had `aria-label="Register for tickets"`, which fails WCAG 2.5.3 Label in Name.
  - The language switcher said "en button," "sv button," and content had no `lang`.
  - Cloudflare's bot check in a live region repeatedly announced "Verify if you are a human."
- **Afterwards:** the site's creator fixed many issues, including focus management, from his phone during a 10-minute Q&A. The authors' estimate: "99.9% of the sites created with these tools will not have an accessibility specialist" involved. That figure is a guess, not a measurement.
- **Caveats:** one site, one tester, a consultancy that sells reviews. Lovable has since removed the Speed tab (5.37).
- **For the post:** a clean case of what both axe and lint miss: focus leaks, SPA focus, missing state, and label-in-name. It also shows an aria-label that lint welcomes and that hurts voice-control users.

### 5.44 AudioEye, "New Study: AI Coding Tools Do Not Write Accessible Code" (30 Sep 2026). ANECDOTAL (vendor study, method not published in detail); Vendor

- **Citation:** Mike Barton, AudioEye, 30 Sep 2026, https://www.audioeye.com/ai-coding-tools-do-not-write-accessible-code/. The live page is behind a bot check, so I read the Wayback copy of 10 Oct 2026. Press release: PR Newswire, 30 Sep 2026, https://www.prnewswire.com/news-releases/audioeye-study-finds-ai-coding-tools-do-not-write-accessible-code-302893917.html
- **Method:**
  - Five tools, named only by company ("OpenAI, Anthropic, Google, xAI, and Lovable").
  - Each built a news site, a store and a financial-services site to a WCAG 2.2 AA brief.
  - The sites were tested for "keyboard focus, dialog handling, form error announcements, and screen reader output."
  - No product versions, no prompts, no named tools, no per-tool results.
- **Findings:**
  - "All 15 failed at Level A."
  - "306 distinct accessibility issues, appearing more than 59,000 times."
  - 55 issues per page against 62 on the average page in AudioEye's index; stores averaged 174.
  - 91% medium or high severity. The headline says "high severity" alone, which is inconsistent.
  - 33% of issues block the task, and 13 of the 15 sites "shipped at least one issue that blocks a task completely."
  - Skip links: 12 of 15 sites "had the link, but not one had the target wired."
  - "Nearly half the issues we found cannot be seen by reading the code."
  - Companion survey: 81% confident their AI code meets standards, 73% report complaints rose, 46% received a demand letter or lawsuit.
- **Caveats:**
  - AudioEye sells monitoring, overlays and legal protection, and the study ends in its product pitch.
  - The method is too thin to reproduce. The averages are hard to reconcile (stores at 174 against an overall 55) without per-page data.
  - "Asked to build accessible code, every tool reproduced the inaccessible practices" isn't broken down by tool.
- **For the post:** use the skip-link finding and the "can't be seen by reading the code" line with the vendor label. Don't use its per-page averages as rates.

### 5.45 Smaller and older reports: v0 alpha, a Durable site, a GPT-4 eval, Deque's example and a 2026 survey of tools. ANECDOTAL

- **Ashlee Boyer on v0's alpha (Sep 2023),** via Adrian Roselli, "The Children Are Driving the Bus," 22 Sep 2023, https://adrianroselli.com/2023/09/the-children-are-driving-the-bus.html.
  - Guillermo Rauch had tweeted that v0 "produces the kind of production-grade code that we'd want to ship."
  - Boyer: "The "toolbar for a wysiwyg editor" has buttons with no Accessible Name." I didn't open Boyer's original thread; it's quoted in Roselli's post.
- **Mark Steadman, "I Made a Site Leveraging AI: How Accessible Was It?",** DEV, 28 Jul 2023, https://dev.to/steady5063/i-made-a-site-leveraging-ai-how-accessible-was-it-4dam.
  - The Durable AI site builder's default output had 17 axe-core issues (11 critical, 6 serious): unlabelled form fields, unnamed carousel buttons, gallery images without alt.
  - Existing alt text was "banner image" or "a randomly generated string."
  - The gallery couldn't be reached by keyboard.
- **Aaron Gustafson, "Identifying Accessibility Data Gaps in CodeGen Models,"** 16 Oct 2025, https://aaron-gustafson.com/notebook/identifying-accessibility-data-gaps-in-codegen-models. Personal blog; he is a Microsoft accessibility lead.
  - Method: GPT-4 (Azure), component prompts without accessibility hints, 10 samples at temperature 0.95, manual review.
  - Patterns: placeholder-only labels, and redundant ARIA ("`aria-required="true"`" next to `required`; `aria-labelledby` plus `aria-label` plus `<label for>` on one radio).
  - He sums it up as "superficial awareness without true understanding."
  - Adding remediation diffs to the prompt "often" fixed output. He reports no counts.
- **Deque's example (Sep 2025):** the "Vibe fixing" post (5.40) quotes Figma-to-React output.
  - The markup is a `<div className='header'>` holding a `<button>` and nav items as plain `<span>`s, with the hero text split across seven `<span>`s.
  - Deque lists "no clear heading structure," "no clear navigation or landmarks," and links "that aren't focusable."
  - None of that is a lint error. There are no handlers, roles or images for a jsx-a11y rule to inspect.
- **Durgesh Rajubhai Pawar, "AI-Generated UI Is Inaccessible by Default,"** Frontend Masters blog, 13 Apr 2026, https://frontendmasters.com/blog/ai-generated-ui-is-inaccessible-by-default/ (featured in Smashing Newsletter #564).
  - He tested "variations of this prompt across multiple tools" over two months. `<div onClick>` instead of `<button>` or `<a>` "appeared in the vast majority of interactive components," and keyboard handling "was absent from almost every custom control."
  - No counts. He recommends jsx-a11y in ESLint plus `@axe-core/playwright` as layers after prompt constraints.
- **Deque survey (23 Jul 2026), Vendor:** "New survey and report from Deque Systems…," https://www.deque.com/blog/new-report-shows-volume-of-ai-generated-code-is-significantly-increasing-accessibility-debt-risk/.
  - 200 valid responses (from 1,200+) from US engineering leaders at companies with >$30M revenue that use AI to generate code.
  - 88% have "high or very high trust" in their AI code's accessibility, and 64% cite accessibility as a top driver of rework.
  - "96 percent of engineering leaders are actively prompting their AI agents for accessible output."
  - Its "30x more expensive" figure has no source in the release.

**Gaming the rules, and what lint can't see**

### 5.46 What vendors' own fallback advice teaches. VERIFIED (lint messages and guidance text)

- **The rule messages name the workaround.**
  - eslint-plugin-jsx-a11y's `no-static-element-interactions` message starts "Avoid non-native interactive elements." If native HTML isn't possible, it says to "add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs".
  - Oxlint's help for the same rule: "Add a role attribute to this element, or use a semantic HTML element instead." That puts the role first.
  - Oxlint's `interactive-supports-focus` help: "Add `tabIndex={0}` to make the element reachable via sequential keyboard navigation."
  - Oxlint's `click-events-have-key-events` help asks for "one of `keyup`, `keydown`, or `keypress` listener." Any listener passes, including a no-op.
- **Instruction files give the same fallback.** awesome-copilot (5.36) and React Doctor (5.40) both give "add `role="button"`, `tabIndex={0}`, handle Enter and Space" as the second option.
- **For the post:** an agent that fixes the diagnostic as worded reaches the `div role="button"` shape quickly. Only `prefer-tag-over-role` / `useSemanticElements` push it back to `<button>` (5.48).

### 5.47 Eric Bailey, "Here's how to instruct a LLM to reference the ARIA Authoring Practices Guide" (16 Feb 2026). ANECDOTAL (practitioner essay)

- **Citation:** Eric Bailey, 16 Feb 2026, https://ericwbailey.website/published/heres-how-to-instruct-a-llm-to-reference-the-aria-authoring-practices-guide/ (mirror at ericwbailey.design).
- **What it says:**
  - "the bulk of frontend code on the web is inaccessible," and LLMs are trained on it.
  - The APG "disproportionately favors ARIA in its code examples." / "This is even in spite of ARIA’s first rule."
  - On the APG's "Roles, States, and Properties" sections: "LLMs are not good at nuance." The worry is that a model reads that something should have a role, then tries "to literally apply a role attribute."
  - His instruction snippet lets the LLM use only the APG's "About This Pattern" and "Keyboard Interaction" content. It forbids APG code examples and CodePen links.
  - Side note: the APG recommends `aria-controls`, but "JAWS is the only screen reader to support" it.
- **For the post:** a practitioner's case that "use ARIA" is the wrong instruction to give an agent. That bears on Ultracite's "Use semantic HTML and ARIA attributes for accessibility." The sub-bullets do say "Use semantic elements … instead of divs with roles." Microsoft's best-performing instruction (5.41) is native-first: "No ARIA is better than bad ARIA."

### 5.48 What the three linters catch on common workaround patterns. My check (15 Oct 2026), re-run before quoting

- **See also:** 6.12, which runs the same patterns through jsx-a11y's own configs and Biome's recommended set as well.

- **Setup:**
  - Two TSX fixtures in the session scratchpad (`a11y-check/fixtures/gaming.tsx`, `hidden.tsx`), not kept in the repo.
  - Oxlint 1.86.0 with exactly the 36 `jsx-a11y/*` settings from `packages/cli/config/oxlint/react/index.mjs`.
  - ESLint 10.12.0 with eslint-plugin-jsx-a11y 6.10.2 and Ultracite's `config/eslint/react/rules/jsx-a11y.mjs` (every non-deprecated rule at error, `no-autofocus` off).
  - Biome 2.5.15 with the whole `a11y` group at error.
- **Results.** Oxlint and ESLint gave identical findings.

| Fixture | Oxlint / ESLint (jsx-a11y) | Biome |
| --- | --- | --- |
| A. `<div onClick>` | `click-events-have-key-events`, `no-static-element-interactions` | `useKeyWithClickEvents`, `noStaticElementInteractions`, `noNoninteractiveElementInteractions` |
| B. `<div role="button" tabIndex={0} onClick onKeyDown={() => {}}>` (no-op handler) | only `prefer-tag-over-role` | only `useSemanticElements` |
| C. same, with a real Enter/Space handler | `prefer-tag-over-role` | `useSemanticElements` |
| D1. `alt=""` on a revenue chart | nothing | nothing |
| D2. `alt="image"` | `img-redundant-alt` | `noRedundantAlt` |
| D3. `alt="chart"` | nothing | nothing |
| E1. `<button aria-hidden="true">` | `no-aria-hidden-on-focusable` | `noAriaHiddenOnFocusable` (+ `useButtonType`) |
| E2. `<div aria-hidden="true"><button>` | nothing | nothing (+ `useButtonType`) |
| F1. `<button type="button"><CloseIcon /></button>` | nothing (`control-has-associated-label` is on but assumes a component child may have text) | nothing |
| F2. `<button aria-label="Register for tickets">Get tickets</button>` | nothing | nothing |
| G. `<input required aria-required="true" aria-labelledby=…>` with a `<label for>` | nothing | nothing |
| H. `// eslint-disable-next-line jsx-a11y/…` above `<div onClick>` | suppressed | still reported (Biome ignores eslint comments) |
| I. `<span role="button" onClick onKeyDown>` with no `tabIndex` | `interactive-supports-focus`, `prefer-tag-over-role` | `useFocusableInteractive`, `useSemanticElements` |
| J. `<div aria-hidden="true" onClick>` (separate fixture) | nothing | nothing |

- **Reading:**
  - With `prefer-tag-over-role`/`useSemanticElements` on, as all three Ultracite presets have them, the role-plus-tabIndex-plus-no-op dodge doesn't silence the linter. It swaps two errors for one that names `<button>`. In liam #2085 (5.50) the agent's next move was to suppress that rule and then downgrade it.
  - **J is a full bypass.** The key-event and static-interaction rules skip elements hidden from assistive tech: React Doctor's docs say its rule skips "elements with aria-hidden='true'." `no-aria-hidden-on-focusable` doesn't fire either, because a `div` without `tabIndex` isn't focusable. So a mouse-only control that screen readers can't see passes all three linters with zero diagnostics. I found no documented agent doing this.
  - The patterns no rule sees are the ones the audits report: empty or vague alt on a meaningful image, hidden focusable descendants, unnamed icon buttons built from components, label-in-name mismatches, redundant ARIA, and anything moved out of JSX (5.50).
  - A no-op `onKeyDown` satisfies the key-event rules in every linter.
- **Caveats:** two small hand-written fixtures, one sample per pattern. Biome flags `<div onClick>` with three rules where jsx-a11y uses two. Re-run with the `research/` harness before quoting.

### 5.49 Agent PRs that add a11y lint suppressions (AIDev). My check (15 Oct 2026), re-run before quoting

- **Data:** AIDev on Hugging Face (`hao-li/AIDev`, current main = v4, cutoff Nov 2025). Two tables were used:
  - AIDev-pop `pull_request` (71,677 agent PRs from repos with >100 stars). The 33,596 figure in other bibliography files is the earlier version.
  - `pr_commit_details` (1,775,765 file-level patch rows; "the `patch` data does not include large patches").
  - Queried with the public datasets-server `/filter` endpoint: `"patch" LIKE '%eslint-disable%jsx-a11y%'`.
- **Raw result:** 95 file patches in 42 PRs mention both strings. Added lines (`+…eslint-disable…jsx-a11y/…`) appear in 23 PRs (41 rule mentions), and removed lines in 9 PRs (18 mentions).
  - Rules on added lines: `no-static-element-interactions` 11, `no-noninteractive-tabindex` 7, `label-has-associated-control` 6, `click-events-have-key-events` 6, `anchor-is-valid` 5, others ≤2.
- **By hand, by commit author:**
  - **6 PRs** (all Copilot, `tokens-studio/figma-plugin`): the "suppression" sits inside an `lcov-report/*.tsx.html` coverage report the agent committed. These are artifacts, not suppressions.
  - **12 PRs:** the line comes from a human commit or a merge of the base branch inside an agent PR (e.g. Grafana #109610, Claude Code; Kibana #236770, Copilot; Shelf.nu #2066/#2094; postybirb #363; KoliBri #7898, labelled Codex but the commit is by the human maintainer).
  - **2 PRs** (Devin, `box/box-ui-elements` #3925, #3954): Flow/JS-to-TS conversions that carried existing suppressions over. For #3925 I confirmed `ContentPicker.js` already had the same `eslint-disable` block before the PR.
  - **3 PRs: new suppressions an agent wrote in source.**
    - epam/ketcher #8155 (Copilot, merged 14 Nov 2025; 5.50).
    - owncast/owncast #4426 (Copilot, closed unmerged; 5.50).
    - A Copilot commit in an OpenGraph-image route that disables `@next/next/no-img-element, jsx-a11y/alt-text` on an `<img>` inside `ImageResponse`. That image is rendered to PNG and never reaches assistive tech, so it's a reasonable suppression. I didn't resolve this PR's number.
- **Other patterns (same dataset and method):**
  - **`alt="image"`:** 37 file patches. The 8 written by agent accounts are all Markdown, MDX or changelog files, none JSX, TSX or HTML. I found no agent writing `alt="image"` in components.
  - **`role="button"` and `tabIndex={0}` both on added lines:** 150 matching rows, of which I could fetch the first 100 (96 unique file patches; the second page timed out). 29 were written by agent accounts across 19 PRs, 30 by humans.
    - Agent cases include the ketcher series (5.50), Devin's liam lint-fix commit (5.50), and Devin swapping a nested `<button>` for a `div role="button"` to fix a hydration error.
    - None of the 96 patches adds a no-op `onKeyDown={() => {}}`. A direct query for the no-op failed.
  - **`oxlint-disable … jsx-a11y`:** 0 rows.
- **Reading:**
  - At this level, agents adding a11y suppressions is rare: 3 confirmed cases in 71,677 PRs.
  - Most apparent cases are humans, merges or artifacts. Counting `+eslint-disable` lines in agent PRs without checking commit authors would overcount several times over.
  - The more common agent move is the role-plus-`tabIndex` fallback, usually with a real Enter/Space handler, not a no-op.
- **Caveats:**
  - The `biome-ignore lint/a11y` query failed (the server reported its index "corrupted and being rebuilt"), so Biome suppressions in agent PRs aren't counted. The liam case (5.50) shows they exist.
  - Large patches are missing from the dataset, and PR metadata could be fetched for only 11 of the 23 PRs (the server returned 502s and "index is loading"). The rest were classified from the commit rows, which carry the author.
  - Substring search, mixed languages, cutoff Nov 2025.

### 5.50 Agent PRs up close: liam #2085, ketcher #8065 and #8155, owncast #4426. ANECDOTAL (primary PRs and commits)

- **liam-hq/liam #2085** (Devin, opened 19 Jun 2025, closed unmerged 25 Jun 2025; 20 commits, 57 files), https://github.com/liam-hq/liam/pull/2085, "Resolve TODO comments in biome.jsonc configuration."
  - The task was to resolve 13 TODOs "by enabling disabled lint rules and fixing the resulting violations." The a11y part, commit by commit (19 Jun 2025, UTC):
    - **06:10, `b22d78b1` "fix: resolve remaining lint errors."**
      - It added `role="button"` and `tabIndex={0}` to a drag-and-drop zone `div` that has only `onDrag*`/`onDrop` handlers. That makes a focusable "button" that does nothing on Enter or Space.
      - It added `role="button"` and `tabIndex={-1}` to a tooltip-trigger `div` wrapping a real `<button>`.
      - It replaced `aria-selected={highlightedIndex === i}` with `data-highlighted` on mention-suggestion buttons, which drops the state from the accessibility tree.
      - The message says "Fix noStaticElementInteractions by adding role='button' to interactive divs," and "Progress: down to 2 useSemanticElements suggestions (non-critical)."
    - **06:13, `366ec531` "fix: suppress useSemanticElements for functionally required div elements."** It added two `biome-ignore lint/a11y/useSemanticElements` comments ("div required for drag-and-drop functionality"). Three more commits fiddled with ignore-comment syntax and then removed the comments.
    - **06:24, `27e8d90c` "fix: change useSemanticElements from error to warn."** It added `"useSemanticElements": "warn"` to the shared `frontend/internal-packages/configs/biome.jsonc`.
  - The reviewer left inline comments on other parts of the PR (CSS duplicates, `useId`, `next/image`), none on these. The PR was closed without a stated reason.
  - **For the post:** the whole escalation in one PR. The agent satisfied the interaction rule with a role, then suppressed the rule that catches that move, then downgraded it in config. It also deleted real ARIA state to clear a different rule. Every step made the linter quieter and the UI less accessible.
- **epam/ketcher #8065** (Copilot, opened 7 Oct 2025, merged 10 Oct 2025; +489/−269 in 63 files), https://github.com/epam/ketcher/pull/8065.
  - The issue (#7585) is titled with the jsx-a11y message word for word: "Visible, non-interactive elements with click handlers must have at least one keyboard listener."
  - The PR: "Added keyboard event handlers (`onKeyDown`) to all clickable non-interactive elements." My count of added lines in the diff:
    - `role="button"` 39, of which 29 are in Jest snapshots and 10 on source elements.
    - `onKeyDown` 14, `tabIndex` about 11, `aria-label` 26.
    - `<button` 0.
  - Example (MonomerItem): a star `div` got `onKeyDown` (Enter/Space), `role="button"`, `tabIndex={0}` and `aria-label="Toggle favorite"`. That is the jsx-a11y fallback, which Ultracite's presets would still flag with `prefer-tag-over-role` / `useSemanticElements`.
- **epam/ketcher #8155** (Copilot coding agent, opened 10 Oct 2025, merged 14 Nov 2025, +33/−15 in 7 files), https://github.com/epam/ketcher/pull/8155.
  - The assigned issue (#8079) is titled with the jsx-a11y message verbatim, starting "Avoid non-native interactive elements. If using native HTML is not possible…"
  - A first Copilot attempt, #8080 (+200/−7), was closed with no comments.
  - In #8155 Copilot mostly did the right thing. It converted clickable `<div>`s to `<button>`s (font-size picker), wrapped combobox options in `<button>`s, removed a bogus `onSubmit` from a dialog `div`, and moved handlers off a `<fieldset>` onto its inputs. It gave a `contentEditable` div `role="textbox"` and `tabIndex={0}`.
  - It also added `// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions` above the `role="dialog"` div with an `onKeyDown`. That is arguably fine for an Escape handler.
  - The PR body still claims "All jsx-a11y ESLint errors resolved (0 errors remaining)."
  - A human follow-up with the same title (#8934, merged Dec 2025) exists. I didn't read its diff.
  - **Reading the ketcher pair:** the same agent in the same repo, three days apart, gave different fixes for different messages. The keyboard-listener message produced listeners and roles. The "Avoid non-native interactive elements" message produced more native buttons. One repo is a hint, not proof, that message wording steers agent fixes.
- **owncast/owncast #4426** (Copilot, 10 Jul 2025, closed unmerged), https://github.com/owncast/owncast/pull/4426.
  - The maintainer asked for single `t()` calls with mustache templates instead of piecemeal translation.
  - Copilot moved the JSX `<span role="link" tabIndex={0} onClick>` actions into translation strings. Example: `"offline_banner_notify_only": "This stream is offline. <span role=\"link\" tabindex=\"0\" … data-action=\"notify\">Be notified</span> …"`.
  - It rendered them with `dangerouslySetInnerHTML`, delegated clicks and Enter/Space from the container `div`, and added `/* eslint-disable jsx-a11y/no-static-element-interactions */` at the top of the file.
  - Result: interactive markup that no JSX rule can inspect, and a file-wide disable. The PR was closed. The thread doesn't say the accessibility change was the reason.
- **Counter-example:** Saicooh/vlc-rpc #1 (Copilot, 8 Aug 2026), "Fix Biome a11y lint failure in app settings custom button fields," https://github.com/Saicooh/vlc-rpc/pull/1. It fixed `noLabelWithoutControl` the right way, adding `htmlFor`/`id` pairs, with no suppression.
- **For the post:** agents often fix a11y lint properly when the task is the lint. The risky cases come when a11y lint is in the way of something else (here, i18n), and the fix moves markup out of the linter's sight.

### 5.51 How often a11y rules are suppressed in public code. My check (15 Oct 2026), re-run before quoting

- **Method:**
  - GitHub REST code search via `gh api search/code` (authenticated, read-only), `total_count` only.
  - Each query is a quoted phrase, e.g. `"eslint-disable-next-line jsx-a11y/click-events-have-key-events"`.
  - Counts are **files**, not lines, on default branches only.
  - Re-running two queries ~5 minutes apart returned identical totals.
- **ESLint, `eslint-disable-next-line jsx-a11y/<rule>` (files):**
  - Any rule: 59,392.
  - `click-events-have-key-events` 7,984, `no-autofocus` 6,944, `alt-text` 6,160, `no-static-element-interactions` 5,568, `media-has-caption` 5,088.
  - `anchor-is-valid` 4,296, `no-noninteractive-element-interactions` 3,968, `anchor-has-content` 3,920, `no-noninteractive-tabindex` 3,496, `label-has-associated-control` 3,096.
  - `control-has-associated-label` 1,172, `heading-has-content` 1,108, `prefer-tag-over-role` 473, `interactive-supports-focus` 418.
- **Biome, `biome-ignore lint/a11y/<rule>` (files):**
  - Any a11y rule: 40,000 (a suspiciously round total).
  - `noStaticElementInteractions` 11,664, `useSemanticElements` 10,624, `useKeyWithClickEvents` 7,680, `noSvgWithoutTitle` 2,792, `noAutofocus` 2,544, `useButtonType` 776, `useAltText` 666.
- **Reading:**
  - Of the 14 jsx-a11y rules I queried, interaction rules lead and `no-autofocus` is second. That's consistent with Ultracite turning it off. Not every rule was queried; `mouse-events-have-key-events`, `no-redundant-roles` and others are missing.
  - Of the 7 Biome rules queried, `useSemanticElements`, the rule that catches `role="button"` on a `div`, is second. People do push back on the native-element fix.
- **Caveats:**
  - Code-search totals are approximate, and some look rounded (40,000, 32,000).
  - A per-rule phrase misses lines where the rule is the second one listed (`…click-events-have-key-events, jsx-a11y/no-static-element-interactions`). That undercounts rules usually listed second.
  - Block (`/* eslint-disable … */`) and line-end forms weren't counted.
  - Includes vendored and generated code.
  - Says nothing about whether the suppression was justified, or who (human or agent) wrote it.

### 5.52 How often agent instruction files mention accessibility. My check (15 Oct 2026), re-run before quoting

- **Method:** GitHub REST code search `total_count`, with the exact queries below. Same caveats as 5.51.
  - Code search matches words, not intent: "accessibility" also hits "accessibility of the API" or tool docs.
  - The bare query `filename:AGENTS.md aria` returned 304,128, which is implausible (token noise), so it's dropped.

| File | All files | "accessibility" | Other terms | Ultracite's text |
| --- | --- | --- | --- | --- |
| `AGENTS.md` | 1,075,200 | 36,160 (3.4%) | `a11y` 8,128; `WCAG` 12,416; `"semantic HTML"` 6,880; `"jsx-a11y"` 455 | exact line 391; `ultracite` 1,030; `ultracite accessibility` 459; `"Ultracite Code Standards"` 366 |
| `CLAUDE.md` | 860,160 | 32,000 (3.7%) | `a11y` 6,688; `WCAG` 12,624 | exact line 172; `ultracite` 545 |
| `copilot-instructions.md` | 160,768 | 11,616 (7.2%) | — | — |
| `.cursorrules` | 34,048 | 3,816 (11.2%) | — | exact line 1 |

- **Separating Ultracite's template:**
  - The exact line is `"Use semantic HTML and ARIA attributes for accessibility"`. It has been in `packages/cli/src/data/rules.ts` since 2 Nov 2025 (commit 18ed1f31).
  - It accounts for about 391–459 of the 36,160 AGENTS.md hits (about 1.1–1.3%) and 172–545 of the 32,000 CLAUDE.md hits (about 0.5–1.7%).
  - So Ultracite's template is a small share of the accessibility mentions.
- **Reading:** a small minority of agent instruction files mention accessibility at all. Copilot and Cursor instruction files mention it more often than AGENTS.md and CLAUDE.md. That may reflect GitHub's push (5.36) or older, frontend-heavy `.cursorrules` templates. That's a guess I didn't test.

---

## 6. Limits of lint specifically

### 6.1 What the tools say about their own limits. VERIFIED

- **jsx-a11y, 2016–2022:** static tools "cannot determine values of variables that are being placed in props before runtime", / "so linting will not fail if that value is undefined" / "and/or does not pass the lint rule." (Consecutive segments of one sentence.)
- **jsx-a11y, now:** "Because it only catches errors in static code"; "Consider these tools just as one step of a larger a11y testing process".
- **jest-axe README:** "This project does not guarantee that what you build is accessible." It compares axe to code linters, which "can find common issues but cannot guarantee that what you build works for users."
- **Lighthouse:** "Automatic detection can only detect a subset of issues" (1.34).
- **axe-core README:** elements it can't be certain about come back as "incomplete" for manual review.
- **For the post:** no tool in this chain claims completeness. Lint is the narrowest of them, because it sees only source text.

### 6.2 Custom components and polymorphic elements. VERIFIED

- **jsx-a11y settings:**
  - "To enable your custom components to be checked as DOM elements", you set global settings. Example: `"components": { "CustomButton": "button", … }`.
  - Added in 6.6.0 (24 June 2022; commit 64dcac6, "Introduce a plugin-wide setting for custom components", Pascal Corpet).
  - `polymorphicPropName` came in 6.8.0 (1 Nov 2023, Kendall Gassner). With it, `<Box as="h3">` "will be evaluated as an `h3`".
  - `polymorphicAllowList` came in 6.10.0 (4 Sep 2024).
  - The README warns: "Polymorphic components can make code harder to maintain; please use this feature with caution."
- **How it works:** `getElementType` reads the polymorphic prop with `getLiteralPropValue`, so only a literal `as="..."` changes the element type. `<Box as={tag}>` stays `Box`. That makes it a custom component, which most rules skip (confirmed in 6.7).
- **Per-rule component options:** `label-has-associated-control` has `labelComponents`, `controlComponents`, `labelAttributes` and `depth` ("default 2, max 25"). `anchor-is-valid`, `anchor-has-content`, `heading-has-content` and `img-redundant-alt` have `components`.
- **Biome:**
  - No global component map.
  - `noStaticElementInteractions`: "Custom components are not checked." `useKeyWithClickEvents`: "this rule doesn't apply to user created component". `noNoninteractiveElementInteractions` lists "Custom component is not checked." and "Spread attributes is not supported."
  - `noLabelWithoutControl` has `inputComponents` and `labelComponents`, but they "don't have support for namespace components (e.g. `<Control.Input>`)."
- **Oxlint:** reads `components` and `polymorphicPropName` from `settings["jsx-a11y"]`.
- **Composition props:** Radix `asChild` and Base UI/shadcn `render` merge two JSX nodes into one element at runtime. Both linters evaluate them separately and report false positives (`anchor-has-content`, `control-has-associated-label`). Requests are open in jsx-a11y #1091 (19 June 2026, no replies) and Oxc #23645 (same author, same day).
- **Lead check:** the brief mentions a `label-has-associated-control` "limitations section about not being able to determine nesting through components". No such section exists in 6.10.2 or on `main`. The doc covers custom components with options and `depth` instead.

### 6.3 Dynamic values and spread props: which way does a rule fail? VERIFIED

- **Fails closed (reports):**
  - `jsx-a11y/alt-text`: "passing props as spread attribute without explicitly the necessary accessibility props defined" / "will cause this rule to fail." Its "Bad" example is `<img {...props} />`.
  - Biome `useAltText` behaves the same (6.7).
- **Fails open (passes):**
  - `jsx-a11y/aria-role`: `<div role={role}>` is "Good: role is a variable & cannot be determined until runtime."
  - `control-has-associated-label`: "The rule is permissive", in that "it will assume that expressions will eventually provide a label." So `<button type="button">{maybeSomethingThatContainsALabel}</button>` passes.
  - `no-static-element-interactions` with `allowExpressionValues: true` (set in recommended) passes `role={ROLE_BUTTON}` and ternaries of literals.
  - Biome `useButtonType`: it "ignores `type` values that aren't string literals", "because their value can't be known statically." It also says `<button {...props}>` "doesn't need a `type` attribute, because the spread may provide it."
- **Contrast:** eslint-plugin-react `button-has-type` lists `<button type={foo}>` as incorrect.
- **Also:** `<img alt={alt} {...props} />` passes everywhere, though `alt` may be `undefined` at runtime (6.7).
- **For the post:** every rule must guess when it meets an expression. The guess differs by rule and by linter, and users usually can't tell which way a rule guesses.

### 6.4 A role is not behaviour. VERIFIED

- **jsx-a11y `no-static-element-interactions` and `no-noninteractive-element-interactions`:** "Adding a role to your element does **not** add behavior." "The developer is responsible for providing the expected behavior". That means focusability and key press support.
- **Bubbled events:** if a `<div>` only catches bubbled clicks, "there are no appropriate roles for your element" / "you will have to deactivate the rule."
- **interactive-supports-focus:** for composite widgets, "you will need to implement the key handling behaviors". Arrow-key traversal "is not provided by the browser or the assistive technology."
- **click-events-have-key-events:** it requires only that one of `onKeyUp`, `onKeyDown` or `onKeyPress` is present. It doesn't check what the handler does.
- **For the post:** the rules check that handlers and attributes exist, not that they work. An agent can satisfy `click-events-have-key-events` with an empty `onKeyDown`. 6.12 tests the pattern: a no-op handler satisfies the key-event rules in all three linters, and only `prefer-tag-over-role` or `useSemanticElements` catches it. Whether agents actually write it is untested (5.50).

### 6.5 `anchor-is-valid` and the stale Next.js advice. VERIFIED

- **jsx-a11y doc (6.10.2 and `main`):** "Case: I use Next.js and I'm getting this error inside of `<Link>`s". It calls this a "known issue" and gives workarounds "Until the Next.js API can be updated", including `passHref` with a dummy `href`. Added 3 Feb 2021 (commit 42ce5b7).
- **Next.js 13 blog (25 Oct 2022, Vendor):** "`next/link` no longer requires manually adding `<a>` as a child." The breaking changes add: "The `next/link` child can no longer be `<a>`."
- **For the post:** a case where the rule's own docs give advice for an API that no longer exists. An agent reading them could be misled.

### 6.6 What no JSX rule can see. VERIFIED (from the tools' own lists)

- **Lighthouse's 10 manual audits** ("areas which an automated testing tool cannot cover"): `focusable-controls`, `interactive-element-affordance`, `logical-tab-order`, `visual-order-follows-dom`, `focus-traps`, `managed-focus`, `use-landmarks`, `offscreen-content-hidden`, `custom-controls-labels`, `custom-controls-roles`.
- **Contrast and rendering:** contrast depends on computed CSS, so no lint rule checks it. jest-axe turns contrast off because it doesn't work in JSDOM. Playwright's page lists contrast first among things its axe tests "can catch" in a real browser.
- **Focus management and runtime state:** where focus goes when a dialog opens or closes (6.9), and whether `aria-expanded` actually toggles. Lint sees only the initial JSX, not state changes.
- **For the post:** lint and runtime tools cover different, partly overlapping ground. Lint is early and cheap but blind to rendered output.

### 6.7 My check: one fixture through three linters (15 Oct 2026). VERIFIED (local run; ad hoc)

- **See also:** the fixture is `scratchpad/a11y-check/cases.jsx` with its configs beside it. 6.12 is the larger, re-runnable check.

Setup:

- Oxlint 1.86.0, with the jsx-a11y plugin and `settings["jsx-a11y"] = { polymorphicPropName: "as", components: { Button: "div" } }`.
- ESLint 10.12.0 with jsx-a11y 6.10.2, using recommended options and the same settings.
- Biome 2.5.15, with the a11y rules set to error.
- Rules: `alt-text`/`useAltText`, `no-autofocus`, `click-events-have-key-events`, `no-static-element-interactions`, `control-has-associated-label` (Oxlint and ESLint only), `anchor-is-valid`/`useValidAnchor`, and `useButtonType` (Biome only).

| Code | Oxlint | ESLint jsx-a11y | Biome |
| --- | --- | --- | --- |
| `<img {...props} />` | alt-text | alt-text | useAltText |
| `<img alt={alt} {...props} />` | pass | pass | pass |
| `<button {...props}>Save</button>` | pass | pass | pass (useButtonType skips spreads) |
| `<dialog><input autoFocus /></dialog>` | pass | no-autofocus\* | pass |
| `<div role="dialog"><input autoFocus /></div>` | pass | no-autofocus\* | noAutofocus |
| `<div popover="auto"><input autoFocus /></div>` | pass | no-autofocus\* | pass |
| `<input autoFocus />` | no-autofocus | no-autofocus\* | noAutofocus |
| `<div autoFocus="false" />` | pass | no-autofocus | noAutofocus |
| `<Button onClick>` (mapped to `div`) | click-events + no-static | click-events + no-static | pass (no component map) |
| `<div onClick>` | click-events + no-static | click-events + no-static | useKeyWithClick + noStatic |
| `<div role={role} onClick>` | click-events + no-static | click-events only (`allowExpressionValues`) | useKeyWithClick + noStatic |
| `<a onClick>Go</a>` | anchor-is-valid + click-events + no-static | same three | useValidAnchor + useKeyWithClick + noStatic |
| `<Box as={as} onClick>` | pass | pass | pass |
| `<Box as="div" onClick>` | click-events + no-static | click-events + no-static | pass (no polymorphic support) |
| `<button type="button">{label}</button>` | pass | pass | pass |

What it shows:

- The three linters disagree on 7 of the 15 lines (dialog, `role="dialog"`, popover, `autoFocus="false"`, `role={role}`, mapped `<Button>`, `<Box as="div">`). Two of the seven (`<Button>`, `<Box as="div">`) differ only because Biome has no component or polymorphic settings.
- **Documentation contradicts behaviour on `autoFocus="false"` in both directions.** jsx-a11y's doc lists it under "Succeed", but released 6.10.2 flags it, because the fix is unreleased (1.31). Oxlint's doc lists it under "incorrect", but its code returns early for a `"false"` literal (`is_false_attribute_value`) and doesn't flag it.
- \* ESLint's `control-has-associated-label` (run with no options, and not in `recommended`) also flagged each unlabeled `<input>`. Oxlint's port of the same rule, also at `error` with no options, did not. That is another implementation difference, but one that depends on config; jsx-a11y's own docs suggest `ignoreElements` that include `input`.
- Scripts weren't saved into the repo. Re-run with the harness before citing.

### 6.8 The `no-autofocus` rule: what each linter says and when it changed. VERIFIED

- **jsx-a11y (`docs/rules/no-autofocus.md`, unchanged in substance since 2017):**
  - "Auto-focusing elements can cause usability issues for sighted and non-sighted users, alike."
  - The only option, `ignoreNonDOM`, "determines if developer created components are checked".
  - Guidelines line: "General best practice (reference resources)". It names no WCAG criterion.
  - Resources: the WHATWG autofocus section and Bruce Lawson's 2009 post (6.9).
- **Origin:** PR #147, "[new] - Add no-autofocus rule.", by `beefancohen` (Cohen), merged 2 Jan 2017. Its entire body is a link to a Steve Faulkner tweet (status 815884132874092544). The tweet wasn't opened. `ignoreNonDOM` was added 18 Apr 2017 (#213) after #179 asked that `<Foo autoFocus />` be ignored.
- **Biome `noAutofocus` (JSX; `no_autofocus.rs` on `main`):**
  - "Autofocusing elements can cause usability issues for sighted and non-sighted users, alike." Then the attribute "should be added to the element the user is expected to interact with" on opening a modal dialog or popover.
  - Valid examples: `<div popover><input autoFocus /></div>` and `<dialog><input autoFocus /></dialog>`. `role="dialog"` isn't exempt.
  - Diagnostic note: "Autofocus moves keyboard focus without the user asking for it."
  - History: issue #4339 (19 Oct 2024, on Biome 1.9.4) said the rule "contradicts with MDN recommendations for <dialog>". PR #4475 by `seeintea` was merged 9 Nov 2024 and first shipped in 2.0.0-beta and 2.0.0 (17 June 2025). The HTML version has the same exemptions (#8641).
- **Oxlint `jsx-a11y/no-autofocus`:**
  - Under "Exceptions": "`<dialog>` elements, elements with `role="dialog"`," / "and elements with the `popover` attribute (and their descendants) are exempt". The reason: "directing focus into them when opened is the expected behavior."
  - Added by PR #22289 (merged 17 May 2026, closing #22287), released in oxlint v1.66.0 (19 May 2026). The PR author wrote: "we haven't discussed whether this change is appropriate".
- **Svelte `a11y_autofocus`:** the docs just say "Avoid using autofocus". The compiler skips `dialog` and its descendants (`node.name !== 'dialog' && !is_parent(context.path, ['dialog'])`). That change came in PR #16341 (merged 11 July 2025), closing #9225 (18 Sep 2023). Popover isn't exempt.
- **angular-eslint `no-autofocus`:** its rationale text says autofocus inside `<dialog>` "is actually recommended for accessibility". It "automatically allows autofocus when used within dialog elements". Added 14 Jan 2026 (PR #2851).
- **eslint-plugin-vuejs-accessibility `no-autofocus`:** no dialog exception; same wording as jsx-a11y.
- **Ultracite (for context):** `"jsx-a11y/no-autofocus": "off"` in `config/oxlint/react/index.mjs` and `config/eslint/react/rules/jsx-a11y.mjs`; `"noAutofocus": "off"` in `config/biome/core/biome.jsonc` (checked in the worktree).

### 6.9 The counter-case from specs and guidance. VERIFIED

- **WHATWG HTML, the `dialog` element** (multipage `interactive-elements.html`, fetched 2026-10-15):
  - "An important part of user-facing dialog behavior is the placement of initial focus."
  - The dialog focusing steps "might not be a substitute for authors carefully thinking through the correct choice".
  - "authors should use the autofocus attribute on the descendant element of the dialog" / "that the user is expected to immediately interact with after the dialog opens." If there is none, they should put it on the `dialog` itself.
  - **Dialog focusing steps:** "If subject has the autofocus attribute, then set control to subject." Otherwise the dialog's focus delegate is used.
- **WHATWG HTML, the autofocus attribute** (`interaction.html`): it marks an element "to be focused as soon as the page is loaded". On an element inside a `dialog` or a `popover` element, "it will be focused when the dialog or popover becomes shown." I found no accessibility warning in this section.
- **MDN `autofocus`** (mdn/content source):
  - "Accessibility concerns": autofocus "can confuse visually-impaired people using screen-reading technology and people with cognitive impairments". It adds: screen-readers "teleport" their user to the form control without warning them beforehand.
  - It also mentions page scroll on load and on-screen keyboards popping up.
- **MDN `<dialog>`:**
  - The `autofocus` attribute "should be added to the element the user is expected to interact with" / "immediately upon opening a modal dialog".
  - Accessibility section: autofocus "will help ensure initial focus is set on the element deemed the best" initial focus placement.
- **WAI-ARIA APG, Dialog (Modal) Pattern:**
  - "When a dialog opens, focus moves to an element inside the dialog." "Generally, focus is initially set on the first focusable element."
  - The note gives alternatives: a static element with `tabindex="-1"` for long content, or "the least destructive action" for irreversible actions.
  - "When a dialog closes, focus returns to the element that invoked the dialog".
- **WCAG 2.2 Understanding:**
  - SC 3.2.1 On Focus: when a component "receives focus, it does not initiate a change of context". Its failure example is a help dialog that opens on focus, "moving the keyboard focus away from the control". This is about focus causing changes, not about where focus lands.
  - SC 2.4.3 Focus Order: in its modal example, "a dialog opens and focus is set within the dialog". When dismissed, "focus returns to the button or the element following the button."
  - Neither page mentions page-load autofocus.
- **Bruce Lawson, "The accessibility of HTML 5 autofocus," 27 May 2009** (the source jsx-a11y and Biome cite). Read from the Wayback capture of 27 Dec 2009.
  - It isn't a ban. "autofocussing into a form is a usability win for most people" when the page's purpose is that form; he names Google's homepage.
  - The problem: "screenreader users find themselves dumped in the middle of a form, potentially without context".
  - His fix is `aria-describedby` for the explanatory text before the form, not removing autofocus.
- **For the post:**
  - The specs separate two cases. Page-load autofocus is a real but contextual problem. Autofocus inside a dialog or popover when it opens is the recommended way to place initial focus.
  - A blanket rule can't tell them apart from JSX alone. In React, a component that mounts after a click is not "page load" either (6.10).

### 6.10 The debate threads. VERIFIED (each a single thread; ANECDOTAL as evidence of consensus)

- **jsx-a11y #742 (11 Sep 2020, closed):**
  - The question: autofocusing a search input that mounts after a button press.
  - The maintainer said: "'Auto focus' means, automatically when the page loads." He advised `useRef` + `useEffect` + `.focus()` instead.
  - The reporter pointed out React's `autoFocus` is already implemented as `.focus()` on mount. The maintainer replied: "Fair point - that kind of calls into question this entire lint rule." He tagged Jesse Beach. No further reply.
- **jsx-a11y #816 (20 Oct 2021, open, no comments):** argues the ARIA `alertdialog` guidance ("authors SHOULD set focus to an … element within the alert dialog") contradicts the rule.
- **jsx-a11y #1062 (21 Oct 2025, open):** asks for an allow-list of components (e.g. react-aria `Dialog`, `Menu`). The maintainer's first reply: "Can you elaborate on why it should be respected in _any_ case?" Later he suggested a possible `ignoredComponentNames` option.
- **jsx-a11y #1093, "Reconsidering the `no-autofocus` rule" (8 July 2026, open, 5 comments):**
  - By `smhigley`, who describes themself in the thread as "a member of the w3c & Open UI".
  - Argues the maxim "has been outdated for a while now, and mostly lasted through inertia". It quotes the HTML dialog and popover specs, MDN, and the Open UI popover explainer.
  - The maintainer: "'don't use autofocus' means 'don't use the html attribute'. It's perfectly fine to manually `.focus()`". (Quoted from his comment; the inner quotes are his.)
  - Last activity: 22 Sep 2026, a follow-up asking for a response. No maintainer reply since 9 July.
- **Biome #4339, Svelte #9225, Oxc #22287:** each opened by a user citing the WHATWG dialog paragraph or MDN. Each led to an exemption (6.8).
- **For the post:**
  - Ultracite's choice to turn the rule off is now closer to where Biome, Oxlint, Svelte and Angular have moved than to jsx-a11y's position. But no linter has dropped the rule outright for page-load autofocus.
  - Ultracite's own history is in the preset notes at the end: the rule has been off since the first ESLint config (18 Mar 2022), with no recorded reason.

### 6.11 Runtime checks alongside lint. VERIFIED (docs); Vendor where noted

- **See also:** 2.1–2.3 for the GDS and Deque numbers in full.

- **Playwright, "Accessibility testing" (microsoft/playwright `docs/src/accessibility-testing-js.md`; Vendor: Microsoft):**
  - Uses `@axe-core/playwright`. Its examples of what it can catch: poor contrast, unlabeled controls, duplicate IDs.
  - Disclaimer: "Automated accessibility tests can detect some common accessibility problems". "But many accessibility problems can only be discovered through manual testing."
  - It recommends "a combination of automated testing, manual accessibility assessments, and inclusive user testing", and Accessibility Insights for manual checks.
- **jest-axe:**
  - Cites GDS for "~30% of access barriers are missed by automated testing". It asks you to test with real assistive tech and "include disabled people in user research".
  - "Color contrast checks do not work in JSDOM so are turned off in jest-axe."
- **vitest-axe:** a fork of jest-axe. It "will not work" with the `happy-dom` environment because of a Happy DOM bug.
- **Storybook a11y addon (Vendor):**
  - "Accessibility tests audit the rendered DOM against a set of heuristics". They "act as the first line of QA to catch blatant accessibility violations."
  - It says axe "automatically catches up to 57% of WCAG issues". Results come as violations, passes and "Incomplete" items to check manually.
- **Deque's 57% study (Vendor):** "Automated testing study identifies 57 percent of digital accessibility issues," Deque blog, 10 Mar 2021. It covers over 2,000 audits, "over 13,000 pages" and "nearly 300,000 issues", all first-time assessments. The headline: "on average, 57 percent of accessibility issues were completely covered by this automated testing." It counts by issue volume, not by share of WCAG criteria, which Deque argues understates automation.
- **GDS, "What we found when we tested tools on the world's least-accessible webpage"** (Mehmet Duran, 24 Feb 2017):
  - 143 failures in 19 categories.
  - Tenon found the most errors and warnings (37%). Counting manual prompts, Asqatasun led (41%). Google's Accessibility Developer Tools found 17%.
  - All tools together found 71%. So jest-axe's "~30% … missed" is the combined figure for 10 tools, not what axe alone missed.
- **For the post:**
  - Lint catches a class of mistakes in source before render. Axe in component, E2E or Storybook tests catches rendered-DOM problems, including contrast in a real browser.
  - Both leave focus behaviour, reading order and real assistive-technology use to people.
  - The only coverage numbers here are vendor or government measurements of runtime tools. None of them measures lint.

### 6.12 My check: 32 cases through Ultracite's presets and the plugins' own defaults (15 Oct 2026). VERIFIED (local run); re-run with the harness before quoting

- **Setup.** One component per file, written as an honest pattern or as the shortcut an agent might take. Seven configurations:
  - Ultracite's Oxlint (`core` + `react`), Biome (`core` + `react`) and ESLint (`core` + `react`) presets from `packages/cli/config` in the worktree.
  - jsx-a11y's own `recommended` and `strict` flat configs.
  - Biome with only `"recommended": true`.
  - Oxlint with `--jsx-a11y-plugin` and default categories.
  - Tools: Oxlint 1.86.0, Biome 2.5.15, ESLint 10.12.0, eslint-plugin-jsx-a11y 6.10.2. Only a11y findings are shown, plus `button-has-type` and the empty-function rules.
  - Fixture, configs, `run.sh` and the full per-case output: `scratchpad/a11y-lint-check/` (`summary.txt`).
- **Results.** "U-" = Ultracite preset. "jsx rec/strict" = jsx-a11y's own configs. "B rec" = Biome recommended. "Ox def" = Oxlint default categories. A dash means nothing fired.

| Case | U-Oxlint | U-Biome | U-ESLint | jsx rec / strict | B rec | Ox def |
| --- | --- | --- | --- | --- | --- | --- |
| `<div onClick>` | click-events, no-static | useKeyWithClick, noStatic, noNoninteractive | click-events, no-static | same two | useKeyWithClick, noStatic | same two |
| `<div role="button" tabIndex={0} onClick onKeyDown={() => {}}>` | prefer-tag-over-role, no-empty-function | useSemanticElements, noEmptyBlockStatements | prefer-tag-over-role, no-empty-function | – | useSemanticElements | prefer-tag-over-role |
| same, with a named `noop` handler | prefer-tag-over-role | useSemanticElements | prefer-tag-over-role | – | useSemanticElements | prefer-tag-over-role |
| `<span role="button" tabIndex={0}>` with a real Enter handler | prefer-tag-over-role | useSemanticElements | prefer-tag-over-role | – | useSemanticElements | prefer-tag-over-role |
| `<div role="button" aria-label="Close" …/>` (no text) | prefer-tag-over-role | useSemanticElements | prefer-tag-over-role | – | useSemanticElements | prefer-tag-over-role |
| `<div onClick onKeyDown>` (no role) | no-static | noStatic, noNoninteractive | no-static | no-static | noStatic | no-static |
| `<img alt="" src="/q3-revenue-chart.png">` (informative) | – | – | – | – | – | – |
| `<img alt="image">` | img-redundant-alt | noRedundantAlt | img-redundant-alt | img-redundant-alt | noRedundantAlt | img-redundant-alt |
| `<img>` (no alt) | alt-text | useAltText | alt-text | alt-text | useAltText | alt-text |
| `<img alt={alt}>` (`alt?: string`) | – | – | – | – | – | – |
| `<img {...props} />` | alt-text | useAltText | alt-text | alt-text | useAltText | alt-text |
| `<button aria-hidden="true">` | no-aria-hidden-on-focusable | noAriaHiddenOnFocusable | no-aria-hidden-on-focusable | – | noAriaHiddenOnFocusable | no-aria-hidden-on-focusable |
| `<div aria-hidden="true"><button>` | – | – | – | – | – | – |
| `<Button onClick={f} />` (custom, unmapped, no label) | – | – | – | – | – | – |
| `<button><svg aria-hidden="true"/></button>` (icon only) | control-has-associated-label | – | control-has-associated-label | – | – | control-has-associated-label |
| `<input type="email">` (no label) | – | – | control-has-associated-label | – | – | – |
| `<input placeholder="Email">` (placeholder only) | – | – | control-has-associated-label | – | – | – |
| `<button onClick>` (no `type`) | react/button-has-type | useButtonType | react/button-has-type | – | useButtonType | – |
| `<h1>` then `<h4>` | – | – | – | – | – | – |
| `// eslint-disable-next-line jsx-a11y/…` above `<div onClick>` | suppressed | still reported (3 rules) | suppressed | suppressed | still reported | suppressed |
| `<a onClick>` | anchor-is-valid, click-events, no-static | useValidAnchor, useKeyWithClick, noStatic | same three | same three | same three | same three |
| `<a href="#" onClick>` | anchor-is-valid | useValidAnchor | anchor-is-valid | anchor-is-valid | useValidAnchor | anchor-is-valid |
| `<input autoFocus aria-label="Search">` | – (off) | – (off) | – (off) | no-autofocus | noAutofocus | no-autofocus |
| `<div tabIndex={0}>` | no-noninteractive-tabindex | noNoninteractiveTabindex | no-noninteractive-tabindex | same | same | same |
| `<div aria-label="Card">` | – | useAriaPropsSupportedByRole | github/a11y-role-supports-aria-props | – | useAriaPropsSupportedByRole | – |
| `<div {...props} />` | – | – | – | – | – | – |
| `<div onMouseOver>` | mouse-events-have-key-events | useKeyWithMouseEvents, noStatic, noNoninteractive | mouse-events, no-static | rec: mouse-events; strict: + no-static | useKeyWithMouseEvents, noStatic | mouse-events |
| `<div aria-labelled="x">` (typo) | aria-props | useValidAriaProps | aria-props | aria-props | useValidAriaProps | aria-props |
| `<button tabIndex={3}>` | tabindex-no-positive | noPositiveTabindex | tabindex-no-positive | same | same | same |
| `<Clickable onClick>Save</Clickable>` (custom) | – | – | – | – | – | – |
| `<label>Email <TextField /></label>` (custom input) | label-has-associated-control | noLabelWithoutControl | label-has-associated-control | label-has-associated-control | noLabelWithoutControl | label-has-associated-control |
| `<div aria-hidden="true" onClick>` (mouse-only, hidden from AT) | – | – | – | – | – | – |

- **What it shows:**
  - **The classic workaround is a jsx-a11y-defaults problem, not a lint problem.** `role="button"` plus `tabIndex` plus any key handler passes jsx-a11y's own `recommended` and `strict` configs. It fails Ultracite's three presets, Biome's recommended set and Oxlint's default category, because each turns on `prefer-tag-over-role` or `useSemanticElements`. The empty arrow is caught by a non-a11y rule (`no-empty-function`, `noEmptyBlockStatements`). Moving it into a named `noop` gets past that, but not past `prefer-tag-over-role`.
  - **A full bypass:** `<div aria-hidden="true" onClick>` passes all seven configurations with zero diagnostics. The interaction rules skip elements hidden from assistive technology, and the `aria-hidden` rules only check focusable elements. 5.48 found the same independently. No agent has been documented doing it.
  - **What none of the seven configurations sees:** empty `alt` on an informative image, an `alt` that may be `undefined`, `aria-hidden` on a wrapper around a focusable element, unmapped custom components, spread props on a `div`, and skipped heading levels. The last matters for the AGENTS.md line "Use proper heading hierarchy": no rule in any of the three linters checks it, though 41.8% of WebAIM Million home pages skip a level (3.1).
  - **False positives in the other direction:** all seven flag `<img {...props} />` (the spread may carry `alt`) and a `<label>` that wraps a custom `<TextField>`. Ultracite's ESLint preset maps `Input`, `Select`, `Textarea`, `Checkbox` and `Radio` as controls, but not `TextField`.
  - **Implementations of the "same" rule differ.** ESLint's `control-has-associated-label` (no options) flags an unlabeled `<input>`; Oxlint's port doesn't, and Biome has no equivalent. Oxlint and ESLint flag an icon-only `<button>` whose `<svg>` is `aria-hidden`; Biome doesn't. Oxlint's `no-static-element-interactions` ignores `onMouseOver`, like jsx-a11y's `recommended` options; Ultracite's ESLint preset (rule defaults) and `strict` flag it.
  - **Suppression comments don't travel.** Biome ignores `eslint-disable` comments, so an ESLint-style suppression in a Biome project silences nothing.
- **Caveats:** one hand-written fixture, with one file per case and no type information. It shows what each configuration does with each pattern, not how often a pattern occurs. Part of the Ultracite ESLint column comes from `eslint-plugin-github`, which Ultracite's ESLint core preset includes and its Oxlint core doesn't (Oxlint has it only in the opt-in `js-plugins` preset).

---

## 7. Added while writing the post

Checked on 2026-10-16 for the experiment sections.

### 7.1 ARIA Authoring Practices Guide, Accordion pattern (W3C WAI, live page). VERIFIED

- **Citation:** W3C WAI ARIA Authoring Practices Task Force, _ARIA Authoring Practices Guide_, "Accordion Pattern (Sections With Show/Hide Functionality)." https://www.w3.org/WAI/ARIA/apg/patterns/accordion/ (checked 2026-10-16).
- **What it says:**
  - "Each accordion header button is wrapped in an element with role heading".
  - "The button element is the only element inside the heading element."
  - When the panel is visible, "the header button element has aria-expanded set to true."
- **For the post:** the pattern for a disclosure header is a button inside the heading, `<h3><button aria-expanded>…</button></h3>`, not a heading inside a button.

### 7.2 WAI-ARIA 1.2, the `button` role and "Children Presentational" (W3C Recommendation 2023). VERIFIED

- **Citation:** W3C, _Accessible Rich Internet Applications (WAI-ARIA) 1.2_, §5.4 `button` and §5.2.9 "Presentational Children." https://www.w3.org/TR/wai-aria-1.2/#button (checked 2026-10-16).
- **What it says:**
  - The `button` role's characteristics table lists "Children Presentational: True".
  - §5.2.9: "The DOM descendants are presentational." "User agents SHOULD NOT expose descendants of this element through the platform accessibility API."
- **For the post:** a heading inside a button stops being exposed as a heading, so it drops out of heading navigation.

### 7.3 HTML Living Standard, the `button` content model and the heading elements' categories (WHATWG). VERIFIED

- **Citation:** WHATWG, _HTML Living Standard_, §4.10.6 "The button element" (https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element) and §4.3.6 "The h1, h2, h3, h4, h5, and h6 elements" (https://html.spec.whatwg.org/multipage/sections.html#the-h1,-h2,-h3,-h4,-h5,-and-h6-elements), checked 2026-10-16.
- **What it says:**
  - `button` content model: "Phrasing content, but there must be no interactive content descendant" / "and no descendant with the tabindex attribute specified."
  - `h1`–`h6` categories: "Flow content. Heading content. Palpable content." Phrasing content isn't among them.
- **For the post:** an `<h3>` inside a `<button>` isn't valid HTML.

### 7.4 Excalidraw #3871, "feat: Make color ARIA labels better" (GitHub, merged 2 Aug 2021). VERIFIED

- **Citation:** https://github.com/excalidraw/excalidraw/pull/3871 (read with `gh pr view`, 2026-10-16).
- **What it says:** the author tested Excalidraw with a remote assistive-technology service and found the colour swatches labelled by hex code; the "Before" markup has `aria-label="#be4bdb"`. The PR replaced those labels with Open Color names. It is in the corpus history sample (`research/corpus/results/accessibility/history-lint.json`): no name rule fired before the fix, and only adjacent rules (`button-has-type`, `github/a11y-no-title-attribute`) fired on the lines.
- **At the pinned commit** (`4c00f31d`), `PickerColorList.tsx` L87–L116 names its swatches `` `${label} — ${keybinding}` `` from `t(`colors.…`)`, while `TopPicks.tsx` names them only by `title={color}`.

### 7.5 Biome 2.5.15, `biome explain` for the rules in the Biome arm (my check). VERIFIED

- Run on 2026-10-16 with the worktree's Biome 2.5.15.
- `noStaticElementInteractions`: "Enforce that static, visible elements (such as `<div>`) that have click handlers use the valid role attribute."
- `useKeyWithClickEvents`: "Enforce elements with a click event handler to also have at least one keyboard event handler."
- `noNoninteractiveElementInteractions`: "Disallow use event handlers on non-interactive elements."
- **For the post:** like Oxlint's help text, Biome's own descriptions point at a role or a key handler first. In the experiment's Biome arm, Ultracite's handoff didn't carry these descriptions (agent-experiment REPORT §9.1).

## Notes on Ultracite's presets (for Hayden, not for the post)

Checked in the worktree on 15 Oct 2026. Per AGENTS.md, these are for you to decide on, not to write around.

- **Where the rules live differs by linter.**
  - **Oxlint:** the `jsx-a11y` plugin is enabled only in `config/oxlint/react/index.mjs`, with all 36 rules at `error` except `jsx-a11y/no-autofocus: "off"`. It isn't in `core`.
  - **Biome:** the `a11y` group is in `config/biome/core/biome.jsonc`, so every Biome user gets it: 36 JS/JSX rules at `error`, `noAutofocus: "off"` and the CSS rule `useGenericFontNames`. `biome/svelte` turns off `useValidLang` for `app.html`, so Biome's a11y rules evidently reach Svelte/HTML files too.
  - **ESLint:** `config/eslint/react/rules/jsx-a11y.mjs` turns on every non-deprecated jsx-a11y rule at `error`. It overrides `label-has-associated-control` (`controlComponents: Input, Select, Textarea, Checkbox, Radio`; `labelComponents: Label`; `depth: 3`) and sets `no-autofocus` off. ESLint `core` also includes `eslint-plugin-github`'s `github/a11y-*` rules. Oxlint gets those only through the opt-in `js-plugins` preset (`github/a11y-aria-label-is-well-formatted`, `a11y-no-title-attribute`, `a11y-no-visually-hidden-interactive-element`, `a11y-role-supports-aria-props`, `a11y-svg-has-accessible-name`). That is why `<div aria-label="Card">` is flagged by Ultracite's ESLint and Biome presets but not by its Oxlint preset (6.12).
- **Possible gap: frameworks other than React get no template a11y lint on Oxlint or ESLint.** `src/utils.ts` maps `next`, `@remix-run/react`, `react-router` and the TanStack React packages to `react`. Solid, Qwik, Astro, Vue, Svelte and Angular are not mapped. So:
  - Solid and Qwik (both JSX) get no `jsx-a11y` rules on Oxlint or ESLint. eslint-plugin-solid's README itself suggests jsx-a11y (1.41).
  - The ESLint Vue preset doesn't include `eslint-plugin-vuejs-accessibility`.
  - The ESLint Angular preset imports `@angular-eslint/eslint-plugin` only, so the template plugin's `template-accessibility` rules aren't on (1.37).
  - The ESLint Astro preset doesn't enable `eslint-plugin-astro`'s `astro/jsx-a11y/*` rules (1.41).
  - The ESLint Svelte preset turns on every `svelte/*` rule, including `svelte/valid-compile`, which surfaces the compiler's `a11y_*` warnings. Svelte is the one non-React framework with template a11y checks on ESLint.
  - Biome's core `a11y` group applies whatever the framework, as far as Biome parses the file.
  - The post shouldn't list which preset enables what, but you may want to decide whether this is intended.
- **`no-autofocus` history.** It has been off since the very first commit of Ultracite's ESLint config: `e403fb15`, "Create ESLint configuration," 18 Mar 2022 (`"jsx-a11y/no-autofocus": "off"` in `src/eslint.js`). It carried over into Harmony V2 (`5b7d6da3`, 14 Jan 2023), the Biome switch (`c92a9d2e`, 18 Jul 2024, whose README used `noAutofocus` as its example of overriding a rule) and the Oxlint preset. No commit message, changeset or issue gives a reason. `gh search issues/prs --repo haydenbleasel/ultracite autofocus` returns nothing. (Searching only Biome's rule name, `git log -S "noAutofocus"`, finds `86ee61e3`, 20 Oct 2025, at the earliest, which understates it.) **The rationale needs to come from you.**
  - What has changed since: Biome's `noAutofocus` (2.0.0, June 2025) and Oxlint's `jsx-a11y/no-autofocus` (v1.66.0, May 2026) now exempt `<dialog>` and `popover` (Oxlint also `role="dialog"`). jsx-a11y doesn't. So turning the rule back on would flag only page-level autofocus in two of the three linters, and the dialog case too in ESLint (6.8).
  - Suppression counts suggest the rule is widely unpopular (`no-autofocus` is the second most suppressed jsx-a11y rule, 5.51). Vercel's guidelines tell agents to autofocus "On desktop screens with a single primary input" (5.32).
- **The AGENTS.md accessibility block.**
  - It sits under "React & JSX" in `src/data/rules.ts` and `skills/ultracite/references/code-standards.md`, though the Biome rules apply to every framework.
  - Until 2 Nov 2025 (`18ed1f31`, "Resolves #343", "Rules improvements") the rules file listed about 30 one-line a11y bullets, one per Biome rule ("No `aria-hidden="true"` on focusable els", and so on). They were replaced by the current five-bullet summary.
  - "Use semantic HTML and ARIA attributes for accessibility" leads with ARIA. Bailey's warning about LLMs applying roles literally (5.47) and Microsoft's native-first instruction scoring best (5.41) both cut against that wording. The sub-bullet "Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles" matches `prefer-tag-over-role`/`useSemanticElements`, which Ultracite turns on.
  - "Use proper heading hierarchy" has no lint rule behind it in any of the three linters (6.12).
  - Ultracite's exact line appears in about 391 AGENTS.md and 172 CLAUDE.md files on GitHub (my check, 5.52).
- **Divergences found in 6.12 that the parity script can't catch**, because it compares severities, not behaviour:
  - Unlabeled `<input>`: flagged only by ESLint's `control-has-associated-label`.
  - Icon-only `<button>` with an `aria-hidden` `<svg>`: Oxlint and ESLint flag it; Biome doesn't.
  - `<div onMouseOver>`: Oxlint's `no-static-element-interactions` doesn't flag it; ESLint's does with default options.
  - `<div aria-label>`: ESLint (via `eslint-plugin-github`) and Biome flag it; Oxlint core + react doesn't.
- **Docs that are out of date upstream.** jsx-a11y's `anchor-is-valid` Next.js section predates Next.js 13 (6.5). jsx-a11y's README recommends `@axe-core/react`, which "does not support React 18 and above" (1.33). The jsx-a11y and Oxlint `no-autofocus` docs contradict their released behaviour on `autoFocus="false"` (6.7). None is Ultracite's, but agents reading rule docs will hit them.

---

## Things that turned out wrong or different

**Standards, ARIA and the law (section 1)**

- **_Using ARIA_ was never a W3C Note.** It was a series of Working Drafts (2013–2018) and is now a **Discontinued Draft (24 Feb 2026)**. W3C says it is "inappropriate to cite this document as other than abandoned work". The current text has four rules; the 2018 draft had five (the fifth: interactive elements need an accessible name). Editors: Steve Faulkner and David MacDonald, with Daniel Montalvo (W3C) added on the 2026 version.
- **The APG does not cite the WebAIM Million.** The "No ARIA is better than Bad ARIA" section contains no statistic, either now or in the pre-2022 APG source. The "pages with ARIA have more errors" claim comes from WebAIM's own report: 59.1 against 42 errors in 2026, with WebAIM's own causation caveat.
- **Special districts were never in the first DOJ tier.** The 2024 rule put "any public entity that is a special district government" with small entities (26 Apr 2027). Only entities serving 50,000 people or more had 24 Apr 2026. Both dates have since moved a year, to 26 Apr 2027 and 26 Apr 2028, by the 20 Apr 2026 interim final rule.
- **The DOJ change was an interim final rule, effective on publication, not a proposal.** HHS issued a matching one for Section 504 (11 May 2026). The NFB's challenge (D. Md., filed 21 May 2026) is pending.
- **ISO/IEC 40500 is no longer just WCAG 2.0.** ISO/IEC 40500:2025 is WCAG 2.2 (October 2023 text), announced 21 Oct 2025. W3C expects a 40500:2026 for the December 2024 text.
- **WCAG 2.1 and 2.2 have later editions.** WCAG 2.1 was republished on 21 Sep 2023, 12 Dec 2024 and 6 May 2025; WCAG 2.2 on 12 Dec 2024. Cite the dated URL. The 2023 WCAG 2.1 edition already treats 4.1.1 as "always satisfied" for HTML.
- **WCAG 1.0 is formally a Superseded Recommendation (18 May 2021).**
- **WCAG 3's "not backward compatible" line is from the 2021 first draft, not the current one.** The 10 Sep 2026 draft dropped it, along with the 0–4 outcome scoring and the Bronze 3.5 threshold. Bronze, Silver and Gold survive only as reporting tiers 4–6 above conformance. Percentage scoring is an alternative in the Explainer.
- **EN 301 549 V4 is no longer a draft.** V4.1.1 (2026-09) was adopted on 24 Aug 2026 and aligned with WCAG 2.2. I found no OJ citation under the EAA yet.
- **The 2000 Section 508 standards have two page citations:** 65 FR 80500 (Federal Register API; the rule's own page range 80500–80528) and 65 FR 80499 (as cited in the 2017 rule).
- **Seyfarth's 2024 post has a typo:** 2023's total appears once as "2,749" but is 2,794 everywhere else, and only 2,794 matches its own "342 fewer". Seyfarth's 2026 mid-year post counts all federal Title III suits (5,006), not website suits.
- **Seyfarth's posts carry two bylines:** "By Brian Covelli" (the uploader) and the attorney authors. Cite the attorneys.

**Tooling origins (section 1)**

- **jsx-a11y was never an Airbnb repo.** It started under Ethan Cohen's account (`evcohen/eslint-plugin-jsx-a11y`) and moved to the `jsx-eslint` org in 2020. Airbnb's role was adopting it in eslint-config-airbnb 7.0.0 (11 Apr 2016), whose changelog misnames it `eslint-plugin-a11y`.
- **jsx-a11y's early rule names come from react-a11y,** and its README said so until Feb 2022. Its first ARIA-role rule was based on Google's Accessibility Developer Tools `AX_ARIA_01`.
- **axe-core's code predates its launch by a year.** The git history starts 1 May 2014; npm 1.0.0 is 8 June 2015, and the announcement is 10 June 2015.
- **Lighthouse:** I could date its use of axe-core (Apr 2016 commit), but not the first release with an "Accessibility" category. The "only a subset of issues" sentence is in Lighthouse's report string, not on the "Lighthouse accessibility score" page.
- **React's accessibility page dates from June 2017** (PR #9519 by Almero Steyn), not from reactjs.org's launch. react.dev has no equivalent and never mentions jsx-a11y or axe.
- **@axe-core/react doesn't support React 18+** (README since Feb 2024). jsx-a11y's README still recommends it.
- **Rome created the `a11y` group in Nov 2022** (PR #3471, released in 10.0.0). `useButtonType` came a release earlier, in 0.10.0. Biome is the Aug 2023 fork.
- **Oxlint's port is complete for live rules:** 36 of 36, the first on 2 Nov 2023. The plugin isn't on by default.
- **eslint-plugin-vue-a11y and eslint-plugin-vuejs-accessibility are different packages by different authors.** The second credits the first. They aren't a rename.
- **Qwik's `jsx-a` and `jsx-img` rules are SEO and performance rules,** even though Biome lists `jsx-a` as a source for an a11y rule.

**Automated checking and the state of the web (sections 2 and 3)**

- **GDS numbers depend on the date.**
  - The blog (24 Feb 2017) has **10 tools and 143 barriers**. Best: Tenon at 37% (errors and warnings), Asqatasun at 41% (with prompts). Combined: 71%.
  - The "142 barriers, 13 tools" figures come from the results page after re-tests and additions (Siteimprove, FAE, ASLint), last updated 13 Apr 2018.
  - On that page the best tools are **SortSite at 40%** (errors) and **FAE at 50%** (with prompts). Tenon is 34%, Asqatasun 25% and 47%. Combined: 86% (122/142) with prompts, and 70% (100/142, my count) without.
  - The brief's "Tenon / Asqatasun ~40%" is the 2017 blog, not the current page.
- **Deque's study:**
  - The press release, report and counts are as briefed: over 2,000 audits, 13,000+ pages, 294,958 issues, axe-core, volume weighting.
  - But the data is **WCAG 2.0/2.1 A/AA**, not 2.2. It includes 4.1.1 Parsing (11.7% of issues), which WCAG 2.2 removed.
  - The report itself admits automated issues appear under only 16 of 50 criteria.
- **No direct published critique of the 57% by Adrian Roselli was found.**
  - Roselli criticises tool-percentage claims in general, and cites Chris Yoong calling 57% "a starting point."
  - The nearest critique is Karl Groves (21 Sep 2026), on tools defining coverage. The brief's lead about Roselli specifically criticising volume weighting stays unverified.
- **Vigo, Brown and Conway:**
  - The DOI, authors and title are correct. Justin A. Brown and Vivienne L. Conway were at Edith Cowan University.
  - The abstract has six tools, coverage at most 50%, completeness 14–38% and correctness 66–71%.
  - The "4 websites" lead is not confirmed. An unofficial slide transcript lists three sites. The tool names come only from citing papers.
- **Groves's "25%"** is the automatable share of his own Level A best-practice list (17% at AA), not of issues or criteria. The "25 to 33%" paraphrases don't match his table.
- **"30–40%" has no primary study behind it.** It is repeated by the UK DfE (no source) and the A11Y Project (attributed to GDS, no link). GDS's own single-tool figures run 13–50% depending on version and counting.
- **The ACT Rules Format is now 1.1** (W3C Recommendation, 5 Feb 2026). 1.0 was 31 Oct 2019. Both include the sentence about inferring a DOM tree from JSX.
- **W3C's current wording** is "can not determine accessibility, they can only assist in doing so." The older "can not determine the accessibility of Web sites" appears only in papers quoting an earlier version.
- **WebAIM doesn't give an "X% more errors" ARIA figure for 2025 or 2026.** It gives averages: 57 vs 27 ("over twice as many") and 59.1 vs 42 (+17). The percentage was given only for 2020–2024 (60%, 41%, 70%, 68.6%, 34.2%).
- **WebAIM 2024's ARIA usage (74.6%) is lower than 2023's (80%),** in the year the sample switched to Tranco. The 2024 figure matches 2022's exactly. That may be a coincidence, but check it before citing a trend.
- **Web Almanac 2025's text and figures disagree** on contrast (31% vs 30%) and skip links (24% vs about 26%).
- **Fischer et al. mislabel some criteria in prose** (1.4.5, 1.4.8, 1.4.9). The coverage numbers are unaffected.
- **Frazão and Duarte's "62 of 78"** is what the tools document checking, not measured detection. They didn't check false positives or negatives.
- **W3C already lists source-code linters as their own ACT category,** and ember-template-lint scores 0 consistent rules. No JSX linter (jsx-a11y, Oxlint, Biome) is listed.
- **WebAIM Screen Reader Survey #11 (2026) exists** but has no "problematic items" question. The most-problematic list is from #10.

**Developers (section 4)**

- **Bi et al. (TOSEM) is real and correctly attributed.** arXiv 2103.08778 v1 is from March 2021, and the journal version is TOSEM 31(4), 2022. I read v1. The published text may differ.
- **Alshayban et al.:**
  - "over 1,000 apps" is 1,135.
  - The survey is 61 usable responses (66 received from 740 emails), not a large sample.
  - There is no Android Lint or Accessibility Scanner awareness percentage. The paper says all respondents mentioned using Lint.
  - The "47% of updates improve accessibility" result is contradicted by Chen et al. (TSE 2022), who found 96% of issues unfixed and blame Monkey's coverage.
- **Di Gregorio et al.** appeared in _Empirical Software Engineering_ 27(6):145 (2022), not TACCESS 2021 or JSS. The fourth author is Giuliana Vitiello. The paper's "77% … do not use tools" and "the remaining 13%" don't add up.
- **Vendome et al.:** "over 97% don't use accessibility APIs" is right, from 288 of 13,817 apps (2.08%). Alshayban's reference list scrambles the author order.
- **Tómasdóttir et al.:** the journal version's issue date is 2020 (TSE 46(8)), with early access in 2018. Neither paper says anything about accessibility. The jsx-a11y connection through the airbnb preset is my inference.
- **Patel et al.** is a CHI 2020 _Extended Abstract_ (77 survey responses, 10 interviews), not a full paper.
- **"Leite et al., A Survey of Accessibility in Software Development"** doesn't exist under that title. The likely match is Leite, Scatalon, Freire, Eler, JSS 177 (2021), with 872 respondents.
- **"Miranda & Araujo"** is SAC 2022, with 13 companies. It is about agile requirements, not a general survey.
- **"Pandey & Kameswaran"** wrote about programmers with visual impairments (CSCW 2021; VL/HCC 2022, "Accessibility of UI Frameworks and Libraries for Programmers with Visual Impairments"). That VL/HCC title is about whether UI frameworks are usable _by blind programmers_, not about whether the UIs they produce are accessible. Not opened.
- **Mateus et al.** is a systematic mapping of automated vs. expert vs. user evaluations (JIS 2021). It is not a study of developers' perceptions. Its "less than 40%" counts problem types.
- **Bajammal and Mesbah's "only %26"** for the GDS audit is roughly the mean across 13 tools. The GDS page itself reports 40% best and 13% worst.
- **Yan and Ramachandran** are IBM researchers measuring IBM's own checker, including the "about 67%" coverage estimate.
- **WebAIM's practitioner survey:** the latest edition is #3 (January 2021, n = 758). There is no #4.
- **FTC v. accessiBe:** January 2025 was the proposed order (5-0). The final order was 22 April 2025 (3-0). Both dates appear in secondary sources.
- **The Web Almanac's `role="button"` figure** counts pages with the role. Its link to div misuse is the authors' interpretation.

**AI-written code: studies and repair (5.1–5.31)**

- **Aljedaani et al. 2024 is closed access, so only its abstract numbers are checkable.**
  - Checkable: 88 developers, 84% of sites with issues, 70% and 73% fix rates.
  - Not checkable: the checker names (AChecker, WAVE) and the violation mix (31.8% resize, 26.6% contrast, 16.8% relationships), which come from later papers and a review site.
  - The SLR's "47%/46% fixed" figure belongs to a different Aljedaani paper (SIGCSE 2025).
- **CodeA11y is a Copilot Chat extension for VS Code that reads Deque's static axe DevTools Linter, a paid product.** It is not an axe-core runtime check. The formative study ran in IntelliJ IDEA and used axe-core only to measure results. The back end is GPT-4o. Three of its four significant results are significant only under a one-tailed test (my inference).
- **Guriță and Vatavu's "58% → 19%" is the expert-rated violation rate.** The automated rate rose slightly (15.93% → 17.32%). The models were Claude 3.5 Haiku and GPT-4-turbo, in February 2025. Their "94% success rate" claim is Othman et al.'s number; their own self-evaluation agreement was 76%.
- **Suh et al.'s FeedA11y doesn't feed raw checker output to the model.** An LLM writes the accessibility report from checker rule descriptions and computed CSS. Its QualWeb result with GPT-4o (0.112) is worse than no feedback (0.105). The paper's text and Table 5 disagree on which configuration was best.
- **Feeding real axe output into the same loop made a 7B model's pages worse by some measures** (A11yn): fewer clean pages, a higher weighted violation score. "Tool-in-the-loop helps" is true only with specific feedback and an accept/reject gate.
- **Prompting for accessibility goes both ways, and the wording decides.**
  - Specific WCAG prompts helped in expert review (5.4) and with a system prompt (5.6).
  - Generic "make it accessible" follow-ups hurt (5.9).
  - Suh's zero-shot, few-shot and self-criticism prompts hurt (5.3).
  - Visual design tools got worse (5.10).
- **Calò et al.'s category counts don't add up to the headline 541** (they sum to 1,086).
- **The ACCESS paper's header says ICLR 2024, but I found no ICLR or OpenReview record.** Treat it as an arXiv preprint.
- **Othman et al.'s third author is Aljazi Nasser Al Jabor,** not "Nasser". The "37 of 39" and "94%" numbers are only cited by others.
- **The Mehralian et al. lead is not Android.** FixAlly is iOS/SwiftUI, by Apple researchers.
- **GenA11y is a detection tool, not repair.** He, Huq and Malek, "Enhancing Web Accessibility: Automated Detection of Issues with Generative AI", FSE 2025, https://doi.org/10.1145/3729371; abstract: precision 94.5%, recall 87.61%.
- **Zakharov and Bakaev's "Evaluating Readability and Accessibility of Code Generated by Large Language Models" (APEIE 2025) uses "accessibility" to mean code readability** (Pylint scores on HumanEval+ Python). It is not about disability access.
- **Design2Code, WebGen-Bench, Interaction2Code, FrontendBench and the other UI benchmarks don't measure accessibility.** The leads suggesting they might were wrong.
- **Aljedaani et al. 2025 calls its model "GPT-4o", but its table says gpt-4o-mini.**
- **Xavier et al. say "120 initial screens" in one place;** the arithmetic and the abstract say 60.
- **DesignRepair compares v0 violations per project with GitHub violations per file,** though the text says per project for both.
- **The SLR's study count is inconsistent (38 vs 33),** and one of its per-model summaries (of Guriță and Vatavu) isn't in the source.
- **WebAIM's "vibe coding" line is a stated likelihood, not a finding.**
- **AudioEye's 15-site study publishes no method.**

**Agents: guidance, audits and gaming (5.32–5.52)**

- **The GitHub blog post "How to use GitHub Copilot to make your code more accessible" wasn't found.** The real ones are Summers and Dugas's "Prompting GitHub Copilot Chat to become your personal AI assistant for accessibility" (9 Oct 2023, updated 7 Feb 2024) and the 2026 accessibility.github.com guide by Kendall Gassner. The awesome-copilot file is `instructions/a11y.instructions.md`, as guessed. It is a community file in GitHub's org, not official Docs.
- **Vercel's guidelines aren't all "native first."** `command.md` says "Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)," which the `div` workaround satisfies. The README offers `maximum-scale=1` one line above "Never disable browser zoom."
- **Anthropic's prompting docs don't mention accessibility at all.** The `frontend-design` skill only got its "visible keyboard focus, reduced motion respected, visually accessible" line on 9 Jun 2026. Before that, accessibility was only a constraint the user might pass in.
- **The Claude Code docs' accessibility pages are about the CLI's own accessibility** (screen reader mode), not generated code.
- **v0 has no official accessibility page.** The only "Accessibility" section in its docs is an API guide example that puts `aria-label` on a role-less `div`.
- **Lovable's axe-based Speed tool, the one that scored Axess Lab's site 100%, no longer exists.** The May 2026 changelog folded it into an SEO review, and the current FAQ says that review "no longer runs Lighthouse audits."
- **Lovable frames accessibility as SEO.** Both its docs (alt text and semantic HTML in the SEO review) and the leaked prompt ("descriptive alt attributes with relevant keywords") do this.
- **Deque's MCP server is not free or open.** The public repo is a proprietary-licence wrapper that "Requires a paid Axe DevTools for Web subscription." Deque says it was "First introduced at Axe-con 2025," and the Sept 2025 "vibe fixing" post already demoed it. General availability to all Axe DevTools for Web customers came on 11 Feb 2026.
- **The AIMAC "35 of 37 models" figure comes from Deque's press release,** not from a leaderboard I opened.
- **AIDev's current AIDev-pop `pull_request` table has 71,677 PRs (v4, cutoff Nov 2025),** not the 33,596 cited from earlier versions in `import-cycles.md` and `dead-code.md`.
- **Most "agent added an a11y suppression" hits in AIDev are not the agent's.** They are human commits, merges and coverage reports.
- **KoliBri #7898 is labelled OpenAI_Codex in AIDev, but the PR author and the commit that adds the disable are the human maintainer.**
- **The jsx-a11y messages for `no-static-element-interactions` and `click-events-have-key-events` are the sentences that became ketcher's issue titles (#8079, #7585),** so the lint text itself became the agent's task description.
- **The worst agent case found is not in AIDev's eslint-disable results.** liam #2085 uses Biome suppressions and a config change, which the AIDev `eslint-disable` query can't see. I found it through the `role="button"`/`tabIndex={0}` query.
- **Devin, not just Copilot.** Copilot dominates the role-plus-tabIndex hits by PR count, but the clearest gaming case is Devin's.
- **Biome doesn't honour `eslint-disable` comments.** An agent's ESLint-style suppression in a Biome project silences nothing.

**Limits of lint and `no-autofocus` (section 6)**

- **The `label-has-associated-control` "limitations section" in the brief doesn't exist** in current docs.
- **Biome's `noAutofocus` exempts `<dialog>` and `popover`, but not `role="dialog"`.** Oxlint exempts all three. Svelte and angular-eslint exempt only `<dialog>`.
- **jsx-a11y's `no-autofocus` doc and its released code disagree on `autoFocus="false"`.** The fix is unreleased since Dec 2024. Oxlint's doc and code disagree the other way.
- **The source jsx-a11y cites for `no-autofocus` (Lawson 2009) argues for context, not a ban.** The rule's PR cites only a tweet.
- **WCAG 3.2.1 On Focus is about changes triggered by focus,** not about autofocus on load. Neither 3.2.1 nor 2.4.3 Understanding mentions page-load autofocus. Don't cite them as the basis for `no-autofocus`.
- **jest-axe's "~30% missed" is the combined result of 10 tools in the GDS test.** The best single tool found 37–41%.
- **Storybook says axe catches "up to 57%".** Deque says "on average 57%", by issue volume, from its own data.
- **jsx-a11y's `anchor-is-valid` Next.js section is stale** since Next.js 13 (Oct 2022).
- **Part of an earlier note on Ultracite's `no-autofocus` history was wrong.** `git log -S "noAutofocus"` finds 20 Oct 2025 at the earliest, but the jsx-a11y rule has been off since the first ESLint config on 18 Mar 2022 (`git log -S "no-autofocus"`).
- **jsx-a11y's own `recommended` and `strict` configs let the `div role="button"` workaround through** (6.12). Biome's recommended set and Oxlint's default category don't.

## Unverified or dropped

**Standards, ARIA and the law (section 1)**

- **UsableNet 2025 full-year total.** Secondary sources give "more than 5,000", 4,928 or 5,114 (3,195 federal + 1,919 state), and "1,427" repeat-defendant suits. The year-end report is gated, and its landing URL wasn't found. Not cited.
- **UsableNet 2026 report contents** (firms, widget share, industries): gated; only the landing-page claims are used. Third-party pages (Equidox, Voxbooster, TestParty) repeating UsableNet tracker numbers were not used.
- **EcomBack / Ellen Siegel reports:** not opened.
- **Lainey Feingold's legal updates (lflegal.com):** the site's "Legal Updates" category exists (checked 2026-10-15) but is a curated commentary list, not a count. No specific update was read or cited.
- **ISO catalogue records** for ISO/IEC 40500:2012 and 2025 (iso.org returned 403). Whether the 2025 edition formally withdrew the 2012 edition is unverified. The September 2025 ISO publication date comes from search snippets only.
- **_NFB v. Target_ class certification** (reported as 582 F. Supp. 2d 1185, 2007) and the attorneys' fees (reported as about $3.7 million): secondary only. The 2006 opinion text beyond its caption and the sentence quoted in _Robles_ was not read.
- **_Robles_ on remand** (2021 summary judgment for Robles): secondary only.
- **The Gil reporter citations** (993 F.3d 1266; 21 F.4th 775): not confirmed. The court PDFs were read, so cite those by docket number and date.
- **The HHS Section 504 IFR (91 FR 25496):** only the Federal Register API abstract was read.
- **Any EU implementing decision citing EN 301 549 V4.1.1 under the EAA:** none found in one search. EUR-Lex was not reachable by `curl` to check directly.
- **WCAG 3 requirement counts** (109 core, 78 supplemental labels) are my rough grep of the rendered draft, not deduplicated. Don't publish them as counts.
- **The Accessible Canada Act's ICT standards,** CAN/ASC-EN 301 549 and any WCAG reference: not checked.
- **Section 508's legacy "safe harbor"** (E202.2) and the Access Board's own ICT refresh pages: not read. The Federal Register text was used instead.

**Tooling origins and limits of lint (sections 1 and 6)**

- **Steve Faulkner's Jan 2017 tweet** that motivated jsx-a11y's `no-autofocus` (status 815884132874092544): not opened (x.com isn't fetchable). The content is unknown.
- **The Open UI popover explainer's text on autofocus** and the **WHATWG popover focusing steps**: seen only as quoted in jsx-a11y #1093, not opened.
- **The full Deque coverage report** (deque.com/coverage-report): not downloaded. Only the blog summary was read here; the report PDF is read in 2.3.
- **AccessLint's later history and its GitHub App:** only repo metadata and READMEs were read.
- **When Lighthouse first shipped a scored "Accessibility" category** (probably the 2.0 categories, 2017): not checked against release notes.
- **React 18's release date:** the npm registry gives `react` 18.0.0 as published 29 Mar 2022 (checked on merge).
- **The motivation for the jsx-a11y-x fork:** no primary statement found. Dropped.
- **aXe's percentage in the GDS test:** only a reader comment ("sharing the same 5th spot as aXe", about 29%). Not primary. Dropped.
- **The Rome 10.0.0 configuration schema** (to confirm the `a11y` group's first public appearance): raw fetch at the tag failed. The group's creation rests on PR #3471's file list and the changelog.
- **Employers of jsx-a11y contributors** (Airbnb, GitHub and so on): not asserted. Not checked against primary sources.
- **TypeScript-based a11y checking:** no tool found that uses type information for a11y rules. Not pursued further.

**Automated checking and the state of the web (sections 2 and 3)**

- **Vigo et al. 2013 full text:** not obtained. ACM is closed, ECU and EHU have metadata only, and no Manchester copy was found. Per-tool numbers, site count and ground-truth method are unverified.
- **İsmailova and İnal 2022 full text:** not obtained (IEEE returned 418; NVA download 403). Abstract only.
- **Alsaeedi 2020** (_Information_ 11(1):40, https://doi.org/10.3390/info11010040): metadata and abstract only. It compares just WAVE and SiteImprove on six Saudi university home pages. Not used.
- **Chadli, Gretete and Moumen 2023** (https://doi.org/10.1145/3607720.3607722): abstract only.
- **He, Huq and Malek, "Enhancing Web Accessibility: Automated Detection of Issues with Generative AI"** (FSE 2025, https://doi.org/10.1145/3729371): abstract only. It reports 94.5% precision and 87.61% recall for its LLM tool. Out of scope for coverage; section 5 covers LLM-based detection and repair.
- **Abduganiev:** not checked.
- **Robert Dodd, "Automated accessibility test tools find even less than expected"** (LinkedIn, 2025): 164 violations on six pages, five tools, "36% coverage from one tool." Seen only through Roselli. UNVERIFIED.
- **Chris Yoong, Anselm Hannemann, Steve Faulkner ("A TOOLS ERRAND") and Beau Vass (ID24 2025):** seen only through Roselli's updates. Not opened.
- **Abu Doush et al.** (three experts rating WCAG 2.1 criteria; "44%" automatable) and **DIGG's "at most 40%":** seen only as cited by Fischer et al.
- **The DfE "deliver-good-services" page** with an editor's note questioning the 30–40% figure: it now 404s, has no Wayback capture, and was seen only in a search summary. Dropped.
- **Deque's other coverage pages** (`/automated-accessibility-testing-coverage/`): not opened. I used the report PDF and press release.
- **The LinkedIn Engineering 2020 post** Deque cites for "20-30%": not opened.
- **Biome, Oxlint and Svelte/Vue/Angular template rule docs:** the rule names in table 2.20 are from eslint-plugin-jsx-a11y's `docs/rules` listing only. Behaviour is tested in 6.12.

**Developers (section 4)**

- **Full texts not opened:** Patel et al. (ACM 403); Leite et al.; Miranda and Araujo; Yan and Ramachandran; Mateus et al.; Makati et al. All were tagged on metadata and abstract only.
- **Lazar, Dudley-Sponaugle, Greenidge, "Improving web accessibility: a study of webmaster perceptions,"** _Computers in Human Behavior_ 20(2):269–288, 2004 (https://doi.org/10.1016/j.chb.2003.10.018). Metadata only: the publisher elides the abstract in OpenAlex and Semantic Scholar, and ScienceDirect returned 403. I couldn't verify its sample size or its list of reasons. Don't cite numbers from it.
- **Makati et al. numbers** (47 respondents, 12 interviews, 42% stopped using sites, 3 of 34) came from a search summary only.
- **No study found** on any of these:
  - eslint-plugin-jsx-a11y adoption, rule configuration, suppression rates or effectiveness in real projects;
  - Biome's `a11y` group, Oxlint's `jsx-a11y` port, or the Vue, Svelte or Angular template rules;
  - accessibility checks in GitHub Actions or other CI;
  - "linters and accessibility pull requests";
  - the accessibility of React, Vue or Angular component libraries in a peer-reviewed venue. Only a Brazilian undergraduate thesis on Material UI, a Deque blog post and the community "Cactus" comparison turned up. None was opened.
- **No peer-reviewed ARIA-misuse study** turned up at W4A, ASSETS or TACCESS (2015–2026) in OpenAlex title search or web search. The "Watanabe et al." lead couldn't be matched to an ARIA-in-the-wild study. Use Martins and Duarte (4.25) instead.
- **Not opened here (the LLM papers are covered in section 5):** CodeA11y (arXiv 2502.10884), A11YN (arXiv 2510.13914), A11YRepair (arXiv 2606.21926), A11yLTLNav (arXiv 2609.17959). These are agent and LLM papers. Also the mobile Stack Overflow study (arXiv 2409.07945), Daniela Kubesch's overlay master's thesis (2025), and Craig Abbott's 2021 axe vs. Pa11y comparison (seen in a search summary: 39 and 29 of 142 issues).
- **Dropped:** vendor blogs on overlays (TestParty, Azuro Digital) and Level Access and Deque ARIA-mistake posts (vendor guidance, not data).
- **Bi et al. ICSME 2021's "85%"** is kept but flagged. It is the authors' attribution of causes, not a measured rate.

**AI-written code: studies and repair (5.1–5.31)**

- **Full texts not read (ACM 403, no repository copy):**
  - Aljedaani et al. W4A 2024 (5.1).
  - Othman et al. PETRA 2023 (5.11).
  - Mowar et al. ASSETS 2024 "Tab to Autocomplete" (abstract only).
  - Abu Doush and Kassem DSAI 2024 and UAIS 2025 (abstracts only; numbers from the SLR).
  - Panchanadikar et al. ASSETS 2025 (metadata only; numbers conflict between the SLR and a search summary).
  - Leedy et al. Mindtrek 2025 (abstract; numbers from the SLR).
  - Aljedaani et al. SIGCSE 2025 (abstract).
  - Vera-Amaro and Rojano-Cáceres, "Accessible Web Content Generation Using LLMs: An Empirical Study on Prompting Strategies and Template-Guided Remediation", _IEEE Latin America Transactions_ 2025, https://doi.org/10.1109/tla.2025.11231224. Abstract only: GPT-4o and Gemini 2.0 Flash on 20 variants of two websites; Lighthouse average 93.25; WAVE errors cut 92.85%; tested with blind users.
  - Rabelo et al. MOBILESoft 2025 (abstract; its data are in the UAIS 2026 preprint).
- **Rabelo et al. UAIS 2026:** I read the Research Square preprint, not the Springer version of record, which served a JavaScript challenge.
- **Not opened:**
  - Alotaibi, Chiou and Halfond's size-based mobile repair work (pre-LLM).
  - Oswal and Oswal, ProComm 2024, https://doi.org/10.1109/procomm61427.2024.00030. Its abstract is about whether the builder tools' own websites and editors are accessible to blind users (none met WCAG 2.1 AA), not about their output.
  - Singh and Sharma, "Evaluating Large Language Models for Accessible Web Code Generation: A Comparative Study Using the FeedA11y Framework", _IJFMR_ 2025. Low-bar venue; it appears derivative of 5.3.
- **Out of scope after reading:**
  - "From Awareness to Action" (2606.10311): a corporate focus group.
  - "The Accessibility Capability Boundary" (2605.19638): a theory paper.
  - "Screen Reader Programmers in the Vibe Coding Era" (2506.13270): blind developers' use of AI, not output accessibility.
  - "Characterizing Visual Accessibility Issues in AI Developer Tools" (2608.05116): the accessibility of the tools' own UIs.
  - "Automating the Application of HCI Principles" (2610.02369): a position paper proposing WCAG `skill.md` files, with no data.
  - Andruccioli et al. (BDCC 2025) and Andruccioli et al. (_Data_ 2025): LLMs as auditors, with high hallucination rates.
- **Practitioner posts dropped:**
  - DEV Community "agentkit" posts ("We Ran Axe-Core On AI-Generated UI Code…", "We Asked 5 AI Code Generators…"): they simulate "v0-style" output rather than running the products.
  - TestParty and a11y-paradise summaries: secondary.
  - Tool-ranking blogs about v0, Bolt and Lovable: no measurements.
- **No study found of:**
  - jsx-a11y, Biome a11y or Oxlint `jsx-a11y/*` violation rates in LLM- or agent-generated JSX.
  - Accessibility changes in agent-authored pull requests (for example in the AIDev dataset).
  - A controlled comparison of an agent given lint output vs axe output vs nothing on the same React tasks.
  - Peer-reviewed axe or Lighthouse audits of v0, bolt.new, Lovable, Replit Agent, Cursor or Claude Code output.

  These are the gaps the post's own experiment could fill.

**Agents: guidance, audits and gaming (5.32–5.52)**

- **Microsoft "Accessibility Insights" in agent loops:** nothing found that connects it to coding agents. Not covered.
- **TPGi, Level Access, Scott O'Hara, Léonie Watson, Sara Soueidan, Manuel Matuzović, the A11y Project:** no audit of AI-builder output by them was found.
  - O'Hara is a contributor to Microsoft's eval (5.41).
  - Level Access pages found were product pages ("AI-powered code fix suggestions").
- **Smashing Magazine:** only Newsletter #564's pointer to the Frontend Masters article (5.45) was found, and I didn't open the newsletter itself.
- **Eric Bailey's other 2026 posts** ("The case for an accessibility designer vibe coding," June 2026; "Evolved antennas, LLM-generated code, and a potential antifuture," May 2026): seen only in search snippets. Not opened.
- **Ashlee Boyer's original v0 thread (14 Sep 2023):** not opened; quoted via Roselli.
- **Steve Faulkner's posts on ChatGPT and Atlas accessibility** ("Atlas Ableism," "ShatGPT"): linked from Roselli, not opened.
- **The OpenAI Atlas FAQ live page:** 403. The text comes from the Wayback snapshot of 22 Oct 2025, so it may have changed since.
- **v0 and Lovable system prompts:** only the leaked copies in `x1xhlol/system-prompts-and-models-of-ai-tools`. Authenticity not verified.
- **Google Stitch accessibility report:** third-party reviews only (UX Planet, Zapier, Pneuma Solutions). Google's docs not opened.
- **Search-result claims dropped:**
  - A DEV post ("We Scanned 29 AI Product Landing Pages. All 29 Failed") scanned AI vendors' marketing sites, not generated apps. Not opened.
  - overlayqa.com's "~160 issues per app" (Jason Arbon) is general QA, not accessibility.
  - TestParty's "GPT-5 Mini … 31% WCAG pass rate" is secondary. Microsoft's own report (5.41) has GPT-5.4 Mini at 25% in its May 2026 run.
  - VibeDoctor, Pickuma, Pinklime and Arsturn v0 reviews: SEO content, no method.
  - Claude Code accessibility "skills" marketplaces: listings, not evaluations.
- **The VentureBeat piece "We asked five AI tools to build accessible websites. All 15 sites failed."** appears to restate AudioEye's study. Not opened.
- **AIDev queries that failed:** `biome-ignore lint/a11y` (index rebuilding), a direct `onKeyDown={() => {}}` search (index loading), and the second page of the `role="button"`/`tabIndex={0}` results (504). No numbers are reported for them. Worth re-running offline against the parquet file.
- **A study of agents gaming a11y lint specifically:** none found. The documented cases are the AIDev check (5.49) and the PRs in 5.50.
  - Of the patterns in the brief, I found evidence for these: role-plus-tabIndex on `div`s (common), a11y suppressions (rare), a config downgrade (liam #2085), deleting ARIA state to satisfy a rule (liam #2085), and moving markup out of JSX (owncast #4426).
  - I found **no** documented case of an agent adding a no-op `onKeyDown`, putting `aria-hidden` on focusable content, writing `alt=""` on an informative image, or spamming `aria-label` to pass lint. The closest is liam's role on a `div` with no click or key handler at all.
  - Searches of GitHub issues and PRs by agent authors, Hacker News (Algolia) and the web turned up nothing more.
  - Roselli's "keyword stuffing in aria-label" is about SEO, not agents. The redundant-ARIA examples (Gustafson, Axess Lab) are model output, not lint gaming.
