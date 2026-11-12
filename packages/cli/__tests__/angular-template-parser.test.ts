import { describe, expect, test } from "bun:test";

import * as angularTemplateParser from "@angular-eslint/template-parser";
import { Linter } from "eslint";
import type { Rule, SourceCode } from "eslint";

import inlineScripts, {
  dropBlockFilenames,
} from "../config/eslint/angular/inline-scripts.mjs";
import withRanges, {
  isWholePage,
} from "../config/eslint/angular/template-parser.mjs";

const parser = withRanges(angularTemplateParser);

// Most of Angular's template syntax: interpolation, control flow, deferred
// blocks, `@let`, pipes, template literals, structural directives, two-way
// bindings and arrow functions, with whitespace between nodes.
const template = `<!-- The list of users -->
<p>
  {{ greeting }}
</p>
@if (users().length > 0) {
  <ul>
    @for (user of users(); track user.id; let i = $index) {
      <li [class.active]="i === selected" (click)="select(i)">{{ user.name | titlecase }} {{ \`Hi \${user.name}\` }}</li>
    } @empty {
      <li>None</li>
    }
  </ul>
} @else {
  <p>Empty</p>
}
@switch (mode) { @case ('a') { <span>A</span> } @default { <span>?</span> } }
@defer (on viewport) { <app-heavy [data]="data" /> } @placeholder { <p>…</p> }
@let total = items.length + 1;
<ng-template #tpl let-item><b>{{ item?.name ?? 'none' }}</b></ng-template>
<div *ngIf="show; else tpl" [(ngModel)]="value" (keyup.enter)="save($event)"></div>
<button (click)="go(() => n + 1)">Go</button>
`;

// What the tests read from a template node, which ESLint types as a
// JavaScript one.
interface RangedNode {
  name?: unknown;
  parent?: { range?: [number, number] };
  range?: [number, number];
  type: string;
  value?: unknown;
}

interface Walk {
  nodes: RangedNode[];
  sourceCode: SourceCode;
}

// Every node ESLint walks in a template, as a rule sees it.
const walk = (code: string): Walk => {
  const nodes: RangedNode[] = [];
  let sourceCode: SourceCode | undefined;

  const collect: Rule.RuleModule = {
    create: (context) => {
      ({ sourceCode } = context);

      return {
        "*": (node: RangedNode) => {
          nodes.push(node);
        },
      };
    },
  };

  const messages = new Linter({ configType: "flat" }).verify(
    code,
    [
      {
        files: ["**/*.html"],
        languageOptions: { parser },
        plugins: { probe: { rules: { collect } } },
        rules: { "probe/collect": "error" },
      },
    ],
    "template.html"
  );

  expect(messages).toEqual([]);

  if (!sourceCode) {
    throw new Error("The rule never ran");
  }

  return { nodes, sourceCode };
};

describe("withRanges", () => {
  test("gives every node a range inside its parent's", () => {
    const { nodes } = walk(template);

    expect(nodes.length).toBeGreaterThan(100);

    for (const node of nodes) {
      const [start, end] = node.range ?? [Number.NaN, Number.NaN];

      expect(start).toBeLessThanOrEqual(end);

      if (node.parent?.range) {
        expect(start).toBeGreaterThanOrEqual(node.parent.range[0]);
        expect(end).toBeLessThanOrEqual(node.parent.range[1]);
      }
    }
  });

  test("gives text, whitespace included, the range of its text", () => {
    const { nodes, sourceCode } = walk(template);
    const texts = nodes.filter((node) => node.type === "Text");

    expect(texts.some((node) => node.value === "\n")).toBe(true);

    for (const node of texts) {
      expect(sourceCode.text.slice(...(node.range ?? []))).toBe(
        String(node.value)
      );
    }
  });

  test("finds a node at every offset", () => {
    const { sourceCode } = walk(template);

    for (let index = 0; index < template.length; index += 1) {
      const node = sourceCode.getNodeByRangeIndex(index);

      expect(node?.range?.[0]).toBeLessThanOrEqual(index);
      expect(node?.range?.[1]).toBeGreaterThan(index);
    }
  });

  test("spans the whole file with the program", () => {
    for (const code of [template, "", "<!-- Only a comment -->\n"]) {
      const { ast } = parser.parseForESLint(code, { filePath: "x.html" });

      expect(ast.range).toEqual([0, code.length]);
      expect(ast.loc.start).toEqual({ column: 0, line: 1 });
    }
  });

  test("reads a page's braces as text", () => {
    const page = `<!doctype html>
<html><body><pre>if (ready) { start(); }</pre><img src="/logo.png" /></body></html>
`;

    const { nodes } = walk(page);

    // The image after the code sample is still in the tree.
    expect(
      nodes.some(
        (node) =>
          node.type === "Element" && "name" in node && node.name === "img"
      )
    ).toBe(true);
  });

  test("keeps a template's braces a parse error", () => {
    expect(() =>
      parser.parseForESLint("<pre>if (ready) { start(); }</pre>", {
        filePath: "x.html",
      })
    ).toThrow("unescaped");
  });
});

describe("isWholePage", () => {
  test.each([
    "<!doctype html><html></html>",
    "\uFEFF<!DOCTYPE html>",
    '<?xml version="1.0"?>\n<!DOCTYPE html>',
    "<!-- a --->\n<!-- b -- c -->\n<html lang=en>",
    "<head><title>x</title></head>",
    "<body>\n</body>",
  ])("finds a page in %j", (text) => {
    expect(isWholePage(text)).toBe(true);
  });

  test.each([
    "<div></div>",
    "<!-- c -->\n<div><html></html></div>",
    "<htmlx>",
    "<!-- a --> b --> <html>",
  ])("finds no page in %j", (text) => {
    expect(isWholePage(text)).toBe(false);
  });

  test("reads many leading comments in linear time", () => {
    expect(isWholePage(`${"<!-- x -->".repeat(10_000)}<div>`)).toBe(false);
  });
});

const message = (ruleId: string): Linter.LintMessage => ({
  column: 1,
  line: 1,
  message: ruleId,
  ruleId,
  severity: 2,
});

const ruleIds = (messages: Linter.LintMessage[]) =>
  messages.map((entry) => entry.ruleId);

describe("inlineScripts", () => {
  test("lints a fragment's scripts in a block of their own", () => {
    const text = "<div></div><script>var a = 1;</script>";

    expect(inlineScripts.preprocess(text, "a.html")).toEqual([
      text,
      { filename: "inline-scripts.htm", text },
    ]);
    expect(
      ruleIds(
        inlineScripts.postprocess(
          [[message("@angular-eslint/template/eqeqeq")], [message("no-var")]],
          "a.html"
        )
      )
    ).toEqual(["@angular-eslint/template/eqeqeq", "no-var"]);
  });

  test("drops only the template-only rules on a page", () => {
    inlineScripts.preprocess("<!doctype html><html></html>", "page.html");

    const messages = inlineScripts.postprocess(
      [
        [
          message("@angular-eslint/template/alt-text"),
          message("@angular-eslint/template/prefer-ngsrc"),
          message("@angular-eslint/template/no-inline-styles"),
          message("@angular-eslint/template/prefer-self-closing-tags"),
        ],
      ],
      "page.html"
    );

    expect(ruleIds(messages)).toEqual(["@angular-eslint/template/alt-text"]);
  });

  test("keeps the template-only rules on a fragment", () => {
    inlineScripts.preprocess("<img src='/a.png' />", "fragment.html");

    const messages = inlineScripts.postprocess(
      [[message("@angular-eslint/template/prefer-ngsrc")]],
      "fragment.html"
    );

    expect(ruleIds(messages)).toEqual([
      "@angular-eslint/template/prefer-ngsrc",
    ]);
  });

  test("checks the file's name, not its blocks'", () => {
    expect(
      dropBlockFilenames([
        [message("github/filenames-match-regex")],
        [message("github/filenames-match-regex"), message("no-var")],
      ]).map(ruleIds)
    ).toEqual([["github/filenames-match-regex"], ["no-var"]]);
  });
});
